<?php

namespace App\Services\Interview;

use App\Services\AI\AiManager;
use App\Models\AiInterview;
use App\Models\AiInterviewQuestion;
use App\Models\User;
use App\Exceptions\AiServiceUnavailableException;
use Illuminate\Support\Facades\Log;

class AiInterviewQuestionGeneratorService
{
    protected AiManager $aiManager;

    public function __construct(AiManager $aiManager)
    {
        $this->aiManager = $aiManager;
    }

    /**
     * Generate structured multi-stage interview questions from target role, syllabus, or job requisition.
     * All generated questions are created with 'ai_generated' = true and 'ai_review_status' = 'PENDING_REVIEW'.
     * Quarantined from candidate visibility until an authorized placement officer reviews and approves them.
     */
    public function generateInterviewQuestions(
        AiInterview $interview,
        ?string $contextSource = null,
        int $count = 4
    ): array {
        $providerName = $this->aiManager->getProviderName();
        $isSimulated = ($providerName === 'mock');

        $role = $interview->target_role ?: 'Software Engineer';
        $difficulty = $interview->difficulty ?: 'MEDIUM';
        $interviewType = $interview->interview_type ?: 'TECHNICAL';

        // Extract company information if tied to a drive or job
        $companyName = $interview->job?->company?->name
            ?? $interview->placementDrive?->company?->name
            ?? null;

        // Extract required skills from Job Requirements
        $job = $interview->job ?: $interview->placementDrive?->job;
        $skillsList = [];
        if ($job) {
            $job->loadMissing('requirements.skill');
            foreach ($job->requirements as $req) {
                if ($req->skill) {
                    $prof = $req->required_proficiency instanceof \BackedEnum
                        ? $req->required_proficiency->value
                        : (string) $req->required_proficiency;
                    $skillsList[] = $req->skill->name . ($prof ? " (Required Level: {$prof})" : "") . ($req->is_mandatory ? " [Mandatory]" : "");
                }
            }
        }

        // Build prompt with rich context
        $prompt = "You are an expert technical interviewer and placement examination designer.\n"
            . "Generate {$count} original, challenging, and structured interview questions tailored specifically to the following specifications:\n\n"
            . "=== INTERVIEW SPECIFICATIONS ===\n"
            . "- Title: " . ($interview->title ?: 'Placement Interview') . "\n"
            . "- Target Job Role: {$role}\n"
            . ($companyName ? "- Hiring Company: {$companyName}\n" : "")
            . "- Difficulty Level: {$difficulty}\n"
            . "- Interview Type: {$interviewType}\n"
            . "- Duration: " . ($interview->duration_minutes ?: 30) . " minutes\n"
            . "- Total Questions Required: {$count}\n";

        if (!empty($skillsList)) {
            $prompt .= "- Required Skills & Technical Competencies:\n  * " . implode("\n  * ", $skillsList) . "\n";
        }

        if (!empty($interview->description)) {
            $prompt .= "- Interview Description / Focus:\n  {$interview->description}\n";
        }

        if ($contextSource) {
            $prompt .= "- Role / Syllabus Context Source:\n  {$contextSource}\n";
        }

        $prompt .= "\n=== CRITICAL GUIDELINES ===\n"
            . "1. Do NOT repeat generic questions. Tailor questions directly to the role '{$role}' and required skills.\n"
            . "2. Distribute questions logically across stages ('TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN').\n"
            . "3. For BEHAVIORAL questions: structure rubrics strictly around the STAR methodology (Situation, Task, Action, Result).\n"
            . "4. For TECHNICAL questions: probe deep conceptual understanding, failure modes, trade-offs, and practical edge cases.\n"
            . "5. Return a STRICT, valid JSON object with key 'questions' containing an array of question objects. Example schema:\n"
            . "{\n"
            . "  \"questions\": [\n"
            . "    {\n"
            . "      \"stage\": \"TECHNICAL\",\n"
            . "      \"order_index\": 1,\n"
            . "      \"category\": \"Database Architecture\",\n"
            . "      \"question_text\": \"Question text here...\",\n"
            . "      \"expected_answer_points\": [\"Point 1\", \"Point 2\", \"Point 3\"],\n"
            . "      \"rubric\": {\"technical_depth\": \"Evaluation guide...\", \"clarity\": \"Evaluation guide...\"},\n"
            . "      \"weight\": 1.0\n"
            . "    }\n"
            . "  ]\n"
            . "}\n";

        try {
            $response = $this->aiManager->generate($prompt, [
                'type' => 'object',
                'properties' => [
                    'questions' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'stage' => ['type' => 'string'],
                                'order_index' => ['type' => 'integer'],
                                'category' => ['type' => 'string'],
                                'question_text' => ['type' => 'string'],
                                'expected_answer_points' => ['type' => 'array'],
                                'rubric' => ['type' => 'object'],
                                'weight' => ['type' => 'number'],
                            ],
                            'required' => ['stage', 'question_text'],
                        ]
                    ]
                ],
                'required' => ['questions'],
            ], ['timeout' => 120]);

            $rawQuestions = [];
            if (is_array($response)) {
                if (!empty($response['questions']) && is_array($response['questions'])) {
                    $rawQuestions = $response['questions'];
                } elseif (!empty($response['interview_questions']) && is_array($response['interview_questions'])) {
                    $rawQuestions = $response['interview_questions'];
                } elseif (isset($response[0]) && is_array($response[0]) && (isset($response[0]['question_text']) || isset($response[0]['question']))) {
                    $rawQuestions = $response;
                }
            }

            // In live Ollama mode: NEVER silently return mock questions
            if (empty($rawQuestions)) {
                if ($isSimulated) {
                    $rawQuestions = $this->generateDeterministicDraftQuestions($role, $difficulty, $count);
                } else {
                    $rawSample = is_array($response) ? json_encode($response) : (string) $response;
                    throw new \RuntimeException(
                        "Ollama failed to return a valid 'questions' array. Response received: " . substr($rawSample, 0, 500)
                    );
                }
            }

            // Persist as quarantined draft questions under this AI interview
            $validStages = ['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN'];
            $createdQuestions = [];
            foreach ($rawQuestions as $idx => $qData) {
                $questionText = trim($qData['question_text'] ?? $qData['question'] ?? '');
                if (empty($questionText)) {
                    continue;
                }

                $stage = strtoupper(trim($qData['stage'] ?? ''));
                if (!in_array($stage, $validStages, true)) {
                    $stage = match ($interviewType) {
                        'BEHAVIORAL' => 'BEHAVIORAL',
                        'SYSTEM_DESIGN' => 'SYSTEM_DESIGN',
                        default => 'TECHNICAL',
                    };
                }

                $category = trim($qData['category'] ?? 'Core Competencies');
                $expectedPoints = is_array($qData['expected_answer_points'] ?? null)
                    ? $qData['expected_answer_points']
                    : (is_string($qData['expected_answer_points'] ?? null) ? [$qData['expected_answer_points']] : []);

                $rubric = is_array($qData['rubric'] ?? null) ? $qData['rubric'] : [];
                $weight = (float) ($qData['weight'] ?? 1.0);
                if ($weight <= 0) $weight = 1.0;

                $created = AiInterviewQuestion::create([
                    'ai_interview_id' => $interview->id,
                    'stage' => $stage,
                    'order_index' => (int) ($qData['order_index'] ?? ($idx + 1)),
                    'category' => $category,
                    'question_text' => $questionText,
                    'expected_answer_points' => $expectedPoints,
                    'rubric' => $rubric,
                    'weight' => $weight,
                    'ai_generated' => true,
                    'ai_review_status' => 'PENDING_REVIEW', // Quarantined from candidate view
                ]);

                $createdQuestions[] = $created;
            }

            if (empty($createdQuestions)) {
                throw new \RuntimeException("Ollama generated output but no questions had a valid 'question_text'.");
            }

            return [
                'status' => 'success',
                'is_simulated' => $isSimulated,
                'provider' => $providerName,
                'model' => $this->aiManager->getModelName(),
                'notice' => $isSimulated
                    ? '[SIMULATED_AI_MODE] Interview questions generated deterministically by MockAiProvider. Placement officer review required.'
                    : 'AI-generated interview questions dynamically created by Ollama (' . $this->aiManager->getModelName() . ') and stored in PENDING_REVIEW status for human officer review.',
                'questions_count' => count($createdQuestions),
                'draft_questions' => $createdQuestions,
            ];
        } catch (AiServiceUnavailableException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error("Failed to generate AI interview questions: " . $e->getMessage());
            if ($isSimulated) {
                $rawQuestions = $this->generateDeterministicDraftQuestions($role, $difficulty, $count);
                $createdQuestions = [];
                foreach ($rawQuestions as $idx => $qData) {
                    $createdQuestions[] = AiInterviewQuestion::create([
                        'ai_interview_id' => $interview->id,
                        'stage' => $qData['stage'] ?? 'TECHNICAL',
                        'order_index' => (int) ($qData['order_index'] ?? ($idx + 1)),
                        'category' => $qData['category'] ?? 'Core Competencies',
                        'question_text' => $qData['question_text'],
                        'expected_answer_points' => $qData['expected_answer_points'] ?? [],
                        'rubric' => $qData['rubric'] ?? [],
                        'weight' => (float) ($qData['weight'] ?? 1.0),
                        'ai_generated' => true,
                        'ai_review_status' => 'PENDING_REVIEW',
                    ]);
                }
                return [
                    'status' => 'success',
                    'is_simulated' => true,
                    'provider' => 'mock',
                    'notice' => '[SIMULATED_AI_MODE] Interview questions generated deterministically by MockAiProvider.',
                    'questions_count' => count($createdQuestions),
                    'draft_questions' => $createdQuestions,
                ];
            }
            throw new AiServiceUnavailableException("Ollama question generation failed: " . $e->getMessage(), 'generate', 30, $e);
        }
    }

    /**
     * Officer review & approval of an AI-generated draft question.
     */
    public function approveQuestion(AiInterviewQuestion $question, ?User $officerUser = null, ?array $overrides = null): AiInterviewQuestion
    {
        $updateData = [
            'ai_review_status' => 'APPROVED',
        ];

        if (!empty($overrides)) {
            if (isset($overrides['question_text'])) $updateData['question_text'] = $overrides['question_text'];
            if (isset($overrides['category'])) $updateData['category'] = $overrides['category'];
            if (isset($overrides['stage'])) $updateData['stage'] = $overrides['stage'];
            if (isset($overrides['weight'])) $updateData['weight'] = (float) $overrides['weight'];
            if (isset($overrides['expected_answer_points'])) $updateData['expected_answer_points'] = $overrides['expected_answer_points'];
            if (isset($overrides['rubric'])) $updateData['rubric'] = $overrides['rubric'];
        }

        $question->update($updateData);

        return $question;
    }

    /**
     * Deterministic drafts for mock/testing environments.
     */
    protected function generateDeterministicDraftQuestions(string $role, string $difficulty, int $count): array
    {
        return [
            [
                'stage' => 'TECHNICAL',
                'order_index' => 1,
                'category' => 'Database Architecture',
                'question_text' => 'How does PostgreSQL implement Multi-Version Concurrency Control (MVCC), and how does it prevent dirty reads without locking tables?',
                'expected_answer_points' => [
                    'Row versioning using xmin and xmax transaction IDs',
                    'Snapshot isolation where readers do not block writers',
                    'Vacuum process to reclaim dead row tuples'
                ],
                'rubric' => [
                    'technical_depth' => 'Explains xmin/xmax tuple headers and non-blocking reads',
                    'clarity' => 'Structured explanation of snapshot visibility'
                ],
                'weight' => 1.5,
            ],
            [
                'stage' => 'BEHAVIORAL',
                'order_index' => 2,
                'category' => 'Team Collaboration & STAR',
                'question_text' => 'Describe a scenario where you faced a production incident or tight deadline and had to prioritize conflicting technical tasks. (Use the STAR framework).',
                'expected_answer_points' => [
                    'Situation & Task clearly established',
                    'Prioritization framework and Action taken',
                    'Quantified Result and learnings'
                ],
                'rubric' => [
                    'star_alignment' => 'Follows Situation, Task, Action, Result methodology',
                    'composure' => 'Demonstrates structured prioritization under pressure'
                ],
                'weight' => 1.0,
            ],
            [
                'stage' => 'SYSTEM_DESIGN',
                'order_index' => 3,
                'category' => 'Distributed Scalability',
                'question_text' => 'Design an idempotent notification dispatch system that handles 10,000 alerts per second with at-least-once delivery semantics. How do you prevent duplicate alerts?',
                'expected_answer_points' => [
                    'Message queue with partitioning (e.g. Kafka or Redis)',
                    'Idempotency keys stored in distributed cache/database',
                    'Dead-letter queues for unprocessable messages'
                ],
                'rubric' => [
                    'problem_solving' => 'Addresses failure modes, network retries, and deduplication',
                    'scalability' => 'Horizontal scaling and partition strategy'
                ],
                'weight' => 1.5,
            ]
        ];
    }
}
