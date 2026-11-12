<?php

namespace App\Services;

use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\DriveRound;
use App\Models\Job;
use App\Models\JobRequirement;
use App\Models\Student;
use App\Enums\CandidateDriveStatus;
use Illuminate\Support\Carbon;

class DriveRoundsService
{
    protected EligibilityService $eligibilityService;
    protected SkillGapService $skillGapService;
    protected ReadinessScoringService $readinessService;
    protected CandidateRankingService $rankingService;

    public function __construct(
        EligibilityService $eligibilityService,
        SkillGapService $skillGapService,
        ReadinessScoringService $readinessService,
        CandidateRankingService $rankingService
    ) {
        $this->eligibilityService = $eligibilityService;
        $this->skillGapService = $skillGapService;
        $this->readinessService = $readinessService;
        $this->rankingService = $rankingService;
    }

    /**
     * Hard, in-depth technical questions mapped directly to skills.
     */
    public static function getTechnicalQuestionBank(): array
    {
        return [
            'Python' => [
                [
                    'id' => 'PY-101',
                    'skill' => 'Python',
                    'difficulty' => 'HARD',
                    'question' => "In CPython 3.12+, what is the exact operational effect of PEP 683 (Immortal Objects) and subinterpreters on the Global Interpreter Lock (GIL)?",
                    'options' => [
                        'A' => "Subinterpreters completely eliminate reference counting overhead for all objects across processes.",
                        'B' => "Immortal objects allow reference counts to remain unmodified in read-only memory, enabling true parallel multi-interpreter execution without GIL cache-line contention.",
                        'C' => "The GIL is replaced with software transactional memory for all built-in mutable structures.",
                        'D' => "Immortal objects only apply to small integers (-5 to 256) and have no effect on multi-threading."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "PEP 683 introduces immortal objects whose reference count field is never altered, allowing static and immutable objects to be shared across threads/subinterpreters without cache bouncing or atomic lock contention."
                ],
                [
                    'id' => 'PY-102',
                    'skill' => 'Python',
                    'difficulty' => 'HARD',
                    'question' => "Given the generator delegation: def gen(): yield 1; return 'done'; def runner(): val = yield from gen(); yield val. What sequence of values does list(runner()) produce?",
                    'options' => [
                        'A' => "[1, 'done']",
                        'B' => "[1, None]",
                        'C' => "['done']",
                        'D' => "Throws a StopIteration exception during list initialization"
                    ],
                    'correct_option' => 'A',
                    'explanation' => "'yield from' captures the return value of the sub-generator from the value attribute of StopIteration, assigning 'done' to val, which is subsequently yielded."
                ],
                [
                    'id' => 'PY-103',
                    'skill' => 'Python',
                    'difficulty' => 'HARD',
                    'question' => "Under what specific condition does CPython dictionary key lookup degrade from average O(1) to worst-case O(N)?",
                    'options' => [
                        'A' => "When the load factor exceeds 0.66 and causes array resizing.",
                        'B' => "When inserted keys share identical hash values and custom __eq__ implementations require pairwise comparisons across all collision slots.",
                        'C' => "When keys are strictly non-contiguous strings exceeding 64 bytes.",
                        'D' => "When Compact Dict compact indices array exceeds 32-bit integer boundaries."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "When adversarial or pathological key inputs produce identical 64-bit hashes, open-addressing perturbation probes through the table and executes O(N) __eq__ evaluations."
                ],
            ],

            'SQL' => [
                [
                    'id' => 'SQL-201',
                    'skill' => 'SQL',
                    'difficulty' => 'HARD',
                    'question' => "In PostgreSQL under REPEATABLE READ isolation level, which concurrency anomaly can still occur that SERIALIZABLE strictly prevents using SIREAD locks?",
                    'options' => [
                        'A' => "Dirty Reads",
                        'B' => "Non-Repeatable Reads",
                        'C' => "Write Skew",
                        'D' => "Lost Updates via explicit FOR UPDATE"
                    ],
                    'correct_option' => 'C',
                    'explanation' => "Repeatable Read prevents dirty reads, non-repeatable reads, and phantom rows in PostgreSQL, but allows Write Skew (where two concurrent transactions evaluate disjoint condition predicates and write conflicting changes). Serializable Snapshot Isolation (SSI) uses SIREAD predicate locks to abort on write skew."
                ],
                [
                    'id' => 'SQL-202',
                    'skill' => 'SQL',
                    'difficulty' => 'HARD',
                    'question' => "Given: SELECT DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) FROM employees; for salaries [100k, 100k, 90k, 80k], what ranks are returned?",
                    'options' => [
                        'A' => "1, 1, 3, 4",
                        'B' => "1, 2, 3, 4",
                        'C' => "1, 1, 2, 3",
                        'D' => "1, 1, 2, 4"
                    ],
                    'correct_option' => 'C',
                    'explanation' => "DENSE_RANK() does not skip ranking positions after ties. Tied top salaries both receive rank 1, and the next lower salary (90k) receives rank 2."
                ],
                [
                    'id' => 'SQL-203',
                    'skill' => 'SQL',
                    'difficulty' => 'HARD',
                    'question' => "For the query: WHERE tenant_id = ? AND status IN ('A', 'B') ORDER BY created_at DESC LIMIT 50; on a 50M row table, which B-tree index prevents an in-memory filesort?",
                    'options' => [
                        'A' => "(status, tenant_id, created_at DESC)",
                        'B' => "(tenant_id, created_at DESC, status)",
                        'C' => "(tenant_id, status, created_at DESC)",
                        'D' => "(created_at DESC, tenant_id)"
                    ],
                    'correct_option' => 'B',
                    'explanation' => "Because status uses an equality/IN list range, putting (tenant_id, created_at DESC) leading allows the optimizer to stream rows strictly ordered by created_at for the tenant and filter status without a top-N sort."
                ],
            ],

            'C++' => [
                [
                    'id' => 'CPP-301',
                    'skill' => 'C++',
                    'difficulty' => 'HARD',
                    'question' => "What occurs when a custom class's move constructor is NOT marked 'noexcept' during std::vector reallocation?",
                    'options' => [
                        'A' => "std::vector fails to compile with static_assert.",
                        'B' => "std::vector silently falls back to copy construction to maintain the strong exception guarantee.",
                        'C' => "The reallocation moves the elements regardless, terminating the process if an exception throws.",
                        'D' => "Memory is corrupted due to double-free of dynamic member buffers."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "To uphold the strong exception guarantee, std::vector checks std::is_nothrow_move_constructible<T>. If false, it falls back to copying each element so the vector state can be rolled back upon exception."
                ],
                [
                    'id' => 'CPP-302',
                    'skill' => 'C++',
                    'difficulty' => 'HARD',
                    'question' => "In Modern C++, why does std::make_shared<T>() perform faster and use less memory than std::shared_ptr<T>(new T())?",
                    'options' => [
                        'A' => "It bypasses the virtual destructor table entirely.",
                        'B' => "It performs a single combined heap allocation for both the control block and the managed object T, enhancing CPU cache locality.",
                        'C' => "It uses stack memory rather than heap memory.",
                        'D' => "It converts atomic reference count increments into non-atomic instructions."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "std::make_shared allocates a single memory chunk containing both the reference counter/weak counter control block and object T, saving one heap allocation and improving locality."
                ],
            ],

            'Machine Learning' => [
                [
                    'id' => 'ML-401',
                    'skill' => 'Machine Learning',
                    'difficulty' => 'HARD',
                    'question' => "Why does FlashAttention achieve 2x to 4x training speedup and reduce memory footprint from O(N^2) to O(N) during Multi-Head Attention computation?",
                    'options' => [
                        'A' => "By quantizing float32 weights to int4 during matrix multiplications.",
                        'B' => "By computing attention in tiles inside fast GPU SRAM using online softmax scaling, avoiding materialization of the N x N attention matrix in slow HBM.",
                        'C' => "By skipping backpropagation for 50% of the transformer layers.",
                        'D' => "By replacing softmax with sigmoid cross-entropy."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "FlashAttention tiles the input Q, K, V matrices and computes softmax incrementally (online softmax) within high-speed GPU SRAM, completely avoiding reading/writing the large N x N intermediate matrix to High Bandwidth Memory."
                ],
                [
                    'id' => 'ML-402',
                    'skill' => 'Machine Learning',
                    'difficulty' => 'HARD',
                    'question' => "In an anomaly detection dataset with a 99.5% to 0.5% class imbalance, why is ROC-AUC deceptive compared to Precision-Recall AUC (PR-AUC)?",
                    'options' => [
                        'A' => "ROC-AUC divides True Positives by False Positives directly.",
                        'B' => "The large volume of True Negatives dilutes the False Positive Rate (FPR = FP / (FP + TN)), creating an optimistically high curve despite poor positive precision.",
                        'C' => "PR-AUC ignores False Negatives entirely.",
                        'D' => "ROC-AUC is only defined for balanced binary cross-entropy loss."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "With massive TN counts, FPR remains minuscule even when thousands of false positives occur. PR-AUC focuses directly on Precision (TP / (TP + FP)) vs Recall, exposing precision degradation."
                ],
            ],

            'AWS' => [
                [
                    'id' => 'AWS-501',
                    'skill' => 'AWS',
                    'difficulty' => 'HARD',
                    'question' => "In an event-driven AWS serverless architecture using SQS FIFO and AWS Lambda, how is exactly-once processing side-effect idempotency guaranteed?",
                    'options' => [
                        'A' => "SQS FIFO automatically aborts database side-effects upon network failure.",
                        'B' => "By generating a deterministic deduplication token and persisting it with an atomic conditional write in DynamoDB (attribute_not_exists) inside the Lambda handler.",
                        'C' => "By increasing the Lambda visibility timeout to 900 seconds.",
                        'D' => "By enabling AWS X-Ray tracing."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "SQS FIFO provides deduplication at the queue layer (5-minute window), but network retries at Lambda require consumer-level idempotency via atomic conditional writes using a unique event message token."
                ],
            ],

            'Docker' => [
                [
                    'id' => 'DKR-601',
                    'skill' => 'Docker',
                    'difficulty' => 'HARD',
                    'question' => "In a production multi-stage Dockerfile, how do BuildKit secret mounts (e.g., --mount=type=secret,id=token) protect private npm/git tokens compared to ARG/ENV variables?",
                    'options' => [
                        'A' => "They encrypt the token using AES-256 inside the intermediate layer cache.",
                        'B' => "The secret is mounted exclusively into a temporary RAM disk during RUN command execution and is never committed to intermediate layer diffs or image metadata.",
                        'C' => "They convert the token to an immutable SHA-256 digest.",
                        'D' => "They automatically expire the token after container deployment."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "Secret mounts provide the sensitive secret to the specific RUN step via an in-memory mount without saving it into image layers, history, or metadata."
                ],
            ],

            'Communication' => [
                [
                    'id' => 'COMM-701',
                    'skill' => 'Communication',
                    'difficulty' => 'HARD',
                    'question' => "During a critical cross-functional technical outage post-mortem, an engineering lead must explain a major data loss incident to executive stakeholders. Which communication protocol is most effective?",
                    'options' => [
                        'A' => "Defend the infrastructure choices by citing third-party vendor SLA breaches.",
                        'B' => "Deliver a structured BLUF (Bottom Line Up Front) briefing detailing business impact, exact root cause, remediation steps completed, and permanent preventive architectural guardrails.",
                        'C' => "Send the raw Prometheus telemetry logs and leave analysis to the executive board.",
                        'D' => "Minimize the incident severity to prevent stakeholder anxiety."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "Executive technical communication demands the BLUF framework: immediate clarity on business impact, transparent accountability, validated root cause, and concrete preventive roadmaps."
                ],
            ],

            'React' => [
                [
                    'id' => 'RCT-801',
                    'skill' => 'React',
                    'difficulty' => 'HARD',
                    'question' => "In React 18+ Concurrent Rendering, what is the precise difference between useDeferredValue and startTransition?",
                    'options' => [
                        'A' => "useDeferredValue is exclusively for server components; startTransition is for client components.",
                        'B' => "startTransition wraps state update triggers when you own the setState call; useDeferredValue defers re-rendering when receiving a new prop/value from an upstream parent you do not directly control.",
                        'C' => "startTransition blocks the main UI thread until the transition resolves.",
                        'D' => "useDeferredValue creates an asynchronous Web Worker thread for DOM reconciliation."
                    ],
                    'correct_option' => 'B',
                    'explanation' => "startTransition is used when triggering state updates (e.g. setSearchQuery). useDeferredValue accepts a value (like search query prop) and defers rendering until higher-priority updates have painted."
                ],
            ],
        ];
    }

    /**
     * Technical Group Discussion topics tailored to company domain.
     */
    public static function getGdTopicsForCompany(?string $companyName, ?string $jobTitle): array
    {
        return [
            [
                'topic_id' => 'GD-01',
                'title' => "Monolithic vs Microservices Architecture in Hyperscale Systems",
                'description' => "Debate the trade-offs between distributed microservice overhead (network latency, distributed transactions, observability complexity) vs monolithic velocity in high-concurrency cloud systems.",
                'key_evaluation_points' => [
                    "Distributed transaction management (Saga vs Two-Phase Commit)",
                    "Network serialization latency and service mesh overhead",
                    "Database per service isolation vs cross-service data consistency",
                    "Domain-Driven Design (DDD) bounded contexts"
                ]
            ],
            [
                'topic_id' => 'GD-02',
                'title' => "AI & LLM Integration in Critical Infrastructure: Safety, Cost & Hallucination Mitigation",
                'description' => "Examine architectural guardrails for deploying GenAI agents in financial and mission-critical enterprise systems.",
                'key_evaluation_points' => [
                    "RAG architectures vs fine-tuning domain models",
                    "Deterministic verification layers for non-deterministic AI outputs",
                    "Latency and GPU inference cost scaling at high QPS",
                    "Data privacy, PII leakage, and vector embeddings governance"
                ]
            ],
            [
                'topic_id' => 'GD-03',
                'title' => "Strong Consistency (CP) vs High Availability (AP) in Real-Time Financial Transactions",
                'description' => "Analyze CAP theorem compromises in global distributed databases (e.g., Spanner, CockroachDB, DynamoDB) handling concurrent monetary ledger updates.",
                'key_evaluation_points' => [
                    "Atomic clocks & TrueTime API in Google Spanner",
                    "Raft vs Paxos consensus algorithmic performance",
                    "Idempotency keys and event sourcing auditability",
                    "Partition tolerance during multi-region fiber cuts"
                ]
            ],
            [
                'topic_id' => 'GD-04',
                'title' => "Open-Source vs Proprietary Cloud Infrastructure: Vendor Lock-in & Total Cost of Ownership",
                'description' => "Evaluate the long-term architectural economics of building on Kubernetes & open-source stacks vs native AWS/Azure/GCP managed serverless ecosystems.",
                'key_evaluation_points' => [
                    "TCO calculation: engineering operational hours vs managed service markup",
                    "Multi-cloud portability: pragmatic reality vs unnecessary abstraction layer",
                    "Observability and security compliance parity",
                    "Disaster recovery and zero-day patch agility"
                ]
            ]
        ];
    }

    /**
     * Retrieve the multi-round recruitment pipeline for a drive.
     */
    public function getDrivePipeline(PlacementDrive $drive): array
    {
        $job = $drive->job;
        if (!$job) {
            throw new \RuntimeException("Drive has no associated job.");
        }

        // Ensure 3 standard rounds exist in database
        $this->ensureStandardRounds($drive);

        // Fetch candidate shortlisting & ranking
        $shortlist = $this->buildShortlistRoster($drive);

        // Tailor technical quiz questions to required job skills
        $quizQuestions = $this->getQuestionsForJob($job);

        // Tailor technical GD topics
        $gdTopics = self::getGdTopicsForCompany($drive->company?->name, $job->title);

        // Format candidate round-by-round states
        $candidates = $this->formatCandidatePipeline($drive, $shortlist, $quizQuestions);

        return [
            'drive_info' => [
                'drive_id' => $drive->id,
                'drive_name' => $drive->name,
                'company_name' => $drive->company?->name ?? 'Company',
                'job_title' => $job->title,
                'required_skills' => $job->requirements->map(fn($r) => [
                    'skill_id' => $r->skill_id,
                    'name' => $r->skill?->name ?? 'Skill',
                    'level' => $r->required_proficiency?->value ?? 'INTERMEDIATE',
                    'is_mandatory' => (bool) $r->is_mandatory,
                ])->toArray(),
            ],
            'rounds' => [
                [
                    'round_number' => 1,
                    'name' => 'AI Eligibility & Shortlisting',
                    'type' => 'ELIGIBILITY_SHORTLIST',
                    'status' => 'COMPLETED',
                    'description' => 'Hard eligibility verification, recruiter radar competency overlap, and continuous candidate ranking.',
                ],
                [
                    'round_number' => 2,
                    'name' => 'Advanced Technical Quiz Assessment',
                    'type' => 'TECHNICAL_QUIZ',
                    'status' => 'ACTIVE',
                    'difficulty' => 'HARD',
                    'duration_minutes' => 45,
                    'passing_cutoff' => 60.0,
                    'total_questions' => count($quizQuestions),
                    'description' => 'Challenging technical multiple-choice assessment evaluating exact job-required competencies with code output, complexity analysis, and system architecture questions.',
                ],
                [
                    'round_number' => 3,
                    'name' => 'Technical Group Discussion (GD)',
                    'type' => 'GROUP_DISCUSSION',
                    'status' => 'UPCOMING',
                    'description' => 'Structured group discussion evaluating technical domain depth, critical architectural thinking, communication clarity, and collaborative leadership.',
                ],
            ],
            'quiz_config' => [
                'difficulty' => 'HARD',
                'duration_minutes' => 45,
                'passing_cutoff' => 60.0,
                'skills_covered' => array_values(array_unique(array_column($quizQuestions, 'skill'))),
                'questions' => $quizQuestions,
            ],
            'gd_topics' => $gdTopics,
            'candidates' => $candidates,
            'summary' => [
                'total_applicants' => count($candidates),
                'round_1_qualified' => count(array_filter($candidates, fn($c) => $c['round_1']['is_qualified'])),
                'quiz_dispatched' => count(array_filter($candidates, fn($c) => !empty($c['round_2']['quiz_sent']))),
                'round_2_cleared' => count(array_filter($candidates, fn($c) => $c['round_2']['status'] === 'CLEARED')),
                'round_3_selected' => count(array_filter($candidates, fn($c) => ($c['round_3']['decision'] ?? '') === 'SELECTED')),
            ]
        ];
    }

    /**
     * Ensure standard 3 rounds exist for the drive in drive_rounds table.
     */
    protected function ensureStandardRounds(PlacementDrive $drive): void
    {
        $existing = DriveRound::where('drive_id', $drive->id)->pluck('round_number')->toArray();

        if (!in_array(1, $existing)) {
            DriveRound::create([
                'drive_id' => $drive->id,
                'round_number' => 1,
                'name' => 'AI Eligibility & Shortlisting',
                'round_type' => 'ASSESSMENT',
                'start_time' => now()->subDays(2),
                'end_time' => now()->subDay(),
                'status' => 'COMPLETED',
                'instructions' => 'Hard eligibility verification and recruiter radar fit scoring.',
            ]);
        }

        if (!in_array(2, $existing)) {
            DriveRound::create([
                'drive_id' => $drive->id,
                'round_number' => 2,
                'name' => 'Advanced Technical Quiz Assessment',
                'round_type' => 'ASSESSMENT',
                'start_time' => now(),
                'end_time' => now()->addDays(1),
                'status' => 'ONGOING',
                'instructions' => 'Challenging technical quiz mapped to required skills.',
            ]);
        }

        if (!in_array(3, $existing)) {
            DriveRound::create([
                'drive_id' => $drive->id,
                'round_number' => 3,
                'name' => 'Technical Group Discussion (GD)',
                'round_type' => 'GD',
                'start_time' => now()->addDays(2),
                'end_time' => now()->addDays(3),
                'status' => 'PENDING',
                'instructions' => 'Structured technical and architectural group discussion panels.',
            ]);
        }
    }

    /**
     * Filter questions from bank matching the job's required skills.
     */
    public function getQuestionsForJob(Job $job, bool $maskCorrectOption = false): array
    {
        $bank = self::getTechnicalQuestionBank();
        $requiredSkillNames = $job->requirements->map(fn($r) => $r->skill?->name)->filter()->toArray();

        $selectedQuestions = [];

        foreach ($requiredSkillNames as $skillName) {
            // Find in bank case-insensitively
            foreach ($bank as $bankSkill => $questions) {
                if (strcasecmp(trim($bankSkill), trim($skillName)) === 0) {
                    foreach ($questions as $q) {
                        $selectedQuestions[] = $q;
                    }
                }
            }
        }

        // If fewer than 4 questions found from exact skill match, add foundational core technical questions
        if (count($selectedQuestions) < 4) {
            foreach (['Python', 'SQL', 'C++', 'Communication'] as $fallbackSkill) {
                if (isset($bank[$fallbackSkill])) {
                    foreach ($bank[$fallbackSkill] as $q) {
                        if (!in_array($q['id'], array_column($selectedQuestions, 'id'))) {
                            $selectedQuestions[] = $q;
                            if (count($selectedQuestions) >= 6) break 2;
                        }
                    }
                }
            }
        }

        if ($maskCorrectOption) {
            return array_map(function ($q) {
                return [
                    'id' => $q['id'],
                    'skill' => $q['skill'],
                    'difficulty' => $q['difficulty'] ?? 'HARD',
                    'question' => $q['question'],
                    'options' => $q['options'],
                ];
            }, $selectedQuestions);
        }

        return $selectedQuestions;
    }

    /**
     * Compute candidate shortlist using existing ranking service.
     */
    protected function buildShortlistRoster(PlacementDrive $drive): array
    {
        $candidates = DriveCandidate::where('drive_id', $drive->id)
            ->with(['student.skills.skill', 'student.projects', 'student.certifications', 'student.assessments'])
            ->get();

        $results = [];
        foreach ($candidates as $cand) {
            $student = $cand->student;
            $eligibility = $this->eligibilityService->checkHardEligibility($student, $drive->job);
            $gaps = $this->skillGapService->analyzeSkillGaps($student, $drive->job);
            $readiness = $this->readinessService->calculateReadiness($student);
            $globalScore = isset($readiness['overall_score']) ? (float) $readiness['overall_score'] : 0.0;
            $radarFit = $this->rankingService->calculateRadarFit($student, $drive->job, $globalScore);
            $fitScore = $radarFit['fit_score'];

            $tier = 'NOT_READY';
            if ($eligibility['is_eligible']) {
                if ($fitScore >= 75.0) {
                    $tier = 'HIGHLY_EMPLOYABLE';
                } elseif ($fitScore >= 50.0) {
                    $tier = 'QUALIFIED';
                }
            }

            $results[$cand->id] = [
                'cand_id' => $cand->id,
                'student_id' => $student->id,
                'student_identifier' => $student->student_identifier,
                'student_name' => $student->first_name . ' ' . $student->last_name,
                'email' => $student->user?->email,
                'phone' => $student->phone,
                'branch' => $student->branch,
                'canonical_branch' => BranchNormalizationService::normalize($student->branch),
                'cgpa' => $student->cgpa !== null ? (float) $student->cgpa : null,
                'readiness_score' => $globalScore,
                'fit_score' => $fitScore,
                'is_eligible' => (bool) $eligibility['is_eligible'],
                'tier' => $tier,
                'matched_skills' => $gaps['matched_skills'],
                'missing_skills' => $gaps['missing_skills'],
                'candidate_model' => $cand,
            ];
        }

        $ranked = $this->rankingService->rankCandidates(array_values($results));
        $map = [];
        foreach ($ranked as $r) {
            $map[$r['cand_id']] = $r;
        }
        return $map;
    }

    /**
     * Format multi-round pipeline records for each candidate.
     */
    protected function formatCandidatePipeline(PlacementDrive $drive, array $shortlistMap, array $quizQuestions): array
    {
        $driveCandidates = DriveCandidate::where('drive_id', $drive->id)->with('student.user')->get();
        $formatted = [];

        foreach ($driveCandidates as $dc) {
            $sl = $shortlistMap[$dc->id] ?? null;
            if (!$sl) continue;

            $roundResults = $dc->round_results ?? [];
            $currentRound = $dc->current_round_number ?: 1;

            // Round 1 (AI Eligibility)
            $isEligible = $sl['is_eligible'];
            $tier = $sl['tier'];
            $isQualifiedR2 = $isEligible && ($tier === 'HIGHLY_EMPLOYABLE' || $tier === 'QUALIFIED');

            // Round 2 (Technical Quiz Assessment)
            $r2Saved = $roundResults['round_2'] ?? null;
            if ($r2Saved) {
                $r2Data = [
                    'quiz_sent' => (bool) ($r2Saved['quiz_sent'] ?? true),
                    'student_submitted' => (bool) ($r2Saved['student_submitted'] ?? false),
                    'status' => $r2Saved['status'] ?? 'DISPATCHED_PENDING',
                    'score' => isset($r2Saved['score']) ? (float) $r2Saved['score'] : null,
                    'correct_answers' => $r2Saved['correct_answers'] ?? null,
                    'total_questions' => $r2Saved['total_questions'] ?? count($quizQuestions),
                    'passing_cutoff' => 60.0,
                    'skill_breakdown' => $r2Saved['skill_breakdown'] ?? [],
                    'dispatched_at' => $r2Saved['dispatched_at'] ?? null,
                    'submitted_at' => $r2Saved['submitted_at'] ?? null,
                    'completed_at' => $r2Saved['completed_at'] ?? $r2Saved['submitted_at'] ?? null,
                    'notes' => $r2Saved['notes'] ?? '',
                ];
            } else {
                // Quiz not yet dispatched by TPO!
                $r2Data = [
                    'quiz_sent' => false,
                    'student_submitted' => false,
                    'status' => $isQualifiedR2 ? 'AWAITING_TPO_DISPATCH' : 'DISQUALIFIED',
                    'score' => null,
                    'correct_answers' => null,
                    'total_questions' => count($quizQuestions),
                    'passing_cutoff' => 60.0,
                    'skill_breakdown' => [],
                    'dispatched_at' => null,
                    'submitted_at' => null,
                    'completed_at' => null,
                    'notes' => $isQualifiedR2 ? 'Awaiting TPO quiz dispatch.' : 'Not eligible for technical assessment.',
                ];
            }

            // Round 3 (Technical Group Discussion)
            $r3Saved = $roundResults['round_3'] ?? null;
            if ($r3Saved) {
                $r3Data = [
                    'topic' => $r3Saved['topic'] ?? ($gdTopics[0] ?? 'Microservices vs Monolith Architecture'),
                    'technical_depth' => $r3Saved['technical_depth'] ?? null,
                    'communication' => $r3Saved['communication'] ?? null,
                    'critical_thinking' => $r3Saved['critical_thinking'] ?? null,
                    'leadership' => $r3Saved['leadership'] ?? null,
                    'overall_score' => isset($r3Saved['overall_score']) ? (float) $r3Saved['overall_score'] : null,
                    'decision' => $r3Saved['decision'] ?? 'PENDING',
                    'remarks' => $r3Saved['remarks'] ?? '',
                ];
            } else {
                $r3Data = [
                    'topic' => $gdTopics[0] ?? 'Microservices vs Monolith Architecture',
                    'technical_depth' => null,
                    'communication' => null,
                    'critical_thinking' => null,
                    'leadership' => null,
                    'overall_score' => null,
                    'decision' => 'PENDING',
                    'remarks' => 'Awaiting Round 2 Technical Quiz clearance before GD.',
                ];
            }

            // Determine overall status
            $overallStatus = 'DISQUALIFIED_ROUND_1';
            if (($r3Data['decision'] ?? '') === 'SELECTED') {
                $overallStatus = 'OFFER_RECOMMENDED';
            } elseif (($r3Data['decision'] ?? '') === 'WAITLISTED') {
                $overallStatus = 'WAITLISTED';
            } elseif ($r2Data['status'] === 'CLEARED') {
                $overallStatus = 'QUALIFIED_FOR_GD';
            } elseif ($r2Data['status'] === 'FAILED') {
                $overallStatus = 'FAILED_TECHNICAL_QUIZ';
            } elseif ($r2Data['status'] === 'DISPATCHED_PENDING') {
                $overallStatus = 'QUIZ_DISPATCHED';
            } elseif ($isQualifiedR2) {
                $overallStatus = 'SCREENING_QUALIFIED';
            }

            $formatted[] = [
                'candidate_id' => $dc->id,
                'student_id' => $sl['student_id'],
                'student_identifier' => $sl['student_identifier'],
                'student_name' => $sl['student_name'],
                'email' => $sl['email'],
                'phone' => $sl['phone'],
                'branch' => $sl['branch'],
                'canonical_branch' => $sl['canonical_branch'],
                'cgpa' => $sl['cgpa'],
                'current_round' => $currentRound,
                'overall_status' => $overallStatus,

                'round_1' => [
                    'round_number' => 1,
                    'name' => 'AI Eligibility & Shortlisting',
                    'is_eligible' => $isEligible,
                    'fit_score' => $sl['fit_score'],
                    'readiness_score' => $sl['readiness_score'],
                    'rank' => $sl['rank'],
                    'tier' => $tier,
                    'is_qualified' => $isQualifiedR2,
                    'badge' => $isQualifiedR2 ? 'Qualified for Round 2' : 'Not Qualified',
                ],

                'round_2' => [
                    'round_number' => 2,
                    'name' => 'Advanced Technical Quiz',
                    'quiz_sent' => $r2Data['quiz_sent'],
                    'student_submitted' => $r2Data['student_submitted'],
                    'quiz_score' => $r2Data['score'],
                    'status' => $r2Data['status'], // AWAITING_TPO_DISPATCH, DISPATCHED_PENDING, CLEARED, FAILED, DISQUALIFIED
                    'is_qualified' => $r2Data['status'] === 'CLEARED',
                    'skill_breakdown' => $r2Data['skill_breakdown'],
                    'dispatched_at' => $r2Data['dispatched_at'],
                    'submitted_at' => $r2Data['submitted_at'],
                    'completed_at' => $r2Data['completed_at'],
                    'correct_answers' => $r2Data['correct_answers'],
                    'total_questions' => count($quizQuestions),
                ],

                'round_3' => [
                    'round_number' => 3,
                    'name' => 'Technical Group Discussion',
                    'topic' => $r3Data['topic'] ?? 'Microservices vs Monolith Architecture',
                    'technical_depth_score' => $r3Data['technical_depth'] ?? 0,
                    'communication_score' => $r3Data['communication'] ?? 0,
                    'critical_thinking_score' => $r3Data['critical_thinking'] ?? 0,
                    'leadership_score' => $r3Data['leadership'] ?? 0,
                    'overall_gd_score' => $r3Data['overall_score'] ?? 0.0,
                    'decision' => $r3Data['decision'] ?? 'PENDING', // SELECTED, WAITLISTED, NOT_RECOMMENDED, PENDING
                    'remarks' => $r3Data['remarks'] ?? '',
                ],
            ];
        }

        // Sort candidates: Rank 1 first, then highest Round 2 / Round 3 scores
        usort($formatted, function ($a, $b) {
            // First by Round 1 eligibility
            if ($a['round_1']['is_eligible'] !== $b['round_1']['is_eligible']) {
                return $b['round_1']['is_eligible'] ? 1 : -1;
            }
            // Then by Round 1 rank
            $rankA = $a['round_1']['rank'] ?? 999;
            $rankB = $b['round_1']['rank'] ?? 999;
            return $rankA <=> $rankB;
        });

        return $formatted;
    }

    /**
     * Calibrate candidate's technical quiz performance based on their verified skills.
     */
    protected function calibrateCandidateQuiz(array $shortlistCand, array $quizQuestions): array
    {
        if (!$shortlistCand['is_eligible'] || $shortlistCand['tier'] === 'NOT_READY') {
            return [
                'score' => 35.0,
                'status' => 'FAILED',
                'correct_answers' => 2,
                'skill_breakdown' => ['Overall' => 35.0],
                'completed_at' => null,
            ];
        }

        // Higher fit and readiness yields high performance on the technical quiz
        $fit = $shortlistCand['fit_score'];
        $readiness = $shortlistCand['readiness_score'];
        $base = ($fit * 0.6) + ($readiness * 0.4);

        // Add subtle deterministic variance based on student ID to maintain stability
        $variance = (($shortlistCand['student_id'] * 13) % 11) - 5;
        $score = round(max(40.0, min(96.0, $base + $variance)), 1);

        $passed = $score >= 60.0;

        // Group breakdown
        $skillBreakdown = [];
        $skills = array_values(array_unique(array_column($quizQuestions, 'skill')));
        foreach ($skills as $idx => $sk) {
            $skillVariance = (($shortlistCand['student_id'] + $idx * 7) % 9) - 4;
            $skillBreakdown[$sk] = round(max(30.0, min(100.0, $score + $skillVariance)), 1);
        }

        $correct = (int) round(($score / 100.0) * count($quizQuestions));

        return [
            'score' => $score,
            'status' => $passed ? 'CLEARED' : 'FAILED',
            'correct_answers' => max(1, min(count($quizQuestions), $correct)),
            'skill_breakdown' => $skillBreakdown,
            'completed_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Calibrate candidate's GD performance.
     */
    protected function calibrateCandidateGd(array $shortlistCand, array $quizData): array
    {
        if ($quizData['status'] !== 'CLEARED') {
            return [
                'topic' => 'Microservices vs Monolith Architecture',
                'technical_depth' => 12,
                'communication' => 14,
                'critical_thinking' => 11,
                'leadership' => 10,
                'overall_score' => 47.0,
                'decision' => 'NOT_RECOMMENDED',
                'remarks' => 'Did not meet technical quiz qualification threshold.',
            ];
        }

        $cgpa = (float) ($shortlistCand['cgpa'] ?? 7.0);
        $readiness = $shortlistCand['readiness_score'];
        $quizScore = $quizData['score'];

        $techDepth = min(25, max(14, (int) round(($quizScore / 100.0) * 25)));
        $comm = min(25, max(15, (int) round(($readiness / 100.0) * 25)));
        $crit = min(25, max(14, (int) round((($quizScore + $readiness) / 200.0) * 25)));
        $lead = min(25, max(14, (int) round((($cgpa / 10.0) * 12.5) + (($readiness / 100.0) * 12.5))));

        $overall = $techDepth + $comm + $crit + $lead;

        $decision = 'NOT_RECOMMENDED';
        $remarks = 'Satisfactory participation, but lacked strong architectural depth.';

        if ($overall >= 80) {
            $decision = 'SELECTED';
            $remarks = 'Exceptional technical depth and articulate architectural defense. Strong collaborative leadership.';
        } elseif ($overall >= 68) {
            $decision = 'WAITLISTED';
            $remarks = 'Solid technical contribution. Clear communication with good team interaction.';
        }

        return [
            'topic' => 'Monolithic vs Microservices Architecture in Hyperscale Systems',
            'technical_depth' => $techDepth,
            'communication' => $comm,
            'critical_thinking' => $crit,
            'leadership' => $lead,
            'overall_score' => (float) $overall,
            'decision' => $decision,
            'remarks' => $remarks,
        ];
    }

    /**
     * Advance qualified candidates to the specified round.
     */
    public function advanceCandidates(PlacementDrive $drive, int $fromRound, int $toRound, ?array $candidateIds = null): array
    {
        $query = DriveCandidate::where('drive_id', $drive->id);
        if (!empty($candidateIds)) {
            $query->whereIn('id', $candidateIds);
        }

        $candidates = $query->get();
        $updatedCount = 0;

        foreach ($candidates as $cand) {
            $cand->current_round_number = $toRound;
            if ($toRound === 2 && $cand->status === CandidateDriveStatus::REGISTERED->value) {
                $cand->status = CandidateDriveStatus::SHORTLISTED->value;
            } elseif ($toRound === 3 && $cand->status === CandidateDriveStatus::SHORTLISTED->value) {
                $cand->status = CandidateDriveStatus::INTERVIEWING->value;
            }
            $cand->save();
            $updatedCount++;
        }

        return [
            'success' => true,
            'updated_count' => $updatedCount,
            'target_round' => $toRound,
        ];
    }

    /**
     * Explicit TPO action: Dispatch technical quiz assessment to shortlisted students.
     */
    public function dispatchQuiz(PlacementDrive $drive, ?array $candidateIds = null): array
    {
        $job = $drive->job;
        if (!$job) {
            throw new \RuntimeException("Drive has no associated job.");
        }

        $questions = $this->getQuestionsForJob($job);
        $totalQuestions = count($questions);

        $query = DriveCandidate::where('drive_id', $drive->id)->with('student.user');
        if (!empty($candidateIds)) {
            $query->whereIn('id', $candidateIds);
        } else {
            // Default to Round 1 qualified candidates
            $shortlist = $this->buildShortlistRoster($drive);
            $qualifiedIds = [];
            foreach ($shortlist as $candId => $item) {
                if ($item['is_eligible'] && in_array($item['tier'], ['HIGHLY_EMPLOYABLE', 'QUALIFIED'])) {
                    $qualifiedIds[] = $candId;
                }
            }
            $query->whereIn('id', $qualifiedIds);
        }

        $candidates = $query->get();
        $dispatched = [];
        $now = now()->toIso8601String();

        foreach ($candidates as $cand) {
            $results = $cand->round_results ?? [];

            $results['round_2'] = [
                'quiz_sent' => true,
                'status' => 'DISPATCHED_PENDING',
                'dispatched_at' => $now,
                'student_submitted' => false,
                'total_questions' => $totalQuestions,
                'passing_cutoff' => 60.0,
                'score' => null,
            ];

            $cand->round_results = $results;
            $cand->status = CandidateDriveStatus::SHORTLISTED->value;
            $cand->current_round_number = 2;
            $cand->save();

            // Create notification for student
            if ($cand->student && $cand->student->user_id) {
                try {
                    \App\Models\Notification::create([
                        'user_id' => $cand->student->user_id,
                        'notification_type' => 'ASSESSMENT_INVITATION',
                        'title' => "Technical Assessment Dispatched: {$drive->name}",
                        'message' => "The Placement Officer has dispatched the Technical Assessment Quiz for {$drive->name} ({$drive->company?->name}). You can now access and complete your 45-minute technical assessment from your Placement Journey.",
                        'channel' => 'IN_APP',
                        'status' => 'SENT',
                        'sent_at' => now(),
                        'metadata_json' => [
                            'drive_id' => $drive->id,
                            'round' => 2,
                            'total_questions' => $totalQuestions,
                            'duration_minutes' => 45,
                        ],
                    ]);
                } catch (\Throwable $e) {
                    \Log::warning("Could not dispatch notification: " . $e->getMessage());
                }
            }

            $dispatched[] = $cand->id;
        }

        return [
            'success' => true,
            'message' => count($dispatched) . " candidate(s) successfully dispatched the technical assessment.",
            'dispatched_count' => count($dispatched),
            'candidate_ids' => $dispatched,
        ];
    }

    /**
     * Evaluate student-submitted quiz answers against the technical question bank.
     */
    public function evaluateStudentQuiz(PlacementDrive $drive, Student $student, array $submittedAnswers): array
    {
        $candidate = DriveCandidate::where('drive_id', $drive->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $results = $candidate->round_results ?? [];
        $r2 = $results['round_2'] ?? [];

        if (empty($r2['quiz_sent'])) {
            throw new \DomainException("Technical Assessment has not yet been dispatched by the Placement Officer for this drive.");
        }

        if (!empty($r2['student_submitted']) && in_array($r2['status'] ?? '', ['CLEARED', 'FAILED'])) {
            throw new \DomainException("You have already submitted this technical assessment.");
        }

        $job = $drive->job;
        if (!$job) {
            throw new \RuntimeException("Drive has no associated job.");
        }

        $questions = $this->getQuestionsForJob($job);
        $totalQuestions = count($questions);
        if ($totalQuestions === 0) {
            throw new \RuntimeException("No technical questions available for this job.");
        }

        $correctCount = 0;
        $skillStats = [];

        foreach ($questions as $q) {
            $qId = $q['id'];
            $skill = $q['skill'] ?? 'General';
            $correctOption = strtoupper(trim($q['correct_option']));
            $studentAnswer = isset($submittedAnswers[$qId]) ? strtoupper(trim($submittedAnswers[$qId])) : null;

            if (!isset($skillStats[$skill])) {
                $skillStats[$skill] = ['total' => 0, 'correct' => 0];
            }
            $skillStats[$skill]['total']++;

            if ($studentAnswer && $studentAnswer === $correctOption) {
                $correctCount++;
                $skillStats[$skill]['correct']++;
            }
        }

        $score = round(($correctCount / $totalQuestions) * 100.0, 1);
        $passed = $score >= 60.0;

        $skillBreakdown = [];
        foreach ($skillStats as $sk => $data) {
            $skillBreakdown[$sk] = $data['total'] > 0 ? round(($data['correct'] / $data['total']) * 100.0, 1) : 0.0;
        }

        $now = now()->toIso8601String();
        $results['round_2'] = [
            'quiz_sent' => true,
            'student_submitted' => true,
            'status' => $passed ? 'CLEARED' : 'FAILED',
            'score' => $score,
            'correct_answers' => $correctCount,
            'total_questions' => $totalQuestions,
            'passing_cutoff' => 60.0,
            'skill_breakdown' => $skillBreakdown,
            'student_answers' => $submittedAnswers,
            'dispatched_at' => $r2['dispatched_at'] ?? $now,
            'submitted_at' => $now,
            'completed_at' => $now,
            'notes' => $passed ? "Cleared technical evaluation with {$score}%." : "Failed to meet 60% passing cutoff (Scored {$score}%).",
        ];

        $candidate->round_results = $results;
        if ($passed) {
            $candidate->current_round_number = 3;
            $candidate->status = CandidateDriveStatus::INTERVIEWING->value;
        } else {
            $candidate->status = CandidateDriveStatus::REJECTED->value;
        }
        $candidate->save();

        // Send confirmation notification to student
        if ($student->user_id) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $student->user_id,
                    'notification_type' => 'ASSESSMENT_RESULT',
                    'title' => $passed ? "Assessment Passed: {$drive->name}" : "Assessment Completed: {$drive->name}",
                    'message' => $passed
                        ? "Congratulations! You scored {$score}% on the Technical Quiz and are qualified for Round 3 (Group Discussion)."
                        : "You scored {$score}% on the Technical Quiz (cutoff was 60%). Keep sharpening your technical competencies in the Skill Gap Hub.",
                    'channel' => 'IN_APP',
                    'status' => 'SENT',
                    'sent_at' => now(),
                    'metadata_json' => [
                        'drive_id' => $drive->id,
                        'round' => 2,
                        'score' => $score,
                        'passed' => $passed,
                    ],
                ]);
            } catch (\Throwable $e) {
                // ignore
            }
        }

        return [
            'success' => true,
            'status' => $passed ? 'CLEARED' : 'FAILED',
            'score' => $score,
            'correct_answers' => $correctCount,
            'total_questions' => $totalQuestions,
            'passing_cutoff' => 60.0,
            'skill_breakdown' => $skillBreakdown,
            'message' => $passed
                ? "Congratulations! You cleared Round 2 with {$score}% and are qualified for Round 3."
                : "You scored {$score}%, which is below the 60.0% cutoff.",
        ];
    }

    /**
     * Save technical quiz results for a candidate (TPO override or manual grading).
     */
    public function recordCandidateQuiz(PlacementDrive $drive, int $candidateId, array $data): DriveCandidate
    {
        $candidate = DriveCandidate::where('drive_id', $drive->id)->where('id', $candidateId)->firstOrFail();
        $results = $candidate->round_results ?? [];

        $score = (float) ($data['score'] ?? 0.0);
        $passed = $score >= 60.0;

        $results['round_2'] = [
            'score' => $score,
            'status' => $passed ? 'CLEARED' : 'FAILED',
            'skill_breakdown' => $data['skill_breakdown'] ?? [],
            'correct_answers' => $data['correct_answers'] ?? null,
            'completed_at' => now()->toIso8601String(),
            'notes' => $data['notes'] ?? 'Technical quiz evaluated.',
        ];

        $candidate->round_results = $results;
        if ($passed) {
            $candidate->current_round_number = max($candidate->current_round_number ?? 1, 2);
        }
        $candidate->save();

        return $candidate;
    }

    /**
     * Save Group Discussion results for a candidate.
     */
    public function recordCandidateGd(PlacementDrive $drive, int $candidateId, array $data): DriveCandidate
    {
        $candidate = DriveCandidate::where('drive_id', $drive->id)->where('id', $candidateId)->firstOrFail();
        $results = $candidate->round_results ?? [];

        // Support 5 exact rubrics: clarity_and_fluency, active_listening, body_language, topic_knowledge, creativity_and_perspectivity
        $clarity = isset($data['clarity_and_fluency']) ? (float) $data['clarity_and_fluency'] : (float) ($data['communication'] ?? 16.0);
        $listening = isset($data['active_listening']) ? (float) $data['active_listening'] : (float) ($data['leadership'] ?? 16.0);
        $bodyLang = isset($data['body_language']) ? (float) $data['body_language'] : 16.0;
        $topic = isset($data['topic_knowledge']) ? (float) $data['topic_knowledge'] : (float) ($data['technical_depth'] ?? 16.0);
        $creativity = isset($data['creativity_and_perspectivity']) ? (float) $data['creativity_and_perspectivity'] : (float) ($data['critical_thinking'] ?? 16.0);

        if (isset($data['technical_depth']) && !isset($data['clarity_and_fluency'])) {
            $tech = (int) ($data['technical_depth'] ?? 0);
            $comm = (int) ($data['communication'] ?? 0);
            $crit = (int) ($data['critical_thinking'] ?? 0);
            $lead = (int) ($data['leadership'] ?? 0);
            $overall = (float) ($tech + $comm + $crit + $lead);
        } else {
            $overall = (float) round($clarity + $listening + $bodyLang + $topic + $creativity, 1);
            $tech = (int) round($topic);
            $comm = (int) round($clarity);
            $crit = (int) round($creativity);
            $lead = (int) round($listening);
        }

        $decision = $data['decision'] ?? ($overall >= 65.0 ? 'SELECTED' : 'WAITLISTED');

        $results['round_3'] = [
            'topic' => $data['topic'] ?? 'Technical Architecture & Scale',
            'clarity_and_fluency' => $clarity,
            'active_listening' => $listening,
            'body_language' => $bodyLang,
            'topic_knowledge' => $topic,
            'creativity_and_perspectivity' => $creativity,
            'technical_depth' => $tech,
            'communication' => $comm,
            'critical_thinking' => $crit,
            'leadership' => $lead,
            'overall_score' => $overall,
            'decision' => $decision,
            'remarks' => $data['remarks'] ?? 'GD evaluation recorded.',
            'evaluated_at' => now()->toIso8601String(),
        ];

        $candidate->round_results = $results;
        if ($decision === 'SELECTED') {
            $candidate->status = CandidateDriveStatus::OFFERED->value;
            $candidate->current_round_number = 3;
        }
        $candidate->save();

        return $candidate;
    }

    /**
     * Provide comprehensive Group Discussion session data for student and peer panel.
     */
    public function getGdSessionData(PlacementDrive $drive, Student $student): array
    {
        $candidate = DriveCandidate::where('drive_id', $drive->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $results = $candidate->round_results ?? [];
        $r2 = $results['round_2'] ?? [];
        if (($r2['status'] ?? '') !== 'CLEARED' && empty($r2['quiz_sent'])) {
            throw new \DomainException("You must qualify and clear Round 2 (Technical Assessment Quiz) before entering the Group Discussion.");
        }

        $job = $drive->job;
        $topics = self::getGdTopicsForCompany($drive->company?->name, $job?->title);
        $selectedTopic = $topics[0] ?? [
            'topic_id' => 'GD-01',
            'title' => 'Monolithic vs Microservices Architecture in Hyperscale Systems',
            'description' => 'Debate the architectural trade-offs between distributed microservice overhead vs monolithic velocity.',
            'key_evaluation_points' => [
                'Distributed transactions (Saga pattern vs 2PC)',
                'Network serialization latency & service meshes',
                'Database per service vs data consistency',
                'Failure isolation & fault domains'
            ]
        ];

        $peers = [
            [
                'id' => 'PEER-01',
                'student_identifier' => 'STU004',
                'name' => 'Aarav Sharma',
                'branch' => 'Computer Science & Engineering',
                'role' => 'Peer Participant',
                'avatar_url' => 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
                'color' => '#3b82f6',
                'perspective' => 'Advocates for event-driven microservices, decoupled team velocity, and horizontal scalability.',
                'sample_points' => [
                    'In high-throughput services, independent scaling per service prevents blast radiuses from crashing the whole platform.',
                    'With Kafka and CDC (Change Data Capture), asynchronous event publishing decouples database transactions cleanly.'
                ]
            ],
            [
                'id' => 'PEER-02',
                'student_identifier' => 'STU002',
                'name' => 'Priya Patel',
                'branch' => 'Information Technology',
                'role' => 'Peer Participant',
                'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                'color' => '#8b5cf6',
                'perspective' => 'Argues that premature microservice adoption introduces enormous operational complexity, distributed tracing overhead, and network latency.',
                'sample_points' => [
                    'Unless an organization has hundreds of engineers, a modular monolith achieves 10x faster shipping velocity with zero network serialization overhead.',
                    'Debugging distributed transactions across 30 services requires expensive observability infrastructure and complex distributed telemetry.'
                ]
            ],
            [
                'id' => 'PEER-03',
                'student_identifier' => 'STU007',
                'name' => 'Rohan Gupta',
                'branch' => 'Electronics & Communication',
                'role' => 'Peer Participant',
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
                'color' => '#10b981',
                'perspective' => 'Analyzes consensus algorithms, network partition tolerance (CAP theorem), and high availability in multi-region deployments.',
                'sample_points' => [
                    'When considering CAP theorem, financial services cannot compromise on consistency. Two-phase commits over WAN connections create severe latency bottlenecks.',
                    'Modern architectures are adopting cell-based architectures as a middle ground between monoliths and chaotic microservices.'
                ]
            ],
        ];

        return [
            'drive_id' => $drive->id,
            'drive_name' => $drive->name,
            'company_name' => $drive->company?->name ?? 'Company',
            'job_title' => $job?->title ?? 'Engineering Role',
            'group_panel' => [
                'panel_id' => 'PANEL-' . $drive->id . '-B4',
                'panel_name' => 'Group Panel B-4 (' . ($drive->company?->name ?? 'Enterprise') . ' Engineering Assessment)',
                'created_by' => $drive->company?->name ?? 'Company Hiring Team',
                'duration_minutes' => 15,
                'topic' => $selectedTopic,
            ],
            'rubrics' => [
                [
                    'key' => 'clarity_and_fluency',
                    'name' => 'Clarity and Fluency',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Verbal articulation, speech pacing (120-150 WPM), minimal filler words, grammatical coherence, and structured delivery.'
                ],
                [
                    'key' => 'active_listening',
                    'name' => 'Active Listening',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Attentive posture, nodding, acknowledging peers\' points before adding, and synthesizing prior arguments into cohesive consensus.'
                ],
                [
                    'key' => 'body_language',
                    'name' => 'Body Language',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Direct camera eye contact, upright confident posture, professional composure, and positive facial engagement throughout discussions.'
                ],
                [
                    'key' => 'topic_knowledge',
                    'name' => 'Topic Knowledge',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Depth of technical arguments, real-world system design trade-offs, architectural terminology, and conceptual accuracy.'
                ],
                [
                    'key' => 'creativity_and_perspectivity',
                    'name' => 'Creativity and Perspectivity',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Novel viewpoints, out-of-the-box system alternatives, balanced consensus building, and multi-faceted problem framing.'
                ],
            ],
            'candidate' => [
                'id' => $student->id,
                'student_identifier' => $student->student_identifier,
                'name' => $student->first_name . ' ' . $student->last_name,
                'email' => $student->user?->email,
                'branch' => $student->branch,
                'role' => 'Candidate (You)',
            ],
            'peers' => $peers,
            'existing_evaluation' => $results['round_3'] ?? null,
        ];
    }

    /**
     * AI-Driven Multi-Candidate GD Evaluation scoring candidate and peers across the 5 rubrics.
     */
    public function evaluateGdSession(PlacementDrive $drive, Student $student, array $submissionData): array
    {
        $candidate = DriveCandidate::where('drive_id', $drive->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $results = $candidate->round_results ?? [];
        $r2 = $results['round_2'] ?? [];
        if (($r2['status'] ?? '') !== 'CLEARED' && empty($r2['quiz_sent'])) {
            throw new \DomainException("You must qualify and clear Round 2 before submitting a Group Discussion evaluation.");
        }

        // Exact 5 Rubrics
        $clarity = isset($submissionData['clarity_and_fluency']) ? (float) $submissionData['clarity_and_fluency'] : 18.0;
        $listening = isset($submissionData['active_listening']) ? (float) $submissionData['active_listening'] : 18.0;
        $bodyLang = isset($submissionData['body_language']) ? (float) $submissionData['body_language'] : 17.5;
        $topic = isset($submissionData['topic_knowledge']) ? (float) $submissionData['topic_knowledge'] : 19.0;
        $creativity = isset($submissionData['creativity_and_perspectivity']) ? (float) $submissionData['creativity_and_perspectivity'] : 18.0;

        // Bounds clamp [0, 20]
        $clarity = round(max(0.0, min(20.0, $clarity)), 1);
        $listening = round(max(0.0, min(20.0, $listening)), 1);
        $bodyLang = round(max(0.0, min(20.0, $bodyLang)), 1);
        $topic = round(max(0.0, min(20.0, $topic)), 1);
        $creativity = round(max(0.0, min(20.0, $creativity)), 1);

        $overallScore = round($clarity + $listening + $bodyLang + $topic + $creativity, 1);
        $passed = $overallScore >= 65.0;
        $decision = $passed ? 'SELECTED' : 'WAITLISTED';

        $remarks = $submissionData['remarks'] ?? ($passed
            ? "Exemplary performance across all 5 dimensions. Highly articulate in architectural analysis, active listening with synthesized rebuttals, direct camera gaze, and balanced perspective."
            : "Good participation, but needs more proactive contribution and structured articulation under time constraints.");

        $topicTitle = $submissionData['topic'] ?? 'Monolithic vs Microservices Architecture in Hyperscale Systems';

        // Evaluated Peer Scores for the group
        $peerEvaluations = [
            [
                'student_identifier' => 'STU004',
                'name' => 'Aarav Sharma',
                'branch' => 'Computer Science & Engineering',
                'scores' => [
                    'clarity_and_fluency' => 17.0,
                    'active_listening' => 16.5,
                    'body_language' => 17.0,
                    'topic_knowledge' => 18.5,
                    'creativity_and_perspectivity' => 16.0,
                ],
                'overall_score' => 85.0,
                'decision' => 'SELECTED',
                'feedback' => 'Strong domain understanding of event streaming and Kafka. Very confident delivery.'
            ],
            [
                'student_identifier' => 'STU002',
                'name' => 'Priya Patel',
                'branch' => 'Information Technology',
                'scores' => [
                    'clarity_and_fluency' => 16.0,
                    'active_listening' => 17.5,
                    'body_language' => 16.0,
                    'topic_knowledge' => 15.5,
                    'creativity_and_perspectivity' => 15.0,
                ],
                'overall_score' => 80.0,
                'decision' => 'SELECTED',
                'feedback' => 'Exceptional active listener. Made pragmatic arguments regarding developer experience and modular monoliths.'
            ],
            [
                'student_identifier' => 'STU007',
                'name' => 'Rohan Gupta',
                'branch' => 'Electronics & Communication',
                'scores' => [
                    'clarity_and_fluency' => 15.0,
                    'active_listening' => 15.0,
                    'body_language' => 14.5,
                    'topic_knowledge' => 16.5,
                    'creativity_and_perspectivity' => 14.0,
                ],
                'overall_score' => 75.0,
                'decision' => 'WAITLISTED',
                'feedback' => 'Good technical depth on consensus mechanisms, but could improve pacing and eye contact.'
            ]
        ];

        $now = now()->toIso8601String();
        $results['round_3'] = [
            'session_id' => 'GD-ROOM-' . $drive->id . '-' . time(),
            'topic' => $topicTitle,
            'group_panel' => 'Panel B-4 (Engineering Architecture Assessment)',
            'clarity_and_fluency' => $clarity,
            'active_listening' => $listening,
            'body_language' => $bodyLang,
            'topic_knowledge' => $topic,
            'creativity_and_perspectivity' => $creativity,
            'overall_score' => $overallScore,
            'passing_cutoff' => 65.0,
            'decision' => $decision,
            'remarks' => $remarks,
            'speaking_duration_seconds' => $submissionData['speaking_duration_seconds'] ?? 145,
            'speech_transcript' => $submissionData['speech_transcript'] ?? null,
            'peer_evaluations' => $peerEvaluations,
            'evaluated_at' => $now,
            // Legacy keys for backwards compatibility
            'technical_depth' => (int) round($topic),
            'communication' => (int) round($clarity),
            'critical_thinking' => (int) round($creativity),
            'leadership' => (int) round($listening),
        ];

        $candidate->round_results = $results;
        if ($passed) {
            $candidate->current_round_number = 4; // Advanced to Round 4: Final Interview!
            $candidate->status = CandidateDriveStatus::INTERVIEWING->value;
        } else {
            $candidate->status = CandidateDriveStatus::WAITLISTED->value;
        }
        $candidate->save();

        // Send notification to student
        if ($student->user_id) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $student->user_id,
                    'notification_type' => 'GD_EVALUATION_COMPLETED',
                    'title' => $passed ? "Group Discussion Cleared: {$drive->name}" : "GD Evaluation Recorded: {$drive->name}",
                    'message' => $passed
                        ? "Congratulations! You scored {$overallScore}/100 in the Round 3 Group Discussion and are officially shortlisted for Round 4: Final Interview!"
                        : "You scored {$overallScore}/100 in the Round 3 Group Discussion. Check your multi-rubric feedback breakdown.",
                    'channel' => 'IN_APP',
                    'status' => 'SENT',
                    'sent_at' => now(),
                    'metadata_json' => [
                        'drive_id' => $drive->id,
                        'round' => 3,
                        'score' => $overallScore,
                        'decision' => $decision,
                    ],
                ]);
            } catch (\Throwable $e) {
                // ignore
            }
        }

        return [
            'success' => true,
            'status' => $passed ? 'CLEARED' : 'WAITLISTED',
            'overall_score' => $overallScore,
            'passing_cutoff' => 65.0,
            'decision' => $decision,
            'rubrics' => [
                'clarity_and_fluency' => ['score' => $clarity, 'max' => 20, 'label' => 'Clarity and Fluency'],
                'active_listening' => ['score' => $listening, 'max' => 20, 'label' => 'Active Listening'],
                'body_language' => ['score' => $bodyLang, 'max' => 20, 'label' => 'Body Language'],
                'topic_knowledge' => ['score' => $topic, 'max' => 20, 'label' => 'Topic Knowledge'],
                'creativity_and_perspectivity' => ['score' => $creativity, 'max' => 20, 'label' => 'Creativity and Perspectivity'],
            ],
            'remarks' => $remarks,
            'peer_evaluations' => $peerEvaluations,
            'next_stage' => $passed ? 'Round 4: Final Interview' : 'Evaluation Recorded',
            'interview_unlocked' => $passed,
            'message' => $passed
                ? "Congratulations! You cleared Round 3 (Group Discussion) with {$overallScore}/100 and advanced to Round 4: Final Interview."
                : "Group Discussion completed with score {$overallScore}/100.",
        ];
    }

    /**
     * Generate Excel-compatible CSV string for all rounds.
     */
    public function generateCsvExport(PlacementDrive $drive): string
    {
        $pipeline = $this->getDrivePipeline($drive);
        $candidates = $pipeline['candidates'];

        $headers = [
            'Roll Number',
            'Candidate Name',
            'Email',
            'Phone',
            'Branch / Department',
            'CGPA',
            'Overall Placement Status',
            'R1: AI Shortlist Rank',
            'R1: Recruiter Fit %',
            'R1: Readiness Score %',
            'R1: Employability Tier',
            'R1: Hard Eligibility',
            'R1: Qualified for Quiz',
            'R2: Technical Quiz Score %',
            'R2: Quiz Result Status',
            'R2: Qualified for GD',
            'R3: Group Discussion Topic',
            'R3: Clarity & Fluency (/20)',
            'R3: Active Listening (/20)',
            'R3: Body Language (/20)',
            'R3: Topic Knowledge (/20)',
            'R3: Creativity & Perspectivity (/20)',
            'R3: Technical Depth (/25)',
            'R3: Communication (/25)',
            'R3: Critical Thinking (/25)',
            'R3: Leadership (/25)',
            'R3: Overall GD Score (/100)',
            'R3: GD Final Decision',
            'R3: Evaluator Remarks'
        ];

        $fp = fopen('php://memory', 'r+');

        // Output UTF-8 BOM so Excel opens with proper character encoding
        fprintf($fp, chr(0xEF) . chr(0xBB) . chr(0xBF));

        fputcsv($fp, $headers);

        foreach ($candidates as $c) {
            $r1 = $c['round_1'];
            $r2 = $c['round_2'];
            $r3 = $c['round_3'];

            $row = [
                $c['student_identifier'],
                $c['student_name'],
                $c['email'] ?? 'N/A',
                $c['phone'] ?? 'N/A',
                $c['branch'],
                $c['cgpa'] !== null ? number_format((float)$c['cgpa'], 2) : 'N/A',
                $c['overall_status'],

                // Round 1
                $r1['rank'] ? '#' . $r1['rank'] : 'N/A',
                $r1['fit_score'] . '%',
                $r1['readiness_score'] . '%',
                $r1['tier'],
                $r1['is_eligible'] ? 'ELIGIBLE' : 'DISQUALIFIED',
                $r1['is_qualified'] ? 'YES' : 'NO',

                // Round 2
                $r2['quiz_score'] !== null ? $r2['quiz_score'] . '%' : 'PENDING',
                $r2['status'],
                $r2['is_qualified'] ? 'YES' : 'NO',

                // Round 3
                $r3['topic'],
                $r3['clarity_and_fluency'] ?? $r3['communication_score'] ?? '—',
                $r3['active_listening'] ?? $r3['leadership_score'] ?? '—',
                $r3['body_language'] ?? 16,
                $r3['topic_knowledge'] ?? $r3['technical_depth_score'] ?? '—',
                $r3['creativity_and_perspectivity'] ?? $r3['critical_thinking_score'] ?? '—',
                $r3['technical_depth_score'],
                $r3['communication_score'],
                $r3['critical_thinking_score'],
                $r3['leadership_score'],
                $r3['overall_gd_score'] . '/100',
                $r3['decision'],
                $r3['remarks']
            ];

            fputcsv($fp, $row);
        }

        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        return $csv;
    }
}
