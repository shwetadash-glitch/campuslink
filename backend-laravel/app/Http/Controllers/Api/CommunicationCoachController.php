<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Communication\CommunicationCoachService;
use App\Services\Communication\CommunicationTopicGeneratorService;
use App\Models\CommunicationScenario;
use App\Models\CommunicationPracticeSession;
use App\Models\Student;
use App\Enums\CommunicationCategory;
use App\Exceptions\EvaluationClaimConflictException;
use App\Exceptions\RevisionConflictException;
use App\Exceptions\MalformedAiResponseException;
use App\Exceptions\InferenceTimeoutException;
use App\Exceptions\AiServiceUnavailableException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class CommunicationCoachController extends Controller
{
    protected CommunicationCoachService $coachService;
    protected CommunicationTopicGeneratorService $topicGeneratorService;

    public function __construct(
        CommunicationCoachService $coachService,
        CommunicationTopicGeneratorService $topicGeneratorService
    ) {
        $this->coachService = $coachService;
        $this->topicGeneratorService = $topicGeneratorService;
    }

    /**
     * Resolve the authenticated student profile.
     */
    protected function getAuthenticatedStudent(Request $request): Student
    {
        $user = $request->user();
        $student = $user->studentProfile;

        if (!$student) {
            abort(403, "Authenticated user does not have an active student profile.");
        }

        return $student;
    }

    /**
     * List practice categories and aggregate completion metrics for the student.
     */
    public function categories(Request $request): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $categories = [];
        foreach (CommunicationCategory::cases() as $cat) {
            $scenarioCount = CommunicationScenario::active()->where('category', $cat->value)->count();
            $sessions = CommunicationPracticeSession::where('student_id', $student->id)
                ->where('category', $cat->value)
                ->where('status', 'EVALUATED')
                ->with('feedback')
                ->get();

            $completedCount = $sessions->count();
            $avgScore = $completedCount > 0 ? round($sessions->avg(fn($s) => $s->feedback?->overall_score ?? 0), 2) : null;

            $categories[] = [
                'key' => $cat->value,
                'label' => $cat->label(),
                'scenario_count' => $scenarioCount,
                'completed_sessions' => $completedCount,
                'average_score' => $avgScore,
            ];
        }

        return response()->json([
            'categories' => $categories,
        ]);
    }

    /**
     * List active practice scenarios with optional filters.
     */
    public function scenarios(Request $request): JsonResponse
    {
        $query = CommunicationScenario::active();

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('difficulty')) {
            $query->where('difficulty', $request->query('difficulty'));
        }

        $scenarios = $query->orderBy('category')->orderBy('difficulty')->get();

        return response()->json([
            'scenarios' => $scenarios->map(fn($s) => $s->toStudentArray()),
        ]);
    }

    /**
     * Show single scenario details.
     */
    public function showScenario(Request $request, int $id): JsonResponse
    {
        $scenario = CommunicationScenario::active()->findOrFail($id);

        return response()->json([
            'scenario' => $scenario->toStudentArray(),
        ]);
    }

    /**
     * Start or resume a practice session.
     */
    public function startSession(Request $request): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $validated = $request->validate([
            'scenario_id' => 'required|integer|exists:communication_scenarios,id',
            'force_new' => 'nullable|boolean',
        ]);

        $forceNew = (bool) ($validated['force_new'] ?? false);
        $session = $this->coachService->startOrResumeSession($student, $validated['scenario_id'], $forceNew);

        return response()->json([
            'session' => $session->load(['scenario', 'feedback']),
            'is_resumed' => ($session->status === 'IN_PROGRESS' && $session->wasRecentlyCreated === false),
        ]);
    }

    /**
     * Start a linear follow-up revision session.
     */
    public function createRevision(Request $request, int $id): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        try {
            $revision = $this->coachService->startRevision($student, $id);

            return response()->json([
                'session' => $revision->load(['scenario', 'parentSession']),
                'message' => 'Follow-up revision session initialized.',
            ], 201);
        } catch (RevisionConflictException $e) {
            return response()->json([
                'error' => 'REVISION_ALREADY_EXISTS',
                'message' => $e->getMessage(),
                'existing_revision_id' => $e->existingChildId,
            ], 409);
        }
    }

    /**
     * Show session state and feedback if evaluated.
     */
    public function showSession(Request $request, int $id): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $session = CommunicationPracticeSession::where('student_id', $student->id)
            ->with(['scenario', 'feedback', 'parentSession', 'revisionChild'])
            ->findOrFail($id);

        return response()->json([
            'session' => $session,
        ]);
    }

    /**
     * Submit a written response for evaluation.
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $session = CommunicationPracticeSession::where('student_id', $student->id)
            ->with('scenario')
            ->findOrFail($id);

        $validated = $request->validate([
            'response_text' => 'required|string',
        ]);

        try {
            $result = $this->coachService->submitAndEvaluate($session, $validated['response_text']);

            return response()->json([
                'message' => 'Response evaluated successfully.',
                'session' => $result['session'],
                'feedback' => $result['feedback'],
            ]);
        } catch (EvaluationClaimConflictException $e) {
            return response()->json([
                'error' => 'EVALUATION_CLAIM_CONFLICT',
                'message' => $e->getMessage(),
            ], 409);
        } catch (InferenceTimeoutException $e) {
            return response()->json([
                'error' => 'INFERENCE_TIMEOUT',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 504);
        } catch (MalformedAiResponseException $e) {
            return response()->json([
                'error' => 'MALFORMED_AI_RESPONSE',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 502);
        } catch (AiServiceUnavailableException $e) {
            return response()->json([
                'error' => 'AI_SERVICE_UNAVAILABLE',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 503);
        }
    }

    /**
     * Retry evaluation for a previously submitted session.
     */
    public function retryEvaluation(Request $request, int $id): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $session = CommunicationPracticeSession::where('student_id', $student->id)
            ->with('scenario')
            ->findOrFail($id);

        try {
            $result = $this->coachService->retryEvaluation($session);

            return response()->json([
                'message' => 'Evaluation re-processed successfully.',
                'session' => $result['session'],
                'feedback' => $result['feedback'],
            ]);
        } catch (EvaluationClaimConflictException $e) {
            return response()->json([
                'error' => 'EVALUATION_CLAIM_CONFLICT',
                'message' => $e->getMessage(),
            ], 409);
        } catch (InferenceTimeoutException $e) {
            return response()->json([
                'error' => 'INFERENCE_TIMEOUT',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 504);
        } catch (MalformedAiResponseException $e) {
            return response()->json([
                'error' => 'MALFORMED_AI_RESPONSE',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 502);
        } catch (AiServiceUnavailableException $e) {
            return response()->json([
                'error' => 'AI_SERVICE_UNAVAILABLE',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 503);
        }
    }

    /**
     * Retrieve structured feedback for an evaluated session.
     */
    public function feedback(Request $request, int $id): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $session = CommunicationPracticeSession::where('student_id', $student->id)
            ->with(['scenario', 'feedback'])
            ->findOrFail($id);

        if (!$session->feedback) {
            return response()->json([
                'error' => 'FEEDBACK_NOT_FOUND',
                'message' => 'Feedback has not been generated for this session yet.',
                'session_status' => $session->status,
            ], 404);
        }

        return response()->json([
            'session' => $session,
            'feedback' => $session->feedback,
        ]);
    }

    /**
     * Get aggregate progress analytics across the 7 dimensions.
     */
    public function progress(Request $request): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $sessions = CommunicationPracticeSession::where('student_id', $student->id)
            ->where('status', 'EVALUATED')
            ->with('feedback')
            ->orderBy('evaluated_at')
            ->get();

        $dimensionTotals = [
            'clarity' => 0.0,
            'relevance' => 0.0,
            'coherence_organization' => 0.0,
            'grammar' => 0.0,
            'professional_language' => 0.0,
            'conciseness' => 0.0,
            'audience_adaptation' => 0.0,
        ];

        $dimensionCounts = array_fill_keys(array_keys($dimensionTotals), 0);
        $totalSessions = $sessions->count();
        $trajectory = [];

        foreach ($sessions as $s) {
            $fb = $s->feedback;
            if (!$fb) continue;

            $rubric = $fb->rubric_scores ?? [];
            foreach (CommunicationCoachService::CANONICAL_DIMENSIONS as $dim) {
                if (isset($rubric[$dim])) {
                    $dimensionTotals[$dim] += (float) $rubric[$dim];
                    $dimensionCounts[$dim]++;
                }
            }

            $trajectory[] = [
                'session_id' => $s->id,
                'category' => $s->category,
                'evaluated_at' => $s->evaluated_at?->toIso8601String(),
                'overall_score' => $fb->overall_score,
            ];
        }

        $dimensionAverages = [];
        foreach ($dimensionTotals as $dim => $sum) {
            $count = $dimensionCounts[$dim];
            $dimensionAverages[$dim] = $count > 0 ? round($sum / $count, 2) : 0.0;
        }

        $overallAverage = $totalSessions > 0 ? round($sessions->avg(fn($s) => $s->feedback?->overall_score ?? 0), 2) : 0.0;

        return response()->json([
            'total_completed_sessions' => $totalSessions,
            'overall_average_score' => $overallAverage,
            'dimension_averages' => $dimensionAverages,
            'score_trajectory' => $trajectory,
            'disclaimer' => 'Communication scores are formative educational guidance tools and do not represent formal hiring or placement determinations.',
        ]);
    }

    /**
     * Get paginated attempt history.
     */
    public function history(Request $request): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $query = CommunicationPracticeSession::where('student_id', $student->id)
            ->with(['scenario', 'feedback'])
            ->latest('id');

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $sessions = $query->paginate(15);

        return response()->json($sessions);
    }

    /**
     * Generate a dynamic workplace email writing scenario for the student.
     */
    public function generateDynamicEmail(Request $request): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $validated = $request->validate([
            'difficulty' => 'nullable|string|in:BEGINNER,INTERMEDIATE,ADVANCED',
            'domain' => 'nullable|string|max:100',
        ]);

        $difficulty = $validated['difficulty'] ?? 'INTERMEDIATE';
        $domain = $validated['domain'] ?? null;

        $scenario = $this->topicGeneratorService->generateForStudent($student, $difficulty, $domain);
        $session = $this->coachService->startNewAttempt($student, $scenario->id);

        return response()->json([
            'message' => 'Dynamic professional email scenario generated successfully.',
            'scenario' => $scenario->toStudentArray(),
            'session' => $session->load(['scenario', 'feedback']),
        ], 201);
    }

    /**
     * Submit spoken audio recording and transcript for spoken delivery evaluation.
     */
    public function submitAudio(Request $request, int $id): JsonResponse
    {
        $student = $this->getAuthenticatedStudent($request);

        $session = CommunicationPracticeSession::where('student_id', $student->id)
            ->with('scenario')
            ->findOrFail($id);

        if ($request->has('telemetry')) {
            $rawTelemetry = $request->input('telemetry');
            if (is_string($rawTelemetry)) {
                $decoded = json_decode($rawTelemetry, true);
                $request->merge(['telemetry' => is_array($decoded) ? $decoded : []]);
            }
        } elseif ($request->has('telemetry_json') && is_string($request->input('telemetry_json'))) {
            $decoded = json_decode($request->input('telemetry_json'), true);
            if (is_array($decoded)) {
                $request->merge(['telemetry' => $decoded]);
            }
        }

        $request->validate([
            'audio' => 'nullable|file|max:25600', // 25MB max
            'transcript' => 'required|string',
            'telemetry' => 'nullable|array',
            'duration_seconds' => 'nullable|numeric|min:1',
        ]);

        $audioFile = $request->file('audio');
        $transcript = $request->input('transcript');
        $telemetry = $request->input('telemetry', []);

        if ($request->has('duration_seconds') && !isset($telemetry['duration_seconds'])) {
            $telemetry['duration_seconds'] = (float) $request->input('duration_seconds');
        }

        try {
            $result = $this->coachService->submitAudioAndEvaluate($session, $audioFile, $transcript, $telemetry);

            return response()->json([
                'message' => 'Spoken delivery evaluated successfully.',
                'session' => $result['session'],
                'feedback' => $result['feedback'],
            ]);
        } catch (EvaluationClaimConflictException $e) {
            return response()->json([
                'error' => 'EVALUATION_CLAIM_CONFLICT',
                'message' => $e->getMessage(),
            ], 409);
        } catch (InferenceTimeoutException $e) {
            return response()->json([
                'error' => 'INFERENCE_TIMEOUT',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 504);
        } catch (MalformedAiResponseException $e) {
            return response()->json([
                'error' => 'MALFORMED_AI_RESPONSE',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 502);
        } catch (AiServiceUnavailableException $e) {
            return response()->json([
                'error' => 'AI_SERVICE_UNAVAILABLE',
                'message' => $e->getMessage(),
                'can_retry' => true,
            ], 503);
        }
    }

    /**
     * Stream or download recorded audio for playback.
     */
    public function streamAudio(Request $request, int $id)
    {
        $student = $this->getAuthenticatedStudent($request);

        $session = CommunicationPracticeSession::where('student_id', $student->id)
            ->findOrFail($id);

        if (!$session->audio_storage_path || !Storage::disk('local')->exists($session->audio_storage_path)) {
            abort(404, "Recorded audio file not found.");
        }

        $mime = $session->audio_mime_type ?: 'audio/webm';
        $path = Storage::disk('local')->path($session->audio_storage_path);

        return response()->file($path, [
            'Content-Type' => $mime,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
