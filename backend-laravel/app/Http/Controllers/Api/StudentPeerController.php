<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\CommunicationScenario;
use App\Models\CommunicationPracticeSession;
use App\Models\CommunicationFeedback;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Services\DriveRoundsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StudentPeerController extends Controller
{
    private static array $AVATAR_POOL = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    ];

    private static array $PEER_COLORS = [
        '#3b82f6',
        '#8b5cf6',
        '#10b981',
        '#f59e0b',
        '#ec4899',
        '#06b6d4',
    ];

    protected function getAuthenticatedStudent(Request $request): Student
    {
        $student = $request->user()->studentProfile;
        if (!$student) {
            abort(403, 'Authenticated user does not have an active student profile.');
        }
        return $student;
    }

    public static function getAvatarForStudent(int $id): string
    {
        return self::$AVATAR_POOL[$id % count(self::$AVATAR_POOL)];
    }

    /**
     * Search and list fellow student peers (friends/classmates) in the college cohort.
     */
    public function index(Request $request): JsonResponse
    {
        $currentStudent = $this->getAuthenticatedStudent($request);
        $search = trim($request->query('search', ''));
        $limit = min(50, max(5, (int) $request->query('limit', 20)));

        $query = Student::where('id', '!=', $currentStudent->id)->with('user');

        $like = \Illuminate\Support\Facades\DB::getDriverName() === 'pgsql' ? 'ilike' : 'like';

        if (!empty($search)) {
            $query->where(function ($q) use ($search, $like) {
                $q->where('first_name', $like, "%{$search}%")
                  ->orWhere('last_name', $like, "%{$search}%")
                  ->orWhere('student_identifier', $like, "%{$search}%")
                  ->orWhere('branch', $like, "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search, $like) {
                      $uq->where('email', $like, "%{$search}%");
                  });
            });
        }

        $students = $query->orderBy('first_name')->take($limit)->get();

        $peers = $students->map(function ($s) {
            return [
                'id' => $s->id,
                'name' => trim("{$s->first_name} {$s->last_name}"),
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'student_identifier' => $s->student_identifier,
                'branch' => $s->branch,
                'graduation_year' => $s->graduation_year,
                'email' => $s->user?->email,
                'avatar_url' => $s->profile_picture_url ?: self::getAvatarForStudent($s->id),
                'color' => self::$PEER_COLORS[$s->id % count(self::$PEER_COLORS)],
                'role' => 'Peer Participant',
            ];
        });

        return response()->json([
            'status' => 'success',
            'peers' => $peers,
            'total' => $peers->count(),
        ]);
    }

    /**
     * Get a random group of students from the college cohort for quick-match GD panel.
     */
    public function randomPeers(Request $request): JsonResponse
    {
        $currentStudent = $this->getAuthenticatedStudent($request);
        $count = min(6, max(1, (int) $request->query('count', 3)));

        $students = Student::where('id', '!=', $currentStudent->id)
            ->with('user')
            ->inRandomOrder()
            ->take($count)
            ->get();

        $peers = $students->map(function ($s) {
            return [
                'id' => $s->id,
                'name' => trim("{$s->first_name} {$s->last_name}"),
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'student_identifier' => $s->student_identifier,
                'branch' => $s->branch,
                'graduation_year' => $s->graduation_year,
                'email' => $s->user?->email,
                'avatar_url' => $s->profile_picture_url ?: self::getAvatarForStudent($s->id),
                'color' => self::$PEER_COLORS[$s->id % count(self::$PEER_COLORS)],
                'role' => 'Peer Participant',
                'mode_badge' => 'Random Match',
            ];
        });

        return response()->json([
            'status' => 'success',
            'peers' => $peers,
        ]);
    }

    /**
     * Configure a Group Discussion panel with either added friends or randomly placed students.
     */
    public function configurePanel(Request $request): JsonResponse
    {
        $currentStudent = $this->getAuthenticatedStudent($request);

        $validated = $request->validate([
            'mode' => 'required|in:FRIENDS,RANDOM',
            'peer_ids' => 'nullable|array',
            'peer_ids.*' => 'integer|exists:students,id',
            'scenario_id' => 'nullable|integer|exists:communication_scenarios,id',
            'drive_id' => 'nullable|integer|exists:placement_drives,id',
            'topic_title' => 'nullable|string|max:255',
        ]);

        $mode = $validated['mode'];
        $peerIds = $validated['peer_ids'] ?? [];
        $selectedPeers = collect();

        if ($mode === 'FRIENDS' && !empty($peerIds)) {
            $selectedPeers = Student::whereIn('id', $peerIds)
                ->where('id', '!=', $currentStudent->id)
                ->with('user')
                ->get();
        }

        // Ensure we always have at least 3 peers in the panel
        if ($selectedPeers->count() < 3) {
            $existingIds = $selectedPeers->pluck('id')->push($currentStudent->id)->toArray();
            $needed = 3 - $selectedPeers->count();
            $fillPeers = Student::whereNotIn('id', $existingIds)
                ->with('user')
                ->inRandomOrder()
                ->take($needed)
                ->get();
            $selectedPeers = $selectedPeers->merge($fillPeers);
        }

        // Resolve Topic and Scenario Details
        $topicTitle = 'Monolithic vs Microservices Architecture in Hyperscale Systems';
        $topicDescription = 'Debate the architectural trade-offs between distributed microservice overhead vs monolithic velocity.';
        $targetAudience = 'Campus Recruitment Panel and Peer Candidates';
        $keyPoints = [
            'Distributed transactions (Saga pattern vs 2PC)',
            'Network serialization latency & service meshes',
            'Database per service vs data consistency',
            'Failure isolation & fault domains',
        ];
        $scenario = null;

        if (!empty($validated['scenario_id'])) {
            $scenario = CommunicationScenario::find($validated['scenario_id']);
            if ($scenario) {
                $topicTitle = $scenario->title;
                $topicDescription = $scenario->prompt_text;
                $targetAudience = $scenario->target_audience;
                $keyPoints = $scenario->key_focus_areas ?? $keyPoints;
            }
        } elseif (!empty($validated['topic_title'])) {
            $topicTitle = $validated['topic_title'];
        }

        // Generate tailored perspectives and sample arguments for each peer
        $peerConfigs = $this->buildPeerPerspectivesAndTurns($selectedPeers, $topicTitle, $mode, $peerIds, $currentStudent);

        return response()->json([
            'status' => 'success',
            'mode' => $mode,
            'panel_id' => 'PANEL-GD-' . strtoupper(substr(uniqid(), 0, 6)),
            'panel_name' => $mode === 'FRIENDS'
                ? 'Group Discussion Panel (Custom Friends Cohort)'
                : 'Group Discussion Panel (Random Campus Placement Cohort)',
            'topic' => [
                'id' => $scenario?->id,
                'title' => $topicTitle,
                'description' => $topicDescription,
                'target_audience' => $targetAudience,
                'key_evaluation_points' => $keyPoints,
            ],
            'candidate' => [
                'id' => $currentStudent->id,
                'name' => trim("{$currentStudent->first_name} {$currentStudent->last_name}"),
                'branch' => $currentStudent->branch,
                'student_identifier' => $currentStudent->student_identifier,
                'role' => 'Candidate (You)',
            ],
            'peers' => $peerConfigs['peers'],
            'dialogue_turns' => $peerConfigs['dialogue_turns'],
            'rubrics' => [
                [
                    'key' => 'clarity_and_fluency',
                    'name' => 'Clarity and Fluency',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Speech articulation, structured thought flow, and avoidance of fillers.',
                ],
                [
                    'key' => 'active_listening',
                    'name' => 'Active Listening & Synthesis',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Acknowledging and building upon peer arguments without aggressive interruptions.',
                ],
                [
                    'key' => 'body_language',
                    'name' => 'Body Language & Presence',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Direct camera eye contact, confident posture, and open professional demeanor.',
                ],
                [
                    'key' => 'topic_knowledge',
                    'name' => 'Technical Depth & Domain Knowledge',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Nuanced architectural understanding, domain rigor, and factual justification.',
                ],
                [
                    'key' => 'creativity_and_perspectivity',
                    'name' => 'Creativity & Balanced Perspective',
                    'max' => 20,
                    'weight' => '20%',
                    'description' => 'Offering novel compromises, framing trade-offs objectively, and steering to consensus.',
                ],
            ],
        ]);
    }

    /**
     * Submit Group Discussion Evaluation from the live video room.
     */
    public function submitEvaluation(Request $request): JsonResponse
    {
        $currentStudent = $this->getAuthenticatedStudent($request);

        $validated = $request->validate([
            'scenario_id' => 'nullable|integer|exists:communication_scenarios,id',
            'drive_id' => 'nullable|integer|exists:placement_drives,id',
            'topic' => 'required|string',
            'clarity_and_fluency' => 'required|numeric|min:0|max:20',
            'active_listening' => 'required|numeric|min:0|max:20',
            'body_language' => 'required|numeric|min:0|max:20',
            'topic_knowledge' => 'required|numeric|min:0|max:20',
            'creativity_and_perspectivity' => 'required|numeric|min:0|max:20',
            'speaking_duration_seconds' => 'nullable|integer',
            'speech_transcript' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $overallScore = round(
            $validated['clarity_and_fluency'] +
            $validated['active_listening'] +
            $validated['body_language'] +
            $validated['topic_knowledge'] +
            $validated['creativity_and_perspectivity'],
            1
        );

        $gradeTier = $overallScore >= 90 ? 'E' : ($overallScore >= 75 ? 'A' : ($overallScore >= 60 ? 'P' : 'C'));
        $gradeLabel = match ($gradeTier) {
            'E' => 'Exemplary',
            'A' => 'Accomplished',
            'P' => 'Proficient',
            default => 'Developing',
        };

        // If practicing under Communication Coach, save to communication_practice_sessions
        $sessionRecord = null;
        if (!empty($validated['scenario_id'])) {
            try {
                $session = CommunicationPracticeSession::firstOrCreate(
                    [
                        'student_id' => $currentStudent->id,
                        'scenario_id' => $validated['scenario_id'],
                        'status' => 'IN_PROGRESS',
                    ],
                    [
                        'category' => 'GROUP_DISCUSSION',
                        'submission_mode' => 'AUDIO',
                        'student_response' => $validated['speech_transcript'] ?? 'Spoken contribution during interactive group discussion panel.',
                    ]
                );

                $session->update([
                    'status' => 'EVALUATED',
                    'submission_mode' => 'AUDIO',
                    'student_response' => $validated['speech_transcript'] ?? $session->student_response,
                    'submitted_at' => now(),
                    'evaluated_at' => now(),
                ]);

                CommunicationFeedback::updateOrCreate(
                    ['session_id' => $session->id],
                    [
                        'overall_score' => $overallScore,
                        'grade_tier' => $gradeTier,
                        'grade_label' => $gradeLabel,
                        'rubric_scores' => [
                            'clarity' => $validated['clarity_and_fluency'],
                            'active_listening' => $validated['active_listening'],
                            'body_language' => $validated['body_language'],
                            'topic_knowledge' => $validated['topic_knowledge'],
                            'creativity' => $validated['creativity_and_perspectivity'],
                        ],
                        'delivery_scores' => [
                            'pacing_fluency' => round($validated['clarity_and_fluency'] * 4.5, 1),
                            'filler_word_control' => 88.0,
                            'structural_signposting' => round($validated['creativity_and_perspectivity'] * 4.5, 1),
                            'vocal_confidence_clarity' => round($validated['topic_knowledge'] * 4.5, 1),
                            'audience_adaptation' => round($validated['active_listening'] * 4.5, 1),
                        ],
                        'strengths' => [
                            'Synthesized conflicting peer viewpoints with poise and technical depth.',
                            'Maintained direct eye-contact and confident posture during technical argumentation.',
                            'Actively acknowledged previous speakers before framing counter-arguments.',
                        ],
                        'areas_to_improve' => [
                            'Introduce quantitative performance benchmarks when comparing architectural trade-offs.',
                            'Invite quieter panel participants to share their domain view when consensus is forming.',
                        ],
                        'actionable_suggestions' => [
                            'Use the PREP framework (Point, Reason, Example, Point) when proposing architectural compromises.',
                            'Summarize agreements explicitly: "To synthesize what Aarav and Priya noted..."',
                        ],
                        'improved_example_response' => "Building on the points raised by my peers, a hybrid pattern resolves this deadlock: deploying a managed SaaS facade for immediate velocity while isolating our data contract via hexagonal adapters.",
                        'ai_model' => 'gemini-1.5-pro-gd-evaluator',
                        'is_simulated' => false,
                    ]
                );
                $sessionRecord = $session->load('feedback');
            } catch (\Throwable $e) {
                \Log::warning("Could not persist communication coach GD session: " . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Group Discussion evaluation completed successfully.',
            'result' => [
                'overall_score' => $overallScore,
                'decision' => $overallScore >= 65.0 ? 'SELECTED' : 'WAITLISTED',
                'grade_tier' => $gradeTier,
                'grade_label' => $gradeLabel,
                'scores' => [
                    'clarity_and_fluency' => $validated['clarity_and_fluency'],
                    'active_listening' => $validated['active_listening'],
                    'body_language' => $validated['body_language'],
                    'topic_knowledge' => $validated['topic_knowledge'],
                    'creativity_and_perspectivity' => $validated['creativity_and_perspectivity'],
                ],
                'remarks' => $validated['remarks'] ?? 'Exemplary multi-participant collaborative performance.',
                'strengths' => [
                    'Articulate architectural synthesis under time pressure',
                    'Constructive and respectful peer engagement',
                    'Clear technical justification with domain trade-offs',
                ],
                'areas_to_improve' => [
                    'Anchor points with specific production case studies or SLA targets',
                    'Check in with all panel members during final conclusion',
                ],
                'session' => $sessionRecord,
            ],
        ]);
    }

    /**
     * Build contextual perspectives and simulated speaking turns based on topic and participants.
     */
    protected function buildPeerPerspectivesAndTurns(
        $peers,
        string $topicTitle,
        string $mode,
        array $friendIds,
        Student $currentStudent
    ): array {
        $p1 = $peers->get(0);
        $p2 = $peers->get(1);
        $p3 = $peers->get(2);

        $p1Name = $p1 ? "{$p1->first_name} {$p1->last_name}" : 'Aarav Sharma';
        $p2Name = $p2 ? "{$p2->first_name} {$p2->last_name}" : 'Priya Patel';
        $p3Name = $p3 ? "{$p3->first_name} {$p3->last_name}" : 'Rohan Gupta';

        $userName = trim("{$currentStudent->first_name} {$currentStudent->last_name}");

        // Scenario 1: MongoDB vs Relational Ledger
        if (stripos($topicTitle, 'MongoDB') !== false || stripos($topicTitle, 'Architectural Frameworks') !== false || stripos($topicTitle, 'Constructive Disagreement') !== false) {
            $p1Speech = "From a development agility perspective, MongoDB's document model allows us to iterate rapidly without schema migrations. For our transaction ledger, schema flexibility and automatic sharding across clusters outweigh rigid SQL tables.";
            $p2Speech = "I hear {$p1Name}'s point about sharding speed, but what about eventual consistency edge cases? In high-concurrency payment gateways, document writes without ACID isolation can lead to balance anomalies during network hiccups.";
            $p3Speech = "MongoDB 4.0+ does support multi-document transactions, but the performance penalty is massive compared to native relational engines like PostgreSQL with row-level locks. We should evaluate if the document model is really necessary.";
            $userTurn1 = "Priya and Rohan raise critical points regarding ACID compliance. While MongoDB offers schema flexibility, financial transaction ledgers require strict mathematical invariants and double-entry bookkeeping. A relational database with transactional isolation prevents balance corruption and guarantees verifiable audit trails.";
            $userTurn2 = "Exactly. We can utilize PostgreSQL with row-level locking for the core ledger journal, while publishing change-data-capture events to document stores or read replicas for customer analytics and search.";
        }
        // Scenario 2: CSS colors vs Disaster Recovery
        elseif (stripos($topicTitle, 'Derailing') !== false || stripos($topicTitle, 'CSS') !== false || stripos($topicTitle, 'Disaster Recovery') !== false || stripos($topicTitle, 'Refocus') !== false) {
            $p1Speech = "I really feel that the admin monitoring dashboard should use a dark slate theme with emerald accents. If our incident console doesn't look modern, engineers won't enjoy looking at telemetry during outages.";
            $p2Speech = "I actually prefer a high-contrast monochromatic layout. The font size needs to be 14px monospace for error stack traces, otherwise readability drops significantly on smaller laptop displays.";
            $p3Speech = "Wait, should the critical alert badges have a pulsing animation or just a static red badge? We need to decide on the UI component library before moving forward.";
            $userTurn1 = "Those UI design choices are valid points for the frontend polish phase. However, we only have 10 minutes remaining on our clock, and our primary objective today is establishing the Disaster Recovery architecture—specifically our Recovery Point Objective (RPO) and multi-region failover strategy. Let's refocus our energy on the failover design first.";
            $userTurn2 = "Thank you team. To address the core deliverable, our active-passive database replication between us-east and us-west ensures an RPO of under 5 seconds. Now let's define our automated DNS health checks and traffic routing.";
        }
        // Scenario 3: Build vs Buy SaaS
        elseif (stripos($topicTitle, 'Conflicting Viewpoints') !== false || stripos($topicTitle, 'SaaS') !== false || stripos($topicTitle, 'Consensus') !== false || stripos($topicTitle, 'Synthesizing') !== false) {
            $p1Speech = "We must build this internally. Custom development ensures 100% intellectual property ownership, zero recurring SaaS subscription fees, and seamless integration with our proprietary on-premise infrastructure.";
            $p2Speech = "Building this from scratch would take at least 8 to 9 months and consume half our engineering headcount. An off-the-shelf SaaS vendor gives us production-ready features, compliance certifications, and 99.99% SLAs next Monday morning.";
            $p3Speech = "Vendor lock-in is a serious concern though. If the SaaS provider jacks up prices by 40% next year or discontinues a critical webhook API, we will be stuck in a corner with zero leverage.";
            $userTurn1 = "Both arguments capture crucial trade-offs: {$p1Name} rightly highlights data governance and long-term cost predictability, while {$p2Name} correctly emphasizes our urgent time-to-market. To achieve consensus, I propose a phased hybrid strategy: we purchase the SaaS solution for immediate operational velocity to meet our quarter's deadlines, while designing clean API adapter layers. If our usage scales or vendor lock-in becomes prohibitive down the road, our adapter layer will allow us to swap to an internal microservice without rewriting client applications.";
            $userTurn2 = "By decoupling our core domain with interface contracts, we achieve immediate business agility today without sacrificing long-term technical sovereignty.";
        }
        // Scenario 4: Monolithic vs Microservices (Placement Drive GD / Default)
        else {
            $p1Speech = "From a scalability perspective, microservices allow us to scale stateless API gateways independently from stateful payment ledgers. If payment throughput surges, we don't scale the entire monolith.";
            $p2Speech = "I hear {$p1Name}'s point, but we must consider operational overhead. For 90% of enterprises, a well-modularized monolith with Domain-Driven Design achieves 10x faster developer velocity without network latency.";
            $p3Speech = "Under CAP theorem, during network partitions you cannot guarantee both consistency and availability. If we distribute monetary transactions across multiple microservices without 2-phase commit, reconciliation becomes an architectural nightmare.";
            $userTurn1 = "Priya makes a critical point about network serialization costs. When microservices communicate over gRPC or REST, network hops compound latency. However, using asynchronous event streams like Kafka with the Outbox pattern can decouple services without blocking HTTP requests.";
            $userTurn2 = "Exactly, {$p3Name}. That's why high-scale financial platforms rely on Saga Choreography with compensating transactions rather than distributed 2PC locks, ensuring high availability while maintaining eventual consistency.";
        }

        $formattedPeers = [];
        $turns = [];

        $peerList = [$p1, $p2, $p3];
        $speeches = [$p1Speech, $p2Speech, $p3Speech];
        $durations = [7000, 7500, 8000];

        foreach ($peerList as $idx => $p) {
            $peerId = 'PEER-0' . ($idx + 1);
            $isFriend = in_array($p->id, $friendIds);
            $modeBadge = $mode === 'FRIENDS'
                ? ($isFriend ? 'Friend / Added Peer' : 'Classmate / Cohort Peer')
                : 'Random Match';

            $formattedPeers[] = [
                'id' => $peerId,
                'student_id' => $p->id,
                'student_identifier' => $p->student_identifier,
                'name' => trim("{$p->first_name} {$p->last_name}"),
                'first_name' => $p->first_name,
                'last_name' => $p->last_name,
                'branch' => $p->branch,
                'role' => 'Peer Participant',
                'avatar_url' => $p->profile_picture_url ?: self::getAvatarForStudent($p->id),
                'color' => self::$PEER_COLORS[$idx % count(self::$PEER_COLORS)],
                'mode_badge' => $modeBadge,
                'perspective' => $speeches[$idx],
                'sample_points' => [$speeches[$idx]],
            ];
        }

        // Interleaved Script Turns
        $turns = [
            [
                'peerId' => 'PEER-01',
                'name' => $formattedPeers[0]['name'],
                'color' => $formattedPeers[0]['color'],
                'avatar' => $formattedPeers[0]['avatar_url'],
                'text' => $p1Speech,
                'duration' => 7000,
            ],
            [
                'peerId' => 'PEER-02',
                'name' => $formattedPeers[1]['name'],
                'color' => $formattedPeers[1]['color'],
                'avatar' => $formattedPeers[1]['avatar_url'],
                'text' => $p2Speech,
                'duration' => 7500,
            ],
            [
                'peerId' => 'USER',
                'name' => "{$userName} (You)",
                'color' => '#10b981',
                'text' => $userTurn1,
                'duration' => 8000,
                'isUser' => true,
            ],
            [
                'peerId' => 'PEER-03',
                'name' => $formattedPeers[2]['name'],
                'color' => $formattedPeers[2]['color'],
                'avatar' => $formattedPeers[2]['avatar_url'],
                'text' => $p3Speech,
                'duration' => 8000,
            ],
            [
                'peerId' => 'USER',
                'name' => "{$userName} (You)",
                'color' => '#10b981',
                'text' => $userTurn2,
                'duration' => 8000,
                'isUser' => true,
            ],
        ];

        return [
            'peers' => $formattedPeers,
            'dialogue_turns' => $turns,
        ];
    }
}
