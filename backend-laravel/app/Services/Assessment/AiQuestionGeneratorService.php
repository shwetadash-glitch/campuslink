<?php

namespace App\Services\Assessment;

use App\Services\AI\AiManager;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\User;
use App\Exceptions\AiServiceUnavailableException;
use Illuminate\Support\Facades\Log;

class AiQuestionGeneratorService
{
    protected AiManager $aiManager;

    public function __construct(AiManager $aiManager)
    {
        $this->aiManager = $aiManager;
    }

    /**
     * Generate structured draft questions from a job description or technical syllabus.
     * Generates questions with 'ai_generated' = true and 'ai_review_status' = 'PENDING_REVIEW'.
     * Draft questions are NOT published to candidates until human officer reviews and approves them.
     */
    public function generateDraftQuestions(
        string $sourceText,
        string $questionType = 'MCQ',
        string $difficulty = 'MEDIUM',
        int $count = 3,
        ?int $questionBankId = null
    ): array {
        $providerName = $this->aiManager->getProviderName();
        $isSimulated = ($providerName === 'mock');

        $prompt = "You are a senior university examination architect and technical assessment creator.\n"
            . "Generate {$count} high-quality university examination questions based strictly on the following syllabus or job requisition.\n"
            . "SOURCE TEXT:\n{$sourceText}\n\n"
            . "SPECIFICATIONS:\n"
            . "- Question Type: {$questionType} (Options: MCQ, DESCRIPTIVE, PROGRAMMING, APTITUDE)\n"
            . "- Difficulty Level: {$difficulty} (EASY, MEDIUM, HARD)\n"
            . "- ACCURACY & FACTUAL RIGOR: The answer key must strictly adhere to authoritative engineering standards. For example: in PostgreSQL MVCC, the primary benefit is increased concurrency (readers do not block writers, and writers do not block readers; lock contention is minimized).\n"
            . "- CRITICAL REQUIREMENT: Return a valid JSON array of questions.\n"
            . "- Each question must contain: title, question_text, category, marks (e.g. 2.0), negative_marks (e.g. 0.5 for MCQ).\n"
            . "- For MCQ: include 'options' (array of {id: 'A', text: '...'}, {id: 'B', text: '...'}), 'correct_answer' (letter of correct option, e.g. 'B'), and 'explanation'. Ensure the correct_answer letter strictly matches the option with the factually correct statement.\n"
            . "- For PROGRAMMING: include 'programming_language', 'code_snippet' (starter function signature), and 'test_cases' (array of {input: '...', expected_output: '...', is_hidden: bool}).\n"
            . "- For DESCRIPTIVE: include 'rubric' (key points required for full marks) and 'correct_answer' (ideal model answer).\n";

        try {
            $response = $this->aiManager->generate($prompt, [
                'type' => 'object',
                'properties' => [
                    'questions' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'title' => ['type' => 'string'],
                                'category' => ['type' => 'string'],
                                'question_text' => ['type' => 'string'],
                                'type' => ['type' => 'string'],
                                'difficulty' => ['type' => 'string'],
                                'marks' => ['type' => 'number'],
                                'negative_marks' => ['type' => 'number'],
                                'options' => ['type' => 'array'],
                                'correct_answer' => ['type' => 'string'],
                                'test_cases' => ['type' => 'array'],
                                'rubric' => ['type' => 'object'],
                                'explanation' => ['type' => 'string'],
                            ],
                            'required' => ['title', 'question_text', 'correct_answer'],
                        ],
                    ],
                ],
                'required' => ['questions'],
            ]);

            $rawQuestions = [];
            if (is_array($response) && !empty($response['questions'])) {
                $rawQuestions = $response['questions'];
            } else {
                // Fallback deterministic draft generator for mock/testing
                $rawQuestions = $this->generateDeterministicDraftQuestions($sourceText, $questionType, $difficulty, $count);
            }

            // Persist as unapproved draft questions
            $draftQuestions = [];
            foreach ($rawQuestions as $qData) {
                $created = Question::create([
                    'question_bank_id' => $questionBankId,
                    'type' => $qData['type'] ?? $questionType,
                    'difficulty' => $qData['difficulty'] ?? $difficulty,
                    'category' => $qData['category'] ?? 'Core Competencies',
                    'title' => $qData['title'] ?? 'Generated Assessment Question',
                    'question_text' => $qData['question_text'],
                    'code_snippet' => $qData['code_snippet'] ?? null,
                    'programming_language' => $qData['programming_language'] ?? ($questionType === 'PROGRAMMING' ? 'php' : null),
                    'options' => $qData['options'] ?? null,
                    'correct_answer' => $qData['correct_answer'] ?? 'A',
                    'test_cases' => $qData['test_cases'] ?? null,
                    'rubric' => $qData['rubric'] ?? null,
                    'marks' => (float) ($qData['marks'] ?? ($questionType === 'PROGRAMMING' ? 10.0 : 2.0)),
                    'negative_marks' => (float) ($qData['negative_marks'] ?? ($questionType === 'MCQ' ? 0.5 : 0.0)),
                    'ai_generated' => true,
                    'ai_review_status' => 'PENDING_REVIEW', // MUST be approved before candidate visibility
                    'explanation' => $qData['explanation'] ?? null,
                ]);

                $draftQuestions[] = $created;
            }

            return [
                'status' => 'success',
                'is_simulated' => $isSimulated,
                'provider' => $providerName,
                'notice' => $isSimulated
                    ? '[SIMULATED_AI_DEVELOPMENT_MODE] Questions were generated deterministically by MockAiProvider. Human officer review and explicit approval required.'
                    : 'AI-generated question drafts stored for human review.',
                'questions_count' => count($draftQuestions),
                'draft_questions' => $draftQuestions,
            ];
        } catch (AiServiceUnavailableException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error("Failed to generate AI questions: " . $e->getMessage());
            throw new AiServiceUnavailableException("AI assessment question service is temporarily offline.", 'generate', 30, $e);
        }
    }

    /**
     * Approve a drafted question and make it available for assessment inclusion.
     */
    public function approveQuestion(Question $question, User $officerUser, ?array $overrides = null): Question
    {
        $updateData = [
            'ai_review_status' => 'APPROVED',
        ];

        if (!empty($overrides)) {
            if (isset($overrides['title'])) $updateData['title'] = $overrides['title'];
            if (isset($overrides['question_text'])) $updateData['question_text'] = $overrides['question_text'];
            if (isset($overrides['marks'])) $updateData['marks'] = (float) $overrides['marks'];
            if (isset($overrides['negative_marks'])) $updateData['negative_marks'] = (float) $overrides['negative_marks'];
            if (isset($overrides['correct_answer'])) $updateData['correct_answer'] = $overrides['correct_answer'];
            if (isset($overrides['options'])) $updateData['options'] = $overrides['options'];
            if (isset($overrides['test_cases'])) $updateData['test_cases'] = $overrides['test_cases'];
            if (isset($overrides['explanation'])) $updateData['explanation'] = $overrides['explanation'];
        }

        $question->update($updateData);

        return $question;
    }

    /**
     * Deterministic drafts for mock/testing environments.
     */
    protected function generateDeterministicDraftQuestions(string $sourceText, string $type, string $difficulty, int $count): array
    {
        $results = [];

        for ($i = 1; $i <= $count; $i++) {
            if ($type === 'MCQ' || $type === 'APTITUDE') {
                $results[] = [
                    'title' => "{$difficulty} {$type} Question {$i} on Architecture",
                    'category' => 'System Design & Distributed Data',
                    'question_text' => "Which concurrency control mechanism provides optimistic locking using version counters in relational databases?",
                    'type' => $type,
                    'difficulty' => $difficulty,
                    'marks' => 2.0,
                    'negative_marks' => 0.5,
                    'options' => [
                        ['id' => 'A', 'text' => 'Row-level lock with SELECT ... FOR UPDATE'],
                        ['id' => 'B', 'text' => 'Version / timestamp column checked during UPDATE ... WHERE version = expected'],
                        ['id' => 'C', 'text' => 'Table-level exclusive lock during transaction startup'],
                        ['id' => 'D', 'text' => 'Disabling foreign key constraints during batch inserts'],
                    ],
                    'correct_answer' => 'B',
                    'explanation' => 'Optimistic locking assumes low contention and validates record version column before committing changes.',
                ];
            } elseif ($type === 'PROGRAMMING') {
                $results[] = [
                    'title' => "Two Sum Problem {$i}",
                    'category' => 'Data Structures & Algorithms',
                    'question_text' => "Given two integers via standard input separated by a space, calculate and print their sum.",
                    'type' => 'PROGRAMMING',
                    'difficulty' => $difficulty,
                    'programming_language' => 'php',
                    'code_snippet' => "<?php\nfunction solve() {\n    // Read from standard input and print output\n}\n",
                    'marks' => 10.0,
                    'negative_marks' => 0.0,
                    'correct_answer' => "<?php \$line = trim(fgets(STDIN)); if(!\$line) exit; [\$a, \$b] = explode(' ', \$line); echo ((int)\$a + (int)\$b);",
                    'test_cases' => [
                        ['input' => '2 3', 'expected_output' => '5', 'is_hidden' => false],
                        ['input' => '10 20', 'expected_output' => '30', 'is_hidden' => false],
                        ['input' => '100 -50', 'expected_output' => '50', 'is_hidden' => true],
                        ['input' => '99999 1', 'expected_output' => '100000', 'is_hidden' => true],
                    ],
                    'explanation' => 'Linear integer addition via standard I/O parsing.',
                ];
            } else {
                // DESCRIPTIVE
                $results[] = [
                    'title' => "Database ACID Principles Question {$i}",
                    'category' => 'Database Internals',
                    'question_text' => "Explain the Isolation property in relational DBMS transactions. How does PostgreSQL implement repeatable read isolation levels?",
                    'type' => 'DESCRIPTIVE',
                    'difficulty' => $difficulty,
                    'marks' => 5.0,
                    'negative_marks' => 0.0,
                    'correct_answer' => "Isolation ensures uncommitted transaction operations are invisible to concurrent transactions. PostgreSQL achieves this via Multiversion Concurrency Control (MVCC) snapshots.",
                    'rubric' => [
                        'criteria' => [
                            ['name' => 'Definition of Isolation', 'points' => 2.0],
                            ['name' => 'Explanation of MVCC snapshots in PostgreSQL', 'points' => 3.0],
                        ],
                    ],
                    'explanation' => 'Assesses candidate understanding of transaction isolation levels and MVCC mechanics.',
                ];
            }
        }

        return $results;
    }
}
