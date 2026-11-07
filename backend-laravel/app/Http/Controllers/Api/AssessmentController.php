<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Assessment;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\AssessmentSession;
use App\Models\AssessmentAnswer;
use App\Models\Student;
use App\Services\Assessment\AiQuestionGeneratorService;
use App\Services\Assessment\AssessmentSessionService;
use App\Services\Assessment\AssessmentScoringService;
use App\Services\Sandbox\SandboxManager;
use Carbon\Carbon;

class AssessmentController extends Controller
{
    protected AiQuestionGeneratorService $questionGenerator;
    protected AssessmentSessionService $sessionService;
    protected AssessmentScoringService $scoringService;
    protected SandboxManager $sandboxManager;

    public function __construct(
        AiQuestionGeneratorService $questionGenerator,
        AssessmentSessionService $sessionService,
        AssessmentScoringService $scoringService,
        SandboxManager $sandboxManager
    ) {
        $this->questionGenerator = $questionGenerator;
        $this->sessionService = $sessionService;
        $this->scoringService = $scoringService;
        $this->sandboxManager = $sandboxManager;
    }

    /* =========================================================================
     *  PLACEMENT OFFICER / ADMIN ENDPOINTS
     * ========================================================================= */

    /**
     * List all assessments (Officer/Admin).
     */
    public function index(Request $request)
    {
        $query = Assessment::with(['drive', 'job.company', 'creator'])
            ->withCount('questions');

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('drive_id')) {
            $query->where('drive_id', $request->query('drive_id'));
        }

        return response()->json([
            'status' => 'success',
            'assessments' => $query->orderBy('id', 'desc')->paginate(20),
        ]);
    }

    /**
     * Create a new assessment.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'code' => 'required|string|max:50|unique:assessments,code',
            'description' => 'nullable|string',
            'drive_id' => 'nullable|exists:placement_drives,id',
            'job_id' => 'nullable|exists:jobs,id',
            'assessment_type' => 'required|string|in:TECHNICAL,APTITUDE,CODING,MIXED,REASONING',
            'duration_minutes' => 'required|integer|min:5|max:360',
            'total_marks' => 'required|numeric|min:1',
            'pass_percentage' => 'required|numeric|min:1|max:100',
            'max_attempts' => 'nullable|integer|min:1|max:10',
            'is_randomized' => 'nullable|boolean',
            'negative_marking_rate' => 'nullable|numeric|min:0|max:1',
            'instructions' => 'nullable|string',
        ]);

        $assessment = Assessment::create([
            ...$validated,
            'created_by_user_id' => $request->user()->id,
            'status' => 'DRAFT',
            'max_attempts' => $validated['max_attempts'] ?? 1,
            'is_randomized' => $validated['is_randomized'] ?? false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Assessment created successfully.',
            'assessment' => $assessment,
        ], 201);
    }

    /**
     * View assessment details (Officer view includes answers and hidden test cases).
     */
    public function show(Request $request, $id)
    {
        $assessment = Assessment::with(['questions', 'drive', 'job', 'creator'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'assessment' => $assessment,
        ]);
    }

    /**
     * Update assessment configuration.
     */
    public function update(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:150',
            'description' => 'nullable|string',
            'duration_minutes' => 'sometimes|integer|min:5|max:360',
            'total_marks' => 'sometimes|numeric|min:1',
            'pass_percentage' => 'sometimes|numeric|min:1|max:100',
            'max_attempts' => 'sometimes|integer|min:1',
            'is_randomized' => 'sometimes|boolean',
            'instructions' => 'nullable|string',
            'status' => 'sometimes|string|in:DRAFT,PUBLISHED,ARCHIVED',
        ]);

        $assessment->update($validated);

        if (isset($validated['status']) && $validated['status'] === 'PUBLISHED' && !$assessment->published_at) {
            $assessment->publish();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Assessment updated successfully.',
            'assessment' => $assessment,
        ]);
    }

    /**
     * Publish assessment.
     */
    public function publish(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);
        $assessment->publish();

        return response()->json([
            'status' => 'success',
            'message' => 'Assessment published successfully for candidates.',
            'assessment' => $assessment,
        ]);
    }

    /**
     * Add questions to assessment.
     */
    public function addQuestions(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);

        $validated = $request->validate([
            'questions' => 'required|array|min:1',
            'questions.*.question_id' => 'required|exists:questions,id',
            'questions.*.marks' => 'nullable|numeric|min:0.5',
            'questions.*.negative_marks' => 'nullable|numeric|min:0',
            'questions.*.order_index' => 'nullable|integer',
        ]);

        foreach ($validated['questions'] as $q) {
            $question = Question::find($q['question_id']);
            $marks = $q['marks'] ?? $question->marks;
            $neg = $q['negative_marks'] ?? $question->negative_marks;
            $order = $q['order_index'] ?? 0;

            $assessment->questions()->syncWithoutDetaching([
                $question->id => [
                    'marks' => $marks,
                    'negative_marks' => $neg,
                    'order_index' => $order,
                ]
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Questions attached to assessment.',
            'questions_count' => $assessment->questions()->count(),
        ]);
    }

    /**
     * AI-assisted generation of draft examination questions.
     */
    public function generateQuestions(Request $request)
    {
        $validated = $request->validate([
            'source_text' => 'required|string|min:20',
            'type' => 'nullable|string|in:MCQ,DESCRIPTIVE,PROGRAMMING,APTITUDE',
            'difficulty' => 'nullable|string|in:EASY,MEDIUM,HARD',
            'count' => 'nullable|integer|min:1|max:10',
            'question_bank_id' => 'nullable|exists:question_banks,id',
        ]);

        $result = $this->questionGenerator->generateDraftQuestions(
            $validated['source_text'],
            $validated['type'] ?? 'MCQ',
            $validated['difficulty'] ?? 'MEDIUM',
            $validated['count'] ?? 3,
            $validated['question_bank_id'] ?? null
        );

        return response()->json($result);
    }

    /**
     * Officer review & approval of an AI-generated draft question.
     */
    public function approveQuestion(Request $request, $questionId)
    {
        $question = Question::findOrFail($questionId);

        $validated = $request->validate([
            'title' => 'nullable|string|max:200',
            'question_text' => 'nullable|string',
            'marks' => 'nullable|numeric',
            'negative_marks' => 'nullable|numeric',
            'correct_answer' => 'nullable|string',
            'options' => 'nullable|array',
            'test_cases' => 'nullable|array',
        ]);

        $approved = $this->questionGenerator->approveQuestion($question, $request->user(), $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Question approved and verified for assessment publication.',
            'question' => $approved,
        ]);
    }

    /**
     * Manage question banks.
     */
    public function questionBanks(Request $request)
    {
        if ($request->isMethod('post')) {
            $validated = $request->validate([
                'name' => 'required|string|max:150',
                'description' => 'nullable|string',
            ]);

            $bank = QuestionBank::create([
                ...$validated,
                'created_by_user_id' => $request->user()->id,
                'is_active' => true,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Question bank created.',
                'question_bank' => $bank,
            ], 201);
        }

        $banks = QuestionBank::withCount('questions')->get();
        return response()->json([
            'status' => 'success',
            'question_banks' => $banks,
        ]);
    }

    /**
     * View submissions and scores for an assessment.
     */
    public function submissions(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);

        $sessions = AssessmentSession::with(['student.user'])
            ->where('assessment_id', $assessment->id)
            ->orderBy('id', 'desc')
            ->paginate(25);

        return response()->json([
            'status' => 'success',
            'assessment_id' => $assessment->id,
            'sessions' => $sessions,
        ]);
    }

    /**
     * Officer grading and manual score override for subjective answers.
     */
    public function evaluateSubjective(Request $request, $sessionId)
    {
        $session = AssessmentSession::with('assessment')->findOrFail($sessionId);

        $validated = $request->validate([
            'answer_id' => 'required|exists:assessment_answers,id',
            'score' => 'required|numeric|min:0',
            'reason' => 'required|string|min:5|max:255',
            'feedback' => 'nullable|string|max:500',
        ]);

        $answer = AssessmentAnswer::where('id', $validated['answer_id'])
            ->where('session_id', $session->id)
            ->firstOrFail();

        $updatedSession = $this->scoringService->overrideAnswerScore(
            $answer,
            $request->user(),
            (float) $validated['score'],
            $validated['reason'],
            $validated['feedback'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Score updated with verified audit record.',
            'session' => $updatedSession,
        ]);
    }

    /* =========================================================================
     *  STUDENT EXAMINATION ENDPOINTS
     * ========================================================================= */

    /**
     * List assessments available to the authenticated student.
     */
    public function studentAssessments(Request $request)
    {
        $student = $this->getStudent($request);

        // Published assessments
        $assessments = Assessment::where('status', 'PUBLISHED')
            ->with(['drive', 'job.company'])
            ->withCount('questions')
            ->get()
            ->map(function ($a) use ($student) {
                // Check past sessions for student
                $pastAttempts = AssessmentSession::where('assessment_id', $a->id)
                    ->where('student_id', $student->id)
                    ->get();

                $activeSession = $pastAttempts->firstWhere('status', 'IN_PROGRESS');
                $lastEvaluated = $pastAttempts->whereIn('status', ['EVALUATED', 'SUBMITTED'])->last();

                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'code' => $a->code,
                    'description' => $a->description,
                    'duration_minutes' => $a->duration_minutes,
                    'total_marks' => $a->total_marks,
                    'pass_percentage' => $a->pass_percentage,
                    'max_attempts' => $a->max_attempts,
                    'attempts_used' => $pastAttempts->count(),
                    'can_attempt' => ($pastAttempts->count() < $a->max_attempts) || ($activeSession !== null),
                    'active_session_id' => $activeSession?->id,
                    'last_score' => $lastEvaluated?->total_score,
                    'last_passed' => $lastEvaluated?->passed,
                    'drive_title' => $a->drive?->name,
                    'company_name' => $a->job?->company?->name,
                ];
            });

        return response()->json([
            'status' => 'success',
            'assessments' => $assessments,
        ]);
    }

    /**
     * Start or resume a secure assessment session.
     * Enforces attempt limits, sets authoritative server deadline, and strips answer keys.
     */
    public function startSession(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $assessment = Assessment::with('questions')->findOrFail($id);

        try {
            $session = $this->sessionService->startSession($assessment, $student);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'SESSION_START_FAILED',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Examination session active.',
            'session' => $this->formatCandidateSession($session),
        ]);
    }

    /**
     * Get active examination session (Candidate Safe - Strips Answers).
     */
    public function showSession(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);
        $session = AssessmentSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->with(['assessment.questions', 'answers'])
            ->firstOrFail();

        // Check server-side deadline
        if ($session->isExpired()) {
            $this->sessionService->submitSession($session, true);
        }

        return response()->json([
            'status' => 'success',
            'session' => $this->formatCandidateSession($session),
        ]);
    }

    /**
     * Autosave candidate answer during exam session.
     */
    public function saveAnswer(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);
        $session = AssessmentSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'question_id' => 'required|exists:questions,id',
            'answer_text' => 'nullable|string',
            'code_language' => 'nullable|string|max:50',
        ]);

        try {
            $answer = $this->sessionService->autoSaveAnswer(
                $session,
                (int) $validated['question_id'],
                $validated['answer_text'] ?? null,
                $validated['code_language'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'DEADLINE_EXPIRED',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Answer saved successfully.',
            'saved_at' => $answer->saved_at->toIso8601String(),
        ]);
    }

    /**
     * Run student code against visible sample test cases in sandbox (practice execution).
     */
    public function runCode(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);
        $session = AssessmentSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        if ($session->isExpired()) {
            return response()->json([
                'status' => 'error',
                'code' => 'SESSION_EXPIRED',
                'message' => 'Examination session has expired.',
            ], 422);
        }

        $validated = $request->validate([
            'question_id' => 'required|exists:questions,id',
            'source_code' => 'required|string',
            'language' => 'required|string',
        ]);

        $question = Question::findOrFail($validated['question_id']);
        
        // Filter to ONLY visible sample test cases
        $sampleTestCases = collect($question->test_cases ?? [])
            ->filter(fn($tc) => empty($tc['is_hidden']))
            ->values()
            ->all();

        $evalResult = $this->sandboxManager->evaluateSubmission(
            $validated['language'],
            $validated['source_code'],
            $sampleTestCases
        );

        return response()->json([
            'status' => 'success',
            'result' => $evalResult,
        ]);
    }

    /**
     * Submit examination session.
     */
    public function submit(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);
        $session = AssessmentSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $evaluatedSession = $this->sessionService->submitSession($session, false);

        return response()->json([
            'status' => 'success',
            'message' => 'Examination submitted and evaluated successfully.',
            'session' => [
                'id' => $evaluatedSession->id,
                'status' => $evaluatedSession->status,
                'total_score' => $evaluatedSession->total_score,
                'passed' => $evaluatedSession->passed,
                'submitted_at' => $evaluatedSession->submitted_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Record examination security telemetry (blur, fullscreen exit, paste).
     */
    public function recordTelemetry(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);
        $session = AssessmentSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'event_type' => 'required|string|max:50',
            'event_data' => 'nullable|array',
        ]);

        $this->sessionService->recordTelemetry(
            $session,
            $validated['event_type'],
            $validated['event_data'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Telemetry event logged.',
        ]);
    }

    /**
     * Get candidate performance report post-evaluation.
     */
    public function result(Request $request, $sessionId)
    {
        $student = $this->getStudent($request);
        $session = AssessmentSession::where('id', $sessionId)
            ->where('student_id', $student->id)
            ->with(['assessment', 'answers.question'])
            ->firstOrFail();

        if ($session->status !== 'EVALUATED' && $session->status !== 'SUBMITTED') {
            return response()->json([
                'status' => 'error',
                'code' => 'NOT_EVALUATED',
                'message' => 'Assessment has not been evaluated yet.',
            ], 400);
        }

        return response()->json([
            'status' => 'success',
            'result' => [
                'session_id' => $session->id,
                'assessment_title' => $session->assessment->title,
                'status' => $session->status,
                'total_score' => $session->total_score,
                'total_possible' => $session->assessment->total_marks,
                'passed' => $session->passed,
                'pass_percentage' => $session->assessment->pass_percentage,
                'submitted_at' => $session->submitted_at?->toIso8601String(),
                'proctoring_flags_count' => $session->proctoring_flags_count,
                'evaluation_summary' => $session->evaluation_summary,
            ],
        ]);
    }

    /* =========================================================================
     *  INTERNAL HELPERS
     * ========================================================================= */

    private function getStudent(Request $request): Student
    {
        $student = $request->user()?->studentProfile;
        if (!$student) {
            abort(404, 'Student profile not found for this user account.');
        }
        return $student;
    }

    /**
     * Format session payload for candidate with strict sanitization of secret answer keys.
     */
    private function formatCandidateSession(AssessmentSession $session): array
    {
        $assessment = $session->assessment;
        $session->loadMissing(['assessment.questions', 'answers']);

        // Order questions according to session's specific question_order
        $questionsCollection = $assessment->questions->keyBy('id');
        $orderedQuestions = [];

        $orderIds = $session->question_order ?: $questionsCollection->keys()->all();
        foreach ($orderIds as $qId) {
            if ($questionsCollection->has($qId)) {
                $q = $questionsCollection->get($qId);
                $pivotMarks = (float) $q->pivot->marks;
                $pivotNeg = (float) $q->pivot->negative_marks;
                // SANITIZE: Secret answer key and hidden test cases are stripped!
                $orderedQuestions[] = $q->toCandidateArray($pivotMarks, $pivotNeg);
            }
        }

        // Map candidate's saved answers
        $savedAnswers = $session->answers->map(function ($ans) {
            return [
                'question_id' => $ans->question_id,
                'answer_text' => $ans->answer_text,
                'code_language' => $ans->code_language,
                'saved_at' => $ans->saved_at->toIso8601String(),
            ];
        })->keyBy('question_id');

        return [
            'id' => $session->id,
            'assessment_id' => $assessment->id,
            'assessment_title' => $assessment->title,
            'duration_minutes' => $assessment->duration_minutes,
            'status' => $session->status,
            'started_at' => $session->started_at->toIso8601String(),
            'expires_at' => $session->expires_at->toIso8601String(),
            'seconds_remaining' => $session->secondsRemaining(),
            'is_expired' => $session->isExpired(),
            'total_questions' => count($orderedQuestions),
            'questions' => $orderedQuestions,
            'saved_answers' => $savedAnswers,
        ];
    }
}
