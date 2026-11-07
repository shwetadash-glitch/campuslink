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

        $prompt = "You are an expert technical interviewer and university placement examination designer.\n"
            . "Generate {$count} structured interview questions for the role: '{$role}' (Difficulty: {$difficulty}, Type: {$interviewType}).\n"
            . ($contextSource ? "ROLE / SYLLABUS SPECIFICATION:\n{$contextSource}\n\n" : "")
            . "CRITICAL INSTRUCTIONS:\n"
            . "- Return a valid JSON object with key 'questions' containing an array of question objects.\n"
            . "- Distribute questions across appropriate stages: 'TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN'.\n"
            . "- For BEHAVIORAL questions: structure rubric around the STAR methodology (Situation, Task, Action, Result).\n"
            . "- For TECHNICAL questions: focus on conceptual depth, trade-offs, and failure recovery.\n"
            . "- Each question object must contain:\n"
            . "    'stage' ('TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN')\n"
            . "    'order_index' (integer 1..{$count})\n"
            . "    'category' (string, e.g. 'Database Internals', 'Team Collaboration')\n"
            . "    'question_text' (string, the interview question presented to the candidate)\n"
            . "    'expected_answer_points' (array of strings, key points candidate should articulate)\n"
            . "    'rubric' (object detailing evaluation criteria per dimension)\n"
            . "    'weight' (float, e.g. 1.0)\n";

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
            ]);

            $rawQuestions = [];
            if (is_array($response) && !empty($response['questions'])) {
                $rawQuestions = $response['questions'];
            } elseif (is_array($response) && isset($response[0]['question_text'])) {
                $rawQuestions = $response;
            } else {
                $rawQuestions = $this->generateDeterministicDraftQuestions($role, $difficulty, $count);
            }

            // Persist as quarantined draft questions under this AI interview
            $createdQuestions = [];
            foreach ($rawQuestions as $idx => $qData) {
                $created = AiInterviewQuestion::create([
                    'ai_interview_id' => $interview->id,
                    'stage' => $qData['stage'] ?? 'TECHNICAL',
                    'order_index' => (int) ($qData['order_index'] ?? ($idx + 1)),
                    'category' => $qData['category'] ?? 'Core Competencies',
                    'question_text' => $qData['question_text'],
                    'expected_answer_points' => $qData['expected_answer_points'] ?? [],
                    'rubric' => $qData['rubric'] ?? [],
                    'weight' => (float) ($qData['weight'] ?? 1.0),
                    'ai_generated' => true,
                    'ai_review_status' => 'PENDING_REVIEW', // Quarantined from candidate view
                ]);

                $createdQuestions[] = $created;
            }

            return [
                'status' => 'success',
                'is_simulated' => $isSimulated,
                'provider' => $providerName,
                'notice' => $isSimulated
                    ? '[SIMULATED_AI_MODE] Interview questions generated deterministically by MockAiProvider. Placement officer review required.'
                    : 'AI-generated interview questions stored in PENDING_REVIEW status for human officer review.',
                'questions_count' => count($createdQuestions),
                'draft_questions' => $createdQuestions,
            ];
        } catch (AiServiceUnavailableException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error("Failed to generate AI interview questions: " . $e->getMessage());
            throw new AiServiceUnavailableException("AI interview question service is temporarily offline.", 'generate', 30, $e);
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
