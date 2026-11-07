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
        if ($session->status === 'EVALUATED' && $session->total_score !== null) {
            return $session;
        }

        $assessment = $session->assessment;
        $session->loadMissing(['answers.question', 'assessment.questions']);

        $categoryScores = [];
        $totalEarned = 0.0;
        $totalPossible = 0.0;
        $answersMap = $session->answers->keyBy('question_id');

        foreach ($assessment->questions as $question) {
            $pivotMarks = (float) $question->pivot->marks;
            $pivotNegative = (float) $question->pivot->negative_marks;
            $totalPossible += $pivotMarks;

            $answer = $answersMap->get($question->id);
            $earned = 0.0;
            $isCorrect = false;

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
        }

        // Clamp total earned to [0, total_marks]
        $finalScore = max(0.0, (float) round($totalEarned, 2));
        $earnedPercentage = $totalPossible > 0 ? (float) round(($finalScore / $totalPossible) * 100, 2) : 0.0;
        $passed = ($earnedPercentage >= $assessment->pass_percentage);

        $summary = [
            'total_score' => $finalScore,
            'total_possible' => $totalPossible,
            'earned_percentage' => $earnedPercentage,
            'pass_percentage_required' => $assessment->pass_percentage,
            'passed' => $passed,
            'categories' => $categoryScores,
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
}
