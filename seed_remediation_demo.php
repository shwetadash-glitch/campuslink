<?php

require __DIR__ . '/backend-laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/backend-laravel/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Student;
use App\Models\Assessment;
use App\Models\Question;
use App\Models\AssessmentSession;
use App\Models\AssessmentAnswer;
use App\Models\AiInterview;
use App\Models\AiInterviewSession;
use App\Models\AiInterviewMessage;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\Company;
use App\Models\Job;
use Carbon\Carbon;

echo "Seeding Student Remediation & Performance Improvement Demo Data...\n";

$officer = User::where('role', 'PLACEMENT_OFFICER')->first() ?? User::where('role', 'SUPER_ADMIN')->first();

// 1. Assessment: Comprehensive Full-Stack & Core CS Technical Assessment
$assessment = Assessment::firstOrCreate(
    ['code' => 'CS-REMED-2026'],
    [
        'title' => 'Core Computer Science & Algorithms Screening 2026',
        'description' => 'Evaluates Data Structures, Algorithms complexity, and Quantitative Aptitude.',
        'assessment_type' => 'MIXED',
        'duration_minutes' => 60,
        'total_marks' => 100.0,
        'pass_percentage' => 70.0,
        'max_attempts' => 2,
        'created_by_user_id' => $officer->id,
        'status' => 'PUBLISHED',
        'published_at' => Carbon::now()->subDays(2),
        'metadata' => [
            'verification' => [
                'verified_by_name' => 'Placement Director Dr. Sharma',
                'verified_at' => Carbon::now()->subDays(2)->toIso8601String(),
            ]
        ]
    ]
);

// Ensure questions exist
if ($assessment->questions()->count() === 0) {
    $q1 = Question::create([
        'title' => 'Tree Traversals & Invariants',
        'question_text' => 'Which traversal sequence of a BST produces elements in strictly ascending order?',
        'type' => 'MCQ',
        'category' => 'Data Structures',
        'marks' => 30.0,
        'correct_answer' => 'A',
        'options' => [
            ['id' => 'A', 'text' => 'In-order Traversal (Left, Root, Right)'],
            ['id' => 'B', 'text' => 'Pre-order Traversal (Root, Left, Right)'],
            ['id' => 'C', 'text' => 'Post-order Traversal (Left, Right, Root)'],
        ],
    ]);

    $q2 = Question::create([
        'title' => 'Optimized Subarray Sum',
        'question_text' => 'Given an integer array nums, find the contiguous subarray with maximum sum in O(N) time.',
        'type' => 'PROGRAMMING',
        'category' => 'Algorithms',
        'programming_language' => 'php',
        'marks' => 30.0,
        'test_cases' => [
            ['input' => '[-2,1,-3,4,-1,2,1,-5,4]', 'expected_output' => '6', 'is_hidden' => false],
            ['input' => '[5,4,-1,7,8]', 'expected_output' => '23', 'is_hidden' => true],
        ],
    ]);

    $q3 = Question::create([
        'title' => 'Probability & Combinatorics',
        'question_text' => 'From a pack of 52 cards, two cards are drawn. What is the probability that both are aces?',
        'type' => 'APTITUDE',
        'category' => 'Aptitude',
        'marks' => 40.0,
        'correct_answer' => 'B',
        'options' => [
            ['id' => 'A', 'text' => '1/169'],
            ['id' => 'B', 'text' => '1/221'],
            ['id' => 'C', 'text' => '1/52'],
        ],
    ]);

    $assessment->questions()->attach($q1->id, ['order_index' => 1, 'marks' => 30.0, 'negative_marks' => 0.0]);
    $assessment->questions()->attach($q2->id, ['order_index' => 2, 'marks' => 30.0, 'negative_marks' => 0.0]);
    $assessment->questions()->attach($q3->id, ['order_index' => 3, 'marks' => 40.0, 'negative_marks' => 0.0]);
}

// 2. AI Interview: AI Technical & Behavioral Mock Interview 2026
$aiInterview = AiInterview::firstOrCreate(
    ['code' => 'AI-MOCK-REMED-2026'],
    [
        'title' => 'Full-Stack Software Engineer Placement Mock Interview',
        'description' => 'Comprehensive multi-turn technical, architectural, and STAR behavioral interview.',
        'target_role' => 'Full-Stack Software Engineer',
        'interview_type' => 'MIXED',
        'difficulty' => 'MEDIUM',
        'duration_minutes' => 30,
        'pass_percentage' => 70.0,
        'created_by_user_id' => $officer->id,
        'status' => 'PUBLISHED',
    ]
);

// 3. Placement Drive
$company = Company::first() ?? Company::create(['name' => 'Acme Cloud Systems']);
$drive = PlacementDrive::first() ?? PlacementDrive::create([
    'company_id' => $company->id,
    'name' => 'Acme Campus Recruitment Drive 2026',
    'status' => 'IN_PROGRESS',
    'created_by_user_id' => $officer->id,
]);

$allStudents = Student::take(10)->get();

foreach ($allStudents as $student) {
    // A. Assessment Session (Score < Cutoff to trigger Remediation UI)
    $evalSummary = [
        'total_score' => 42.0,
        'total_possible' => 100.0,
        'earned_percentage' => 42.0,
        'pass_percentage_required' => 70.0,
        'passed' => false,
        'categories' => [
            'Data Structures' => ['earned' => 10.0, 'possible' => 30.0],
            'Algorithms' => ['earned' => 12.0, 'possible' => 30.0],
            'Aptitude' => ['earned' => 20.0, 'possible' => 40.0],
        ],
        'improvement_roadmap' => [
            'critical_focus_areas' => [
                [
                    'category' => 'Data Structures',
                    'earned_percentage' => 33.3,
                    'missed_concepts' => ['Tree Traversals', 'Hash Collisions', 'Binary Search Trees'],
                    'recommended_action' => 'Review binary search tree invariants and implement hash map bucket collision handling.',
                ],
                [
                    'category' => 'Algorithms',
                    'earned_percentage' => 40.0,
                    'missed_concepts' => ['Two Pointers', 'Time Complexity Optimization', 'Sliding Window'],
                    'recommended_action' => 'Practice reducing nested loop solutions from O(N^2) to O(N log N) using sliding window and two-pointer techniques.',
                ],
            ],
            'code_diagnostics' => [
                [
                    'question_title' => 'Optimized Subarray Sum',
                    'failure_reason' => 'TIMEOUT_TLE',
                    'guidance' => 'Your solution timed out on inputs with N > 100,000. Consider using Kadane\'s algorithm or sliding window technique instead of quadratic nested iterations.',
                ],
            ],
            'can_reattempt' => true,
            'reattempt_cooldown_hours' => 24,
        ],
        'evaluated_at' => Carbon::now()->subHours(2)->toIso8601String(),
    ];

    AssessmentSession::updateOrCreate(
        ['assessment_id' => $assessment->id, 'student_id' => $student->id, 'attempt_number' => 1],
        [
            'status' => 'EVALUATED',
            'started_at' => Carbon::now()->subHours(3),
            'expires_at' => Carbon::now()->subHours(2),
            'submitted_at' => Carbon::now()->subHours(2),
            'total_score' => 42.0,
            'passed' => false,
            'evaluation_summary' => $evalSummary,
        ]
    );

    // B. AI Interview Session (Evaluation with Actionable Growth Plan & Exemplar Refinement)
    $aiEvalSummary = [
        'overall_assessment' => 'Candidate displayed basic programming awareness but struggled under behavioral and system-design follow-up probes.',
        'strengths' => [
            'Clear syntax explanation in initial problem',
            'Demonstrated understanding of RESTful API contracts'
        ],
        'weaknesses' => [
            'Did not follow the STAR method for behavioral queries',
            'Failed to address database sharding and Redis caching under scale'
        ],
        'quote_evidence' => [
            'I helped my team build a website and it worked well.'
        ],
        'recommendation' => 'NO_HIRE',
        'actionable_growth_plan' => [
            'priority_level' => 'HIGH',
            'rubric_dimension_targets' => [
                [
                    'dimension' => 'behavioral_star_alignment',
                    'current_score' => 45,
                    'target_score' => 75,
                    'issue' => 'Answers lacked quantifiable business outcomes and specific actions taken.',
                    'action_step' => 'Structure every narrative around: Situation (15%), Task (15%), Action (50%), Result (20%). Explicitly cite numeric impact.',
                    'coach_scenario_id' => 'hr_star_behavioral_mastery',
                    'deep_link' => '/dashboard/communication-coach',
                ],
                [
                    'dimension' => 'technical_depth',
                    'current_score' => 50,
                    'target_score' => 75,
                    'issue' => 'Did not explore failure modes or caching strategies when prompted for system scale.',
                    'action_step' => 'Review Redis caching patterns (Cache-Aside, Write-Through) and database read-replicas.',
                    'practice_topic' => 'System Design: Scalable Read-Heavy Architectures',
                ],
            ],
            'exemplar_refinements' => [
                [
                    'candidate_quote' => 'I helped my team build a website and it worked well.',
                    'improved_exemplar' => 'In our final year project (Situation), our registration portal suffered 5-second latency (Task). I refactored the SQL queries and added Redis caching for user sessions (Action), which decreased page load latency by 68% and supported 1,200 concurrent users without timeouts (Result).',
                ]
            ],
        ],
    ];

    $aiSession = AiInterviewSession::updateOrCreate(
        ['ai_interview_id' => $aiInterview->id, 'student_id' => $student->id, 'attempt_number' => 1],
        [
            'status' => 'EVALUATED',
            'started_at' => Carbon::now()->subHours(4),
            'expires_at' => Carbon::now()->subHours(3),
            'completed_at' => Carbon::now()->subHours(3),
            'total_score' => 52.0,
            'passed' => false,
            'dimension_scores' => [
                'technical_depth' => 50.0,
                'problem_solving' => 55.0,
                'communication_clarity' => 58.0,
                'behavioral_star_alignment' => 45.0,
            ],
            'ai_evaluation_summary' => $aiEvalSummary,
            'is_provisional' => false,
            'ai_review_status' => 'APPROVED',
        ]
    );

    // Ensure mock message exists
    AiInterviewMessage::firstOrCreate(
        ['session_id' => $aiSession->id, 'sender' => 'CANDIDATE'],
        [
            'message_type' => 'ANSWER',
            'content' => 'I helped my team build a website and it worked well.',
            'is_follow_up' => false,
        ]
    );

    // C. Drive Application with REJECTED status to trigger Placement Debrief Card
    DriveCandidate::updateOrCreate(
        ['drive_id' => $drive->id, 'student_id' => $student->id],
        [
            'status' => 'REJECTED',
            'current_round_number' => 1,
            'round_results' => [
                [
                    'assessment_id' => $assessment->id,
                    'assessment_title' => 'Round 1: Online Technical Assessment',
                    'session_id' => 1,
                    'attempt_number' => 1,
                    'score' => 54.0,
                    'percentage' => 54.0,
                    'passed' => false,
                    'evaluated_at' => Carbon::now()->subDays(1)->toIso8601String(),
                ]
            ],
            'status_history' => [
                [
                    'from' => 'REGISTERED',
                    'to' => 'ELIGIBLE',
                    'reason' => 'Candidate eligible for drive based on academic criteria',
                    'timestamp' => Carbon::now()->subDays(3)->toIso8601String(),
                ],
                [
                    'from' => 'ELIGIBLE',
                    'to' => 'REJECTED',
                    'reason' => 'Did not meet cutoff in Round 1: Online Technical Assessment (Scored 54%, cutoff 70%). Key gap: Dynamic Programming & SQL.',
                    'timestamp' => Carbon::now()->subDays(1)->toIso8601String(),
                ]
            ],
        ]
    );
}

echo "Successfully seeded demo data for remediation architecture across assessments, AI interviews, and placement journey!\n";
