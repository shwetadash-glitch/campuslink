<?php

namespace App\Services\Assessment;

use App\Models\Assessment;
use App\Models\AssessmentSession;
use App\Models\AssessmentAnswer;
use App\Models\Question;
use App\Models\Student;
use App\Models\DriveCandidate;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssessmentSessionService
{
    protected AssessmentScoringService $scoringService;

    public function __construct(AssessmentScoringService $scoringService)
    {
        $this->scoringService = $scoringService;
    }

    /**
     * Start a new time-limited examination session for a candidate.
     * Enforces maximum attempt limits, publishes active deadline, and recovers in-progress sessions.
     */
    public function startSession(Assessment $assessment, Student $student): AssessmentSession
    {
        if (!$assessment->isPublished()) {
            throw new \InvalidArgumentException("This assessment has not been published for candidate participation.");
        }

        return DB::transaction(function () use ($assessment, $student) {
            // Pessimistic lock on Student to serialize concurrent attempt requests from the same candidate
            Student::where('id', $student->id)->lockForUpdate()->first();

            // Drive Candidate Eligibility Revalidation
            if ($assessment->drive_id) {
                $candidate = DriveCandidate::where('drive_id', $assessment->drive_id)
                    ->where('student_id', $student->id)
                    ->first();

                if (!$candidate) {
                    throw new \InvalidArgumentException("You are not registered for the placement drive associated with this assessment.");
                }

                $candStatus = is_object($candidate->status) ? $candidate->status->value : (string) $candidate->status;
                if (!in_array($candStatus, ['REGISTERED', 'ELIGIBLE', 'SHORTLISTED'])) {
                    throw new \InvalidArgumentException("You are not eligible to attempt this assessment (Current Status: {$candStatus}).");
                }
            }

            // 1. Network Interruption Recovery: If an active unexpired session already exists, resume it seamlessly
            $existingActiveSession = AssessmentSession::where('assessment_id', $assessment->id)
                ->where('student_id', $student->id)
                ->where('status', 'IN_PROGRESS')
                ->lockForUpdate()
                ->first();

            if ($existingActiveSession) {
                if (!$existingActiveSession->isExpired()) {
                    $existingActiveSession->recordEvent('CONNECTION_RESTORED', [
                        'recovered_at' => Carbon::now()->toIso8601String(),
                        'seconds_remaining' => $existingActiveSession->secondsRemaining(),
                    ]);
                    return $existingActiveSession;
                } else {
                    // If existing session passed its expiration deadline, auto-submit it
                    $this->submitSession($existingActiveSession, true);
                }
            }

            // 2. Validate Attempt Limits
            $pastAttemptsCount = AssessmentSession::where('assessment_id', $assessment->id)
                ->where('student_id', $student->id)
                ->whereIn('status', ['SUBMITTED', 'EVALUATED', 'EXPIRED'])
                ->count();

            if ($pastAttemptsCount >= $assessment->max_attempts) {
                throw new \InvalidArgumentException("Maximum attempts limit ({$assessment->max_attempts}) reached for this assessment.");
            }

            $now = Carbon::now();
            $durationSeconds = ($assessment->duration_minutes * 60) + ($assessment->grace_period_seconds ?? 60);
            $expiresAt = $now->copy()->addSeconds($durationSeconds);

            // 3. Question Ordering (Randomize if configured on assessment)
            $questionIds = $assessment->questions()->pluck('questions.id')->all();
            if ($assessment->is_randomized) {
                shuffle($questionIds);
            }

            $session = AssessmentSession::create([
                'assessment_id' => $assessment->id,
                'student_id' => $student->id,
                'attempt_number' => $pastAttemptsCount + 1,
                'status' => 'IN_PROGRESS',
                'started_at' => $now,
                'expires_at' => $expiresAt, // Server-side authoritative deadline
                'question_order' => $questionIds,
                'proctoring_flags_count' => 0,
            ]);

            $session->recordEvent('SESSION_STARTED', [
                'attempt_number' => $session->attempt_number,
                'duration_minutes' => $assessment->duration_minutes,
                'expires_at' => $expiresAt->toIso8601String(),
                'total_questions' => count($questionIds),
            ]);

            return $session;
        });
    }

    /**
     * Autosave candidate answer draft during an active examination.
     * Rejects updates after server-side deadline has expired.
     */
    public function autoSaveAnswer(
        AssessmentSession $session,
        int $questionId,
        ?string $answerText,
        ?string $codeLanguage = null
    ): AssessmentAnswer {
        if ($session->status !== 'IN_PROGRESS') {
            throw new \InvalidArgumentException("Cannot modify answers for a session with status [{$session->status}].");
        }

        // Authoritative Server-Side Deadline Enforcement
        if ($session->isExpired()) {
            $this->submitSession($session, true);
            throw new \InvalidArgumentException("Examination deadline has expired. Late submissions are strictly rejected.");
        }

        $answer = AssessmentAnswer::updateOrCreate(
            [
                'session_id' => $session->id,
                'question_id' => $questionId,
            ],
            [
                'student_id' => $session->student_id,
                'answer_text' => $answerText,
                'code_language' => $codeLanguage,
                'is_auto_saved' => true,
                'saved_at' => Carbon::now(),
            ]
        );

        $session->recordEvent('ANSWER_AUTOSAVED', [
            'question_id' => $questionId,
            'char_length' => strlen($answerText ?? ''),
        ]);

        return $answer;
    }

    /**
     * Submit candidate session and trigger objective / coding grading.
     * Wrapped in database transaction with pessimistic locking to prevent duplicate evaluations.
     */
    public function submitSession(AssessmentSession $session, bool $isAutoExpired = false): AssessmentSession
    {
        return DB::transaction(function () use ($session, $isAutoExpired) {
            $lockedSession = AssessmentSession::where('id', $session->id)->lockForUpdate()->first();
            if (!$lockedSession) {
                return $session;
            }

            if ($lockedSession->status === 'SUBMITTED' || $lockedSession->status === 'EVALUATED') {
                return $lockedSession;
            }

            $lockedSession->update([
                'status' => $isAutoExpired ? 'EXPIRED' : 'SUBMITTED',
                'submitted_at' => Carbon::now(),
            ]);

            $lockedSession->recordEvent($isAutoExpired ? 'TIME_EXPIRED' : 'SESSION_SUBMITTED', [
                'submitted_at' => Carbon::now()->toIso8601String(),
                'auto_expired' => $isAutoExpired,
            ]);

            // Trigger evaluation and scoring pipeline
            return $this->scoringService->evaluateSession($lockedSession);
        });
    }

    /**
     * Record examination integrity and telemetry events.
     * Note: Events are transparently recorded for human review; they do NOT auto-disqualify.
     */
    public function recordTelemetry(AssessmentSession $session, string $eventType, ?array $eventData = null): void
    {
        $allowedEvents = [
            'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'TAB_SWITCH', 'PASTE_DETECTED',
            'CONNECTION_LOST', 'CONNECTION_RESTORED', 'RESIZE_EVENT',
        ];

        if (in_array($eventType, $allowedEvents)) {
            $session->recordEvent($eventType, $eventData);
        }
    }
}
