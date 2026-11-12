<?php

namespace App\Services\Assessment;

use App\Models\AssessmentSession;
use App\Models\AssessmentAnswer;
use App\Models\AssessmentScoreHistory;
use App\Models\DriveCandidate;
use App\Models\User;
use App\Services\Sandbox\SandboxManager;
use App\Services\AI\AiManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AssessmentScoringService
{
    protected SandboxManager $sandboxManager;
    protected AiManager $aiManager;

    public function __construct(SandboxManager $sandboxManager, AiManager $aiManager)
    {
        $this->sandboxManager = $sandboxManager;
        $this->aiManager = $aiManager;
    }

    /**
     * Score a submitted assessment session across all objective, coding, and subjective questions.
     */
    public function evaluateSession(AssessmentSession $session): AssessmentSession
    {
        // Idempotency: avoid recalculating scores if already evaluated
        if ($session->status === 'EVALUATED' && $session->total_score !== null && !empty($session->evaluation_summary['improvement_roadmap'])) {
            return $session;
        }

        $assessment = $session->assessment;
        $session->loadMissing(['answers.question', 'assessment.questions']);

        $categoryScores = [];
        $totalEarned = 0.0;
        $totalPossible = 0.0;
        $answersMap = $session->answers->keyBy('question_id');
        $missedConceptsByCategory = [];
        $codeDiagnostics = [];

        foreach ($assessment->questions as $question) {
            $pivotMarks = (float) $question->pivot->marks;
            $pivotNegative = (float) $question->pivot->negative_marks;
            $totalPossible += $pivotMarks;

            $answer = $answersMap->get($question->id);
            $earned = 0.0;
            $isCorrect = false;
            $evalResult = null;

            if ($answer && !empty(trim($answer->answer_text ?? ''))) {
                $rawAnswer = trim($answer->answer_text);

                if ($question->type === 'MCQ' || $question->type === 'APTITUDE') {
                    // Objective Scoring
                    $isCorrect = (strcasecmp($rawAnswer, trim($question->correct_answer ?? '')) === 0);
                    if ($isCorrect) {
                        $earned = $pivotMarks;
                    } else {
                        // Apply negative marking if configured
                        $earned = -1 * abs($pivotNegative);
                    }
                    $answer->update([
                        'score_awarded' => $earned,
                        'is_correct' => $isCorrect,
                        'evaluated_at' => Carbon::now(),
                    ]);
                } elseif ($question->type === 'PROGRAMMING') {
                    // Programming Sandbox Test Case Evaluation
                    $testCases = $question->test_cases ?: [];
                    $lang = $answer->code_language ?: ($question->programming_language ?: 'php');

                    $evalResult = $this->sandboxManager->evaluateSubmission($lang, $rawAnswer, $testCases);

                    $passed = (int) ($evalResult['passed_test_cases'] ?? 0);
                    $total = (int) ($evalResult['total_test_cases'] ?? 0);
                    $ratio = $total > 0 ? ($passed / $total) : 0.0;

                    $earned = (float) round($pivotMarks * $ratio, 2);
                    $isCorrect = ($passed === $total && $total > 0);

                    $answer->update([
                        'score_awarded' => $earned,
                        'is_correct' => $isCorrect,
                        'execution_result' => $evalResult,
                        'evaluated_at' => Carbon::now(),
                    ]);
                } elseif ($question->type === 'DESCRIPTIVE') {
                    // Subjective / Descriptive provisional draft evaluation
                    if ($answer->score_awarded === null) {
                        $provisional = $this->generateProvisionalSubjectiveScore($question, $rawAnswer, $pivotMarks);
                        $earned = $provisional['score'];
                        $isCorrect = ($earned >= ($pivotMarks * 0.6));

                        $answer->update([
                            'score_awarded' => $earned,
                            'is_correct' => $isCorrect,
                            'evaluator_feedback' => "[PROVISIONAL_AI_DRAFT] " . $provisional['feedback'],
                            'evaluated_at' => Carbon::now(),
                        ]);
                    } else {
                        $earned = (float) $answer->score_awarded;
                        $isCorrect = (bool) $answer->is_correct;
                    }
                }
            } else {
                // Unattempted: 0 marks (no negative marking penalty)
                if ($answer) {
                    $answer->update([
                        'score_awarded' => 0.0,
                        'is_correct' => false,
                        'evaluated_at' => Carbon::now(),
                    ]);
                }
            }

            $totalEarned += $earned;

            // Track category breakdown
            $cat = $question->category ?: 'General';
            if (!isset($categoryScores[$cat])) {
                $categoryScores[$cat] = ['earned' => 0.0, 'possible' => 0.0];
            }
            $categoryScores[$cat]['earned'] += max(0.0, $earned);
            $categoryScores[$cat]['possible'] += $pivotMarks;

            // Record missed concept tags for remediation
            if (!$isCorrect || $earned < $pivotMarks) {
                $missedConceptsByCategory[$cat][] = $this->extractConceptTag($question);

                // For programming questions, categorize sandbox execution failure
                if ($question->type === 'PROGRAMMING' && $evalResult) {
                    $failureInfo = $this->classifyProgrammingFailure($evalResult);
                    $codeDiagnostics[] = [
                        'question_title' => $question->title ?: 'Programming Sandbox Problem',
                        'failure_reason' => $failureInfo['reason'],
                        'guidance' => $failureInfo['guidance'],
                    ];
                }
            }
        }

        // Clamp total earned to [0, total_marks]
        $finalScore = max(0.0, (float) round($totalEarned, 2));
        $earnedPercentage = $totalPossible > 0 ? (float) round(($finalScore / $totalPossible) * 100, 2) : 0.0;
        $passed = ($earnedPercentage >= $assessment->pass_percentage);

        // Build improvement roadmap for remediation
        $criticalFocusAreas = [];
        foreach ($categoryScores as $catName => $scores) {
            $catEarned = (float) $scores['earned'];
            $catPossible = (float) $scores['possible'];
            $catPct = $catPossible > 0 ? (float) round(($catEarned / $catPossible) * 100, 1) : 0.0;

            // Categories where ($earned / $possible) < 0.60
            if ($catPossible > 0 && ($catEarned / $catPossible) < 0.60) {
                $rawConcepts = $missedConceptsByCategory[$catName] ?? [];
                if (empty($rawConcepts)) {
                    $rawConcepts = $this->getDefaultConceptsForCategory($catName);
                }
                $uniqueConcepts = array_values(array_unique(array_filter($rawConcepts)));

                $criticalFocusAreas[] = [
                    'category' => $catName,
                    'earned_percentage' => $catPct,
                    'missed_concepts' => array_slice($uniqueConcepts, 0, 4),
                    'recommended_action' => $this->getRecommendedActionForCategory($catName, $uniqueConcepts),
                ];
            }
        }

        $canReattempt = ((int) ($session->attempt_number ?: 1)) < ((int) ($assessment->max_attempts ?: 1));
        $cooldownHours = 24;

        $improvementRoadmap = [
            'critical_focus_areas' => $criticalFocusAreas,
            'code_diagnostics' => $codeDiagnostics,
            'can_reattempt' => $canReattempt,
            'reattempt_cooldown_hours' => $cooldownHours,
        ];

        $summary = [
            'total_score' => $finalScore,
            'total_possible' => $totalPossible,
            'earned_percentage' => $earnedPercentage,
            'pass_percentage_required' => $assessment->pass_percentage,
            'passed' => $passed,
            'categories' => $categoryScores,
            'improvement_roadmap' => $improvementRoadmap,
            'evaluated_at' => Carbon::now()->toIso8601String(),
        ];

        $session->update([
            'status' => ($session->status === 'EXPIRED') ? 'EXPIRED' : 'EVALUATED',
            'total_score' => $finalScore,
            'passed' => $passed,
            'evaluation_summary' => $summary,
        ]);

        // Integrate with Placement Drive lifecycle if assessment is tied to a drive
        if ($assessment->drive_id) {
            $this->syncDriveCandidateStatus($session, $passed, $earnedPercentage);
        }

        return $session->fresh(['answers']);
    }

    /**
     * Human Placement Officer grading override for subjective answers.
     * Records non-repudiation audit trail in assessment_score_histories.
     */
    public function overrideAnswerScore(
        AssessmentAnswer $answer,
        User $officerUser,
        float $newScore,
        string $reason,
        ?string $feedback = null
    ): AssessmentSession {
        $session = $answer->session;
        $oldAnswerScore = (float) ($answer->score_awarded ?? 0.0);
        $oldTotalScore = (float) ($session->total_score ?? 0.0);

        // Update answer
        $answer->update([
            'score_awarded' => $newScore,
            'is_correct' => ($newScore > 0),
            'evaluator_feedback' => $feedback ?: $answer->evaluator_feedback,
            'evaluated_by_user_id' => $officerUser->id,
            'evaluated_at' => Carbon::now(),
        ]);

        // Recompute session total
        $diff = $newScore - $oldAnswerScore;
        $newTotalScore = max(0.0, (float) round($oldTotalScore + $diff, 2));
        $assessment = $session->assessment;
        $totalPossible = (float) ($assessment->total_marks ?: 100.0);
        $pct = $totalPossible > 0 ? (float) round(($newTotalScore / $totalPossible) * 100, 2) : 0.0;
        $passed = ($pct >= $assessment->pass_percentage);

        $session->update([
            'total_score' => $newTotalScore,
            'passed' => $passed,
        ]);

        // Record audit history
        AssessmentScoreHistory::create([
            'session_id' => $session->id,
            'changed_by_user_id' => $officerUser->id,
            'old_score' => $oldTotalScore,
            'new_score' => $newTotalScore,
            'reason' => "Score override by {$officerUser->email}: {$reason}",
        ]);

        return $session->fresh(['answers', 'scoreHistories']);
    }

    /**
     * Provisional subjective AI rubric scoring draft.
     */
    protected function generateProvisionalSubjectiveScore(object $question, string $candidateText, float $maxMarks): array
    {
        $words = str_word_count($candidateText);
        if ($words < 10) {
            return [
                'score' => 0.0,
                'feedback' => 'Response is too sparse to evaluate core technical concepts.',
            ];
        }

        // Check if key concepts from question explanation/rubric are present
        $modelAnswer = strtolower($question->correct_answer ?? '');
        $keywords = array_filter(explode(' ', preg_replace('/[^a-zA-Z0-9\s]/', '', $modelAnswer)), fn($w) => strlen($w) > 4);

        $matched = 0;
        $candLower = strtolower($candidateText);
        foreach ($keywords as $kw) {
            if (str_contains($candLower, $kw)) $matched++;
        }

        $ratio = count($keywords) > 0 ? min(1.0, ($matched / count($keywords)) + 0.3) : 0.75;
        $score = (float) round($maxMarks * $ratio, 1);

        return [
            'score' => $score,
            'feedback' => "Provisional rubric analysis matched key concepts ({$matched} keywords). Human verification recommended.",
        ];
    }

    /**
     * Synchronize candidate status in placement drive based on verified assessment results.
     * Round-specific outcomes are saved in round_results; terminal/advanced application statuses are protected.
     */
    protected function syncDriveCandidateStatus(AssessmentSession $session, bool $passed, float $percentage): void
    {
        $assessment = $session->assessment;
        $candidate = DriveCandidate::where('drive_id', $assessment->drive_id)
            ->where('student_id', $session->student_id)
            ->first();

        if ($candidate) {
            // 1. Always record round-specific outcome in candidate's round_results JSON array
            $roundResults = is_array($candidate->round_results) ? $candidate->round_results : [];
            $roundResults[] = [
                'assessment_id' => $assessment->id,
                'assessment_title' => $assessment->title,
                'session_id' => $session->id,
                'attempt_number' => $session->attempt_number,
                'score' => $session->total_score,
                'percentage' => $percentage,
                'passed' => $passed,
                'evaluated_at' => Carbon::now()->toIso8601String(),
            ];
            $candidate->update([
                'round_results' => $roundResults,
            ]);

            $currentStatus = is_object($candidate->status) ? $candidate->status->value : (string) $candidate->status;

            // 2. Terminal and advanced offer states MUST NOT be overwritten by subsequent assessments
            $protectedStates = [
                'OFFERED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'JOINED', 'WITHDRAWN', 'REJECTED', 'INTERVIEWING'
            ];
            if (in_array($currentStatus, $protectedStates, true)) {
                return;
            }

            // 3. Status transition based on assessment outcome
            if ($passed) {
                // If candidate was in REGISTERED or ELIGIBLE, advance to SHORTLISTED
                if (in_array($currentStatus, ['REGISTERED', 'ELIGIBLE'])) {
                    $candidate->transitionTo(
                        'SHORTLISTED',
                        null,
                        "Passed assessment [{$assessment->title}] with score {$session->total_score} ({$percentage}%)."
                    );
                }
            } else {
                // If candidate did not meet pass cutoff, update status to REJECTED with clear audit rationale
                if (in_array($currentStatus, ['REGISTERED', 'ELIGIBLE'])) {
                    $candidate->transitionTo(
                        'REJECTED',
                        null,
                        "Did not clear minimum cutoff on assessment [{$assessment->title}]. Score: {$percentage}% (Required: {$assessment->pass_percentage}%)."
                    );
                }
            }
        }
    }

    /**
     * Categorize sandbox execution failure modes without leaking proprietary test cases.
     */
    protected function classifyProgrammingFailure(array $evalResult): array
    {
        $testCases = $evalResult['test_case_results'] ?? [];
        $passed = (int) ($evalResult['passed_test_cases'] ?? 0);
        $total = (int) ($evalResult['total_test_cases'] ?? 0);
        $status = strtoupper((string) ($evalResult['status'] ?? ''));

        $hasCompileError = false;
        $hasTimeout = false;

        foreach ($testCases as $tc) {
            $tcStatus = strtoupper((string) ($tc['status'] ?? ''));
            $stderr = strtolower((string) ($tc['stderr'] ?? ''));
            if ($tcStatus === 'COMPILE_ERROR' || str_contains($stderr, 'syntaxerror') || str_contains($stderr, 'parse error') || str_contains($stderr, 'compilation error')) {
                $hasCompileError = true;
                break;
            }
            if ($tcStatus === 'TIMEOUT' || str_contains($stderr, 'timed out') || str_contains($stderr, 'time limit')) {
                $hasTimeout = true;
            }
        }

        if ($hasCompileError || $status === 'COMPILE_ERROR') {
            return [
                'reason' => 'SYNTAX_ERROR',
                'guidance' => 'Code failed compilation or syntax validation. Check language-specific syntax conventions, missing tokens, and type signatures.',
            ];
        }

        if ($hasTimeout || $status === 'TIMEOUT') {
            return [
                'reason' => 'TIMEOUT_TLE',
                'guidance' => 'Your solution exceeded the allowable time limit on large input constraints. Optimize time complexity (e.g. from O(N^2) to O(N log N) or O(N)) using hash maps, two-pointers, or sliding window.',
            ];
        }

        if ($passed > 0 && $passed < $total) {
            return [
                'reason' => 'EDGE_CASE_FAILURE',
                'guidance' => "Passed {$passed}/{$total} test cases but failed hidden edge cases. Validate boundary invariants including empty collections, negative numbers, numeric overflow, or duplicate values.",
            ];
        }

        return [
            'reason' => 'LOGICAL_MISMATCH',
            'guidance' => 'Produced unexpected outputs for valid inputs. Trace algorithm state transitions, off-by-one loop indices, and edge conditions.',
        ];
    }

    /**
     * Extract a concise concept/skill tag from a question.
     */
    protected function extractConceptTag(object $question): string
    {
        if (!empty($question->title) && is_string($question->title)) {
            $clean = trim(preg_replace('/^(Q\d+[:.]?|\d+[:.]?)\s*/i', '', $question->title));
            if (mb_strlen($clean) > 3 && mb_strlen($clean) <= 40) {
                return $clean;
            }
        }

        $category = $question->category ?? 'General';
        $defaults = $this->getDefaultConceptsForCategory($category);
        return $defaults[0] ?? $category;
    }

    /**
     * Return domain-specific default concept tags for weak categories.
     */
    protected function getDefaultConceptsForCategory(string $category): array
    {
        $catLower = strtolower($category);
        if (str_contains($catLower, 'data struct') || str_contains($catLower, 'dsa')) {
            return ['Tree Traversals', 'Hash Collisions', 'Binary Search Trees', 'Stack & Queue Invariants'];
        }
        if (str_contains($catLower, 'algo')) {
            return ['Two Pointers', 'Time Complexity Optimization', 'Dynamic Programming', 'Sliding Window'];
        }
        if (str_contains($catLower, 'aptitude') || str_contains($catLower, 'reasoning') || str_contains($catLower, 'quant')) {
            return ['Probability & Combinatorics', 'Quantitative Ratios', 'Logical Deductions', 'Work & Time Equations'];
        }
        if (str_contains($catLower, 'sql') || str_contains($catLower, 'database') || str_contains($catLower, 'dbms')) {
            return ['SQL Indexing', 'Join Optimization', 'ACID Transactions', 'Relational Normalization'];
        }
        if (str_contains($catLower, 'network')) {
            return ['TCP/UDP Handshakes', 'Subnetting & Routing', 'HTTP Protocols & Caching'];
        }
        if (str_contains($catLower, 'os') || str_contains($catLower, 'operating')) {
            return ['Process Synchronization', 'Deadlock Invariants', 'Virtual Memory Management'];
        }
        return ['Core Technical Foundations', 'Complexity Optimization', 'Edge Case Handling'];
    }

    /**
     * Generate prescriptive remedial recommendation text for a weak category.
     */
    protected function getRecommendedActionForCategory(string $category, array $concepts): string
    {
        $catLower = strtolower($category);
        if (str_contains($catLower, 'data struct') || str_contains($catLower, 'dsa')) {
            return 'Review binary search tree invariants, tree traversals, and implement hash map bucket collision handling.';
        }
        if (str_contains($catLower, 'algo')) {
            return 'Practice reducing nested loop solutions from O(N^2) to O(N log N) using sliding window and two-pointer patterns.';
        }
        if (str_contains($catLower, 'aptitude') || str_contains($catLower, 'reasoning') || str_contains($catLower, 'quant')) {
            return 'Practice quantitative aptitude shortcuts, probability distributions, and deductive logic puzzles.';
        }
        if (str_contains($catLower, 'sql') || str_contains($catLower, 'database') || str_contains($catLower, 'dbms')) {
            return 'Study query execution plans, B-Tree vs Hash index trade-offs, and transaction isolation levels.';
        }
        return "Deepen practical problem-solving in {$category} by focusing on core foundations and practicing benchmark questions.";
    }
}
