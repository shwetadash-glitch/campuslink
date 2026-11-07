<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AiInterview;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use App\Models\Student;
use App\Services\Interview\AiInterviewQuestionGeneratorService;
use App\Services\Interview\AiInterviewSessionService;
use App\Services\Interview\AiInterviewEvaluatorService;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AiInterviewController extends Controller
{
    protected AiInterviewQuestionGeneratorService $generatorService;
    protected AiInterviewSessionService $sessionService;
    protected AiInterviewEvaluatorService $evaluatorService;

    public function __construct(
        AiInterviewQuestionGeneratorService $generatorService,
        AiInterviewSessionService $sessionService,
        AiInterviewEvaluatorService $evaluatorService
    ) {
        $this->generatorService = $generatorService;
        $this->sessionService = $sessionService;
        $this->evaluatorService = $evaluatorService;
    }

    /* =========================================================================
     *  PLACEMENT OFFICER / RECRUITER MANAGEMENT ENDPOINTS
     * ========================================================================= */

    /**
     * List all AI interviews (Officer/Recruiter).
     */
    public function index(Request $request)
    {
        $query = AiInterview::with(['placementDrive', 'job', 'creator'])
            ->withCount(['questions', 'sessions']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('drive_id')) {
            $query->where('drive_id', $request->query('drive_id'));
        }
        if ($request->has('target_role')) {
            $query->where('target_role', 'like', '%' . $request->query('target_role') . '%');
        }

        return response()->json([
            'status' => 'success',
            'interviews' => $query->orderBy('id', 'desc')->paginate(20),
        ]);
    }

    /**
     * Create an AI Interview specification.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:ai_interviews,code',
            'description' => 'nullable|string',
            'target_role' => 'required|string|max:100',
            'interview_type' => 'required|in:TECHNICAL,BEHAVIORAL,SYSTEM_DESIGN,MIXED',
            'difficulty' => 'required|in:EASY,MEDIUM,HARD',
            'duration_minutes' => 'integer|min:5|max:120',
            'max_questions' => 'integer|min:1|max:15',
            'max_follow_ups_per_question' => 'integer|min:0|max:3',
            'drive_id' => 'nullable|exists:placement_drives,id',
            'job_id' => 'nullable|exists:jobs,id',
            'pass_percentage' => 'numeric|min:0|max:100',
            'rubric_template' => 'nullable|array',
        ]);

        $interview = AiInterview::create([
            ...$validated,
            'duration_minutes' => $validated['duration_minutes'] ?? 30,
            'max_questions' => $validated['max_questions'] ?? 5,
            'max_follow_ups_per_question' => $validated['max_follow_ups_per_question'] ?? 1,
            'pass_percentage' => $validated['pass_percentage'] ?? 60.0,
            'status' => 'DRAFT',
            'created_by_user_id' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'AI Interview template created successfully.',
            'interview' => $interview->load(['placementDrive', 'job']),
        ], 201);
    }

    /**
     * Show interview details with full questions and confidential rubrics (Officer only).
     */
    public function show($id)
    {
        $interview = AiInterview::with(['questions' => function ($q) {
            $q->orderBy('order_index');
        }, 'placementDrive', 'job', 'creator'])
            ->withCount('sessions')
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'interview' => $interview,
        ]);
    }

    /**
     * Update an interview template.
     */
    public function update(Request $request, $id)
    {
        $interview = AiInterview::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'target_role' => 'sometimes|string|max:100',
            'interview_type' => 'sometimes|in:TECHNICAL,BEHAVIORAL,SYSTEM_DESIGN,MIXED',
            'difficulty' => 'sometimes|in:EASY,MEDIUM,HARD',
            'duration_minutes' => 'sometimes|integer|min:5|max:120',
            'max_questions' => 'sometimes|integer|min:1|max:15',
            'max_follow_ups_per_question' => 'sometimes|integer|min:0|max:3',
            'pass_percentage' => 'sometimes|numeric|min:0|max:100',
            'rubric_template' => 'nullable|array',
        ]);

        $interview->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'AI Interview template updated successfully.',
            'interview' => $interview,
        ]);
    }

    /**
     * AI-Powered Multi-Stage Interview Question Generation.
     * Generates draft questions quarantined in PENDING_REVIEW status until approved.
     */
    public function generateQuestions(Request $request, $id)
    {
        $interview = AiInterview::findOrFail($id);

        $validated = $request->validate([
            'context_source' => 'nullable|string',
            'count' => 'integer|min:1|max:10',
        ]);

        $count = $validated['count'] ?? ($interview->max_questions ?: 4);
        $context = $validated['context_source'] ?? null;

        $questions = $this->generatorService->generateInterviewQuestions($interview, $context, $count);

        return response()->json([
            'status' => 'success',
            'message' => 'Generated ' . count($questions) . ' draft interview questions quarantined for officer review.',
            'count' => count($questions),
            'questions' => $questions,
        ]);
    }

    /**
     * Officer review gate: Approve a quarantined AI-generated question.
     */
    public function approveQuestion(Request $request, $id, $questionId)
    {
        $interview = AiInterview::findOrFail($id);
        $question = AiInterviewQuestion::where('ai_interview_id', $interview->id)
            ->where('id', $questionId)
            ->firstOrFail();

        $approved = $this->generatorService->approveQuestion($question, $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Interview question approved and published for candidate sessions.',
            'question' => $approved,
        ]);
    }

    /**
     * Officer review gate: Edit a question before or after approval.
     */
    public function editQuestion(Request $request, $id, $questionId)
    {
        $interview = AiInterview::findOrFail($id);
        $question = AiInterviewQuestion::where('ai_interview_id', $interview->id)
            ->where('id', $questionId)
            ->firstOrFail();

        $validated = $request->validate([
            'question_text' => 'sometimes|string',
            'stage' => 'sometimes|in:TECHNICAL,BEHAVIORAL,SYSTEM_DESIGN',
            'category' => 'sometimes|string',
            'expected_answer_points' => 'sometimes|array',
            'rubric' => 'sometimes|array',
            'weight' => 'sometimes|numeric|min:0.1|max:10',
        ]);

        $updated = $this->generatorService->editQuestion($question, $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Interview question updated successfully.',
            'question' => $updated,
        ]);
    }

    /**
     * Publish AI Interview for candidate access.
     */
    public function publish($id)
    {
        $interview = AiInterview::withCount(['questions' => function ($q) {
            $q->where('ai_review_status', 'APPROVED');
        }])->findOrFail($id);

        if ($interview->questions_count === 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot publish an interview without at least one approved question.',
            ], 422);
        }

        $interview->publish();

        return response()->json([
            'status' => 'success',
            'message' => 'AI Interview published successfully.',
            'interview' => $interview,
        ]);
    }

    /**
     * List candidate sessions for an interview (Officer/Recruiter).
     */
    public function sessions(Request $request, $id)
    {
        $interview = AiInterview::with(['placementDrive', 'job'])->findOrFail($id);
        $this->authorizeRecruiterOrOfficerAccess($request, $interview);

        $sessions = AiInterviewSession::where('ai_interview_id', $interview->id)
            ->with(['student.user', 'reviewer'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json([
            'status' => 'success',
            'sessions' => $sessions,
        ]);
    }

    /**
     * Officer review of a specific candidate session with full message transcript.
     */
    public function sessionDetail(Request $request, $sessionId)
    {
        $session = AiInterviewSession::with([
            'aiInterview.questions',
            'aiInterview.placementDrive',
            'aiInterview.job',
            'student.user',
            'messages',
            'scoreHistories.changedBy',
            'reviewer',
        ])->findOrFail($sessionId);

        $this->authorizeRecruiterOrOfficerAccess($request, $session->aiInterview);

        return response()->json([
            'status' => 'success',
            'session' => $session,
        ]);
    }

    /**
     * Human Placement Officer Score Override Gate.
     * Updates provisional score and saves non-repudiation audit record.
     */
    public function overrideScore(Request $request, $sessionId)
    {
        $user = $request->user();
        $userRole = $user->role instanceof \BackedEnum ? $user->role->value : (string) $user->role;
        if (!in_array($userRole, ['SUPER_ADMIN', 'PLACEMENT_OFFICER'])) {
            return response()->json([
                'status' => 'error',
                'code' => 'FORBIDDEN',
                'message' => 'Only institutional placement officers or administrators can calibrate provisional scores.',
            ], 403);
        }

        $session = AiInterviewSession::findOrFail($sessionId);

        $validated = $request->validate([
            'new_score' => 'required|numeric|min:0|max:100',
            'dimension_scores' => 'nullable|array',
            'reason' => 'required|string|min:5|max:500',
            'feedback' => 'nullable|string',
            'review_status' => 'nullable|in:APPROVED,OVERRIDDEN,REJECTED',
        ]);

        $updatedSession = $this->evaluatorService->overrideSessionScore(
            session: $session,
            reviewer: $request->user(),
            newScore: (float) $validated['new_score'],
            newDimensionScores: $validated['dimension_scores'] ?? null,
            reason: $validated['reason'],
            feedback: $validated['feedback'] ?? null,
            reviewStatus: $validated['review_status'] ?? 'APPROVED'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Interview score successfully calibrated with immutable audit record.',
            'session' => $updatedSession->load(['scoreHistories.changedBy', 'reviewer']),
        ]);
    }

    /**
     * Authorize that recruiters can only access interviews/sessions for their company's drives or jobs.
     */
    protected function authorizeRecruiterOrOfficerAccess(Request $request, AiInterview $interview): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        $userRole = $user->role instanceof \BackedEnum ? $user->role->value : (string) $user->role;
        if ($userRole === 'RECRUITER') {
            $recruiter = $user->recruiterProfile;
            if (!$recruiter || !$recruiter->company_id) {
                abort(403, 'No active company profile found for this recruiter account.');
            }

            $companyId = (int) $recruiter->company_id;
            $interview->loadMissing(['placementDrive', 'job']);
            $driveCompanyId = $interview->placementDrive ? (int) $interview->placementDrive->company_id : null;
            $jobCompanyId = $interview->job ? (int) $interview->job->company_id : null;

            if ($driveCompanyId !== $companyId && $jobCompanyId !== $companyId) {
                abort(403, 'Unauthorized recruiter access. This interview does not belong to your company.');
            }
        } elseif (!in_array($userRole, ['SUPER_ADMIN', 'PLACEMENT_OFFICER'])) {
            abort(403, 'Unauthorized access.');
        }
    }

    /* =========================================================================
     *  CANDIDATE INTERVIEW PARTICIPATION ENDPOINTS
     * ========================================================================= */

    /**
     * List available AI interviews for the authenticated student candidate.
     */
    public function studentInterviews(Request $request)
    {
        $student = $this->getStudent($request);

        $interviews = AiInterview::where('status', 'PUBLISHED')
            ->with(['placementDrive', 'job.company'])
            ->get()
            ->map(function ($interview) use ($student) {
                $pastSessions = AiInterviewSession::where('ai_interview_id', $interview->id)
                    ->where('student_id', $student->id)
                    ->get();

                $activeSession = $pastSessions->firstWhere('status', 'IN_PROGRESS');
                $lastEvaluated = $pastSessions->whereIn('status', ['COMPLETED', 'EVALUATED'])->last();

                return [
                    'id' => $interview->id,
                    'title' => $interview->title,
                    'code' => $interview->code,
                    'description' => $interview->description,
                    'target_role' => $interview->target_role,
                    'interview_type' => $interview->interview_type,
                    'difficulty' => $interview->difficulty,
                    'duration_minutes' => $interview->duration_minutes,
                    'pass_percentage' => $interview->pass_percentage,
                    'attempts_used' => $pastSessions->count(),
                    'can_attempt' => ($pastSessions->count() < 1) || ($activeSession !== null),
                    'active_session_id' => $activeSession?->id,
                    'last_score' => $lastEvaluated?->total_score,
                    'last_passed' => $lastEvaluated?->passed,
                    'is_provisional' => $lastEvaluated?->is_provisional,
                    'drive_title' => $interview->placementDrive?->name,
                    'company_name' => $interview->job?->company?->name,
                ];
            });

        return response()->json([
            'status' => 'success',
            'interviews' => $interviews,
        ]);
    }

    /**
     * Start or resume an AI interview session.
     */
    public function startCandidateSession(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $interview = AiInterview::findOrFail($id);

        try {
            $session = $this->sessionService->startSession($interview, $student);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Interview session ready.',
            'session' => $this->sessionService->formatSessionForCandidate($session),
        ]);
    }

    /**
     * Candidate fetches their session details (sanitized, no internal rubrics/answers).
     */
    public function showCandidateSession(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);

        $session = AiInterviewSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        // Check if deadline expired
        if ($session->isExpired() && $session->status === 'IN_PROGRESS') {
            $session->update([
                'status' => 'EXPIRED',
                'completed_at' => $session->expires_at,
            ]);
            $this->evaluatorService->evaluateInterviewSession($session);
        }

        return response()->json([
            'status' => 'success',
            'session' => $this->sessionService->formatSessionForCandidate($session),
        ]);
    }

    /**
     * Candidate submits an answer during the interview session.
     */
    public function answerQuestion(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);

        $session = AiInterviewSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'answer' => 'required|string|min:1',
        ]);

        try {
            $result = $this->sessionService->submitCandidateAnswer($session, $validated['answer']);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            ...$result,
        ]);
    }

    /**
     * Candidate views their completed post-interview evaluation report.
     */
    public function sessionReport(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);

        $session = AiInterviewSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'session' => $this->sessionService->formatSessionForCandidate($session),
        ]);
    }

    private function getStudent(Request $request): Student
    {
        $student = $request->user()?->studentProfile;
        if (!$student) {
            abort(404, 'Student profile not found for authenticated user.');
        }

        return $student;
    }
}
