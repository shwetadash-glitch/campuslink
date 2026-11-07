<?php

namespace App\Services\Interview;

use App\Models\AiInterview;
use App\Models\AiInterviewSession;
use App\Models\AiInterviewQuestion;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AiInterviewSessionService
{
    protected AiInterviewEvaluatorService $evaluatorService;

    public function __construct(AiInterviewEvaluatorService $evaluatorService)
    {
        $this->evaluatorService = $evaluatorService;
    }

    /**
     * Start a new interview session for a student or recover an active unexpired session.
     * Enforces concurrency safety, pessimistic locking, attempt limits, and authoritative deadlines.
     */
    public function startSession(AiInterview $interview, Student $student): AiInterviewSession
    {
        return DB::transaction(function () use ($interview, $student) {
            // Pessimistic lock on the student row to prevent concurrent race conditions
            Student::where('id', $student->id)->lockForUpdate()->first();

            if (!$interview->isPublished()) {
                throw ValidationException::withMessages([
                    'interview' => ['This AI interview has not been published.'],
                ]);
            }

            // Check for existing active session for network recovery
            $existingActive = AiInterviewSession::where('ai_interview_id', $interview->id)
                ->where('student_id', $student->id)
                ->where('status', 'IN_PROGRESS')
                ->lockForUpdate()
                ->first();

            if ($existingActive) {
                if (!$existingActive->isExpired()) {
                    // Resilient recovery: return existing active session without consuming extra attempts
                    return $existingActive;
                }

                // If existing session is expired, complete and evaluate it
                $existingActive->update([
                    'status' => 'EXPIRED',
                    'completed_at' => $existingActive->expires_at,
                ]);
                $this->evaluatorService->evaluateInterviewSession($existingActive);
            }

            // Check attempt limits
            $previousAttemptsCount = AiInterviewSession::where('ai_interview_id', $interview->id)
                ->where('student_id', $student->id)
                ->count();

            $maxAttempts = 1; // Strict single-attempt policy for placement rounds
            if ($previousAttemptsCount >= $maxAttempts) {
                throw ValidationException::withMessages([
                    'attempts' => ['Maximum interview attempts reached for this placement drive.'],
                ]);
            }

            // Fetch approved interview questions ordered by order_index
            $questions = AiInterviewQuestion::where('ai_interview_id', $interview->id)
                ->where('ai_review_status', 'APPROVED')
                ->orderBy('order_index')
                ->get();

            if ($questions->isEmpty()) {
                throw ValidationException::withMessages([
                    'questions' => ['Interview questions have not yet been approved by the placement committee.'],
                ]);
            }

            $attemptNumber = $previousAttemptsCount + 1;
            $startedAt = Carbon::now();
            $durationMinutes = $interview->duration_minutes ?: 30;
            $expiresAt = $startedAt->copy()->addMinutes($durationMinutes);

            $firstQuestion = $questions->first();

            $session = AiInterviewSession::create([
                'ai_interview_id' => $interview->id,
                'student_id' => $student->id,
                'attempt_number' => $attemptNumber,
                'status' => 'IN_PROGRESS',
                'current_stage' => $firstQuestion->stage,
                'current_question_index' => 0,
                'follow_ups_count_for_current' => 0,
                'started_at' => $startedAt,
                'expires_at' => $expiresAt,
                'total_score' => 0.0,
                'passed' => false,
                'is_provisional' => true,
                'ai_review_status' => 'PENDING_HUMAN_REVIEW',
            ]);

            // Append the first question to the transcript
            $session->recordMessage(
                sender: 'AI',
                messageType: 'QUESTION',
                content: $firstQuestion->question_text,
                questionId: $firstQuestion->id,
                isFollowUp: false
            );

            // Notify / sync placement drive candidate status
            $this->evaluatorService->syncDriveCandidateRoundResult($session);

            return $session;
        });
    }

    /**
     * Submit an answer to the current question or follow-up probe.
     * Enforces authoritative server deadline, logs candidate answer,
     * triggers contextual follow-up or advances question index, or concludes session.
     */
    public function submitCandidateAnswer(AiInterviewSession $session, string $answerText): array
    {
        $session = AiInterviewSession::find($session->id);
        if (!$session) {
            throw ValidationException::withMessages(['status' => ['Interview session not found.']]);
        }

        if ($session->status !== 'IN_PROGRESS') {
            throw ValidationException::withMessages([
                'status' => ["Session is {$session->status} and cannot accept further answers."],
            ]);
        }

        // Authoritative server-side deadline check: if expired, mark EXPIRED, evaluate, and reject answer
        if ($session->isExpired()) {
            $session->update([
                'status' => 'EXPIRED',
                'completed_at' => $session->expires_at,
            ]);
            $this->evaluatorService->evaluateInterviewSession($session);

            throw ValidationException::withMessages([
                'deadline' => ['The interview duration has expired. Answers can no longer be recorded.'],
            ]);
        }

        return DB::transaction(function () use ($session, $answerText) {
            // Lock session row
            $session = AiInterviewSession::where('id', $session->id)->lockForUpdate()->firstOrFail();

            // Fetch approved questions
            $questions = AiInterviewQuestion::where('ai_interview_id', $session->ai_interview_id)
                ->where('ai_review_status', 'APPROVED')
                ->orderBy('order_index')
                ->get();

            $currentIndex = (int) $session->current_question_index;
            $currentQuestion = $questions->get($currentIndex);

            if (!$currentQuestion) {
                // All questions were somehow already completed
                return $this->finalizeSession($session);
            }

            $isFollowUp = ($session->follow_ups_count_for_current > 0);

            // Record candidate answer in transcript
            $session->recordMessage(
                sender: 'CANDIDATE',
                messageType: 'ANSWER',
                content: trim($answerText),
                questionId: $currentQuestion->id,
                isFollowUp: $isFollowUp
            );

            $maxFollowUps = (int) ($session->aiInterview->max_follow_ups_per_question ?? 1);

            // Check if we should ask a contextual follow-up
            if ($session->follow_ups_count_for_current < $maxFollowUps) {
                $followUpProbe = $this->evaluatorService->generateDynamicFollowUp(
                    $session,
                    $currentQuestion,
                    $answerText
                );

                if (!empty($followUpProbe)) {
                    $session->increment('follow_ups_count_for_current');

                    $msg = $session->recordMessage(
                        sender: 'AI',
                        messageType: 'FOLLOW_UP',
                        content: $followUpProbe,
                        questionId: $currentQuestion->id,
                        isFollowUp: true
                    );

                    return [
                        'type' => 'FOLLOW_UP',
                        'message' => $msg,
                        'session' => $this->formatSessionForCandidate($session->fresh()),
                    ];
                }
            }

            // Proceed to next question
            $nextIndex = $currentIndex + 1;
            if ($nextIndex < $questions->count()) {
                $nextQuestion = $questions->get($nextIndex);
                $session->update([
                    'current_question_index' => $nextIndex,
                    'current_stage' => $nextQuestion->stage,
                    'follow_ups_count_for_current' => 0,
                ]);

                $msg = $session->recordMessage(
                    sender: 'AI',
                    messageType: 'QUESTION',
                    content: $nextQuestion->question_text,
                    questionId: $nextQuestion->id,
                    isFollowUp: false
                );

                return [
                    'type' => 'NEXT_QUESTION',
                    'question' => $nextQuestion->toCandidateArray(),
                    'message' => $msg,
                    'session' => $this->formatSessionForCandidate($session->fresh()),
                ];
            }

            // All questions answered: finalize session
            return $this->finalizeSession($session);
        });
    }

    /**
     * Mark session complete and trigger provisional evaluation.
     */
    protected function finalizeSession(AiInterviewSession $session): array
    {
        $session->update([
            'status' => 'COMPLETED',
            'completed_at' => Carbon::now(),
        ]);

        $evaluated = $this->evaluatorService->evaluateInterviewSession($session);

        return [
            'type' => 'COMPLETED',
            'session' => $this->formatSessionForCandidate($evaluated),
            'summary' => [
                'total_score' => $evaluated->total_score,
                'passed' => $evaluated->passed,
                'is_provisional' => $evaluated->is_provisional,
            ],
        ];
    }

    /**
     * Format session details safely for candidate presentation.
     * Sanitizes expected points, scoring weights, and confidential rubric criteria.
     */
    public function formatSessionForCandidate(AiInterviewSession $session): array
    {
        $session->loadMissing(['aiInterview', 'messages']);

        $messages = $session->messages->map(function ($m) {
            return [
                'id' => $m->id,
                'sender' => $m->sender,
                'message_type' => $m->message_type,
                'content' => $m->content,
                'is_follow_up' => (bool) $m->is_follow_up,
                'created_at' => $m->created_at ? $m->created_at->toIso8601String() : null,
            ];
        });

        return [
            'id' => $session->id,
            'interview_id' => $session->ai_interview_id,
            'interview_title' => $session->aiInterview->title ?? 'AI Placement Interview',
            'target_role' => $session->aiInterview->target_role ?? 'Software Engineer',
            'attempt_number' => $session->attempt_number,
            'status' => $session->status,
            'current_stage' => $session->current_stage,
            'current_question_index' => $session->current_question_index,
            'seconds_remaining' => $session->secondsRemaining(),
            'is_expired' => $session->isExpired(),
            'started_at' => $session->started_at ? $session->started_at->toIso8601String() : null,
            'expires_at' => $session->expires_at ? $session->expires_at->toIso8601String() : null,
            'completed_at' => $session->completed_at ? $session->completed_at->toIso8601String() : null,
            'messages' => $messages,
            // Only expose score and evaluation summary if completed or evaluated
            'evaluation' => in_array($session->status, ['COMPLETED', 'EVALUATED']) ? [
                'total_score' => $session->total_score,
                'passed' => $session->passed,
                'is_provisional' => $session->is_provisional,
                'dimension_scores' => $session->dimension_scores,
                'strengths' => $session->ai_evaluation_summary['strengths'] ?? [],
                'weaknesses' => $session->ai_evaluation_summary['weaknesses'] ?? [],
                'quote_evidence' => $session->ai_evaluation_summary['quote_evidence'] ?? [],
                'recommendation' => $session->ai_evaluation_summary['recommendation'] ?? null,
            ] : null,
        ];
    }
}
