<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Assessment;
use App\Models\Question;
use App\Models\AssessmentSession;
use App\Models\AssessmentAnswer;
use App\Models\AiInterview;
use App\Models\AiInterviewSession;
use App\Models\AiInterviewMessage;
use App\Services\Assessment\AssessmentScoringService;
use App\Services\Interview\AiInterviewEvaluatorService;
use App\Services\Interview\AiInterviewSessionService;
use App\Enums\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StudentRemediationArchitectureTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;
    protected Student $student;
    protected User $officerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->officerUser = User::create([
            'email' => 'tpo.officer@campuslink.edu',
            'password_hash' => bcrypt('Secret123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        $this->studentUser = User::create([
            'email' => 'student.remediation@campuslink.edu',
            'password_hash' => bcrypt('Secret123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'student_identifier' => 'STU-REMED-001',
            'first_name' => 'Alice',
            'last_name' => 'Recover',
            'branch' => 'Computer Science',
            'cgpa' => 8.2,
            'graduation_year' => 2026,
        ]);
    }

    public function test_assessment_scoring_generates_improvement_roadmap_and_code_diagnostics(): void
    {
        $assessment = Assessment::create([
            'title' => 'Core Computer Science Screening',
            'code' => 'CS-SCREEN-101',
            'assessment_type' => 'MIXED',
            'duration_minutes' => 60,
            'total_marks' => 30.0,
            'pass_percentage' => 70.0,
            'max_attempts' => 2,
            'created_by_user_id' => $this->officerUser->id,
            'status' => 'PUBLISHED',
        ]);

        // Q1: Data Structures (MCQ, 10 marks)
        $q1 = Question::create([
            'title' => 'Tree Traversals and Invariants',
            'question_text' => 'What is the in-order traversal of a BST?',
            'type' => 'MCQ',
            'category' => 'Data Structures',
            'marks' => 10.0,
            'correct_answer' => 'A',
            'options' => [['id' => 'A', 'text' => 'Sorted order'], ['id' => 'B', 'text' => 'Reverse order']],
        ]);

        // Q2: Algorithms (Coding, 10 marks)
        $q2 = Question::create([
            'title' => 'Optimized Subarray Sum',
            'question_text' => 'Find the maximum contiguous subarray sum in O(N).',
            'type' => 'PROGRAMMING',
            'category' => 'Algorithms',
            'programming_language' => 'php',
            'marks' => 10.0,
            'test_cases' => [
                ['input' => '[-2, 1, -3, 4]', 'expected_output' => '4', 'is_hidden' => false],
                ['input' => '[10, 20, 30]', 'expected_output' => '60', 'is_hidden' => true],
            ],
        ]);

        // Q3: Aptitude (MCQ, 10 marks)
        $q3 = Question::create([
            'title' => 'Probability and Permutations',
            'question_text' => 'Calculate permutation P(5, 2).',
            'type' => 'APTITUDE',
            'category' => 'Aptitude',
            'marks' => 10.0,
            'correct_answer' => 'C',
            'options' => [['id' => 'C', 'text' => '20'], ['id' => 'D', 'text' => '10']],
        ]);

        $assessment->questions()->attach($q1->id, ['order_index' => 1, 'marks' => 10.0, 'negative_marks' => 0.0]);
        $assessment->questions()->attach($q2->id, ['order_index' => 2, 'marks' => 10.0, 'negative_marks' => 0.0]);
        $assessment->questions()->attach($q3->id, ['order_index' => 3, 'marks' => 10.0, 'negative_marks' => 0.0]);

        $session = AssessmentSession::create([
            'assessment_id' => $assessment->id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'started_at' => Carbon::now()->subMinutes(30),
            'expires_at' => Carbon::now()->addMinutes(30),
        ]);

        // Candidate failed Q1 (chose wrong answer B)
        AssessmentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $q1->id,
            'student_id' => $this->student->id,
            'answer_text' => 'B',
            'saved_at' => Carbon::now(),
        ]);

        // Candidate failed Q2 due to simulated timeout
        AssessmentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $q2->id,
            'student_id' => $this->student->id,
            'answer_text' => '// SIMULATE_TIMEOUT while(true) {}',
            'code_language' => 'php',
            'saved_at' => Carbon::now(),
        ]);

        // Candidate passed Q3
        AssessmentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $q3->id,
            'student_id' => $this->student->id,
            'answer_text' => 'C',
            'saved_at' => Carbon::now(),
        ]);

        /** @var AssessmentScoringService $scoringService */
        $scoringService = app(AssessmentScoringService::class);
        $evaluatedSession = $scoringService->evaluateSession($session);

        $this->assertEquals('EVALUATED', $evaluatedSession->status);
        $this->assertFalse($evaluatedSession->passed);
        $this->assertEquals(10.0, $evaluatedSession->total_score);

        $summary = $evaluatedSession->evaluation_summary;
        $this->assertIsArray($summary);
        $this->assertArrayHasKey('improvement_roadmap', $summary);

        $roadmap = $summary['improvement_roadmap'];
        $this->assertTrue($roadmap['can_reattempt']);
        $this->assertEquals(24, $roadmap['reattempt_cooldown_hours']);

        // Check critical focus areas (< 60%)
        $this->assertNotEmpty($roadmap['critical_focus_areas']);
        $categoriesInFocus = array_column($roadmap['critical_focus_areas'], 'category');
        $this->assertContains('Data Structures', $categoriesInFocus);
        $this->assertContains('Algorithms', $categoriesInFocus);

        // Check missed concepts
        $dsFocus = collect($roadmap['critical_focus_areas'])->firstWhere('category', 'Data Structures');
        $this->assertNotEmpty($dsFocus['missed_concepts']);
        $this->assertNotEmpty($dsFocus['recommended_action']);

        // Check programming failure classification
        $this->assertNotEmpty($roadmap['code_diagnostics']);
        $codingDiag = $roadmap['code_diagnostics'][0];
        $this->assertEquals('Optimized Subarray Sum', $codingDiag['question_title']);
        $this->assertEquals('TIMEOUT_TLE', $codingDiag['failure_reason']);
        $this->assertStringContainsString('exceeded the allowable time limit', $codingDiag['guidance']);
    }

    public function test_assessment_result_api_returns_improvement_roadmap_without_leaking_secrets(): void
    {
        $assessment = Assessment::create([
            'title' => 'Diagnostic Assessment',
            'code' => 'DIAG-101',
            'assessment_type' => 'APTITUDE',
            'duration_minutes' => 30,
            'total_marks' => 20.0,
            'pass_percentage' => 70.0,
            'created_by_user_id' => $this->officerUser->id,
            'status' => 'PUBLISHED',
        ]);

        $q = Question::create([
            'title' => 'Quantitative Speed Test',
            'question_text' => 'What is 15 * 14?',
            'type' => 'APTITUDE',
            'category' => 'Aptitude',
            'marks' => 20.0,
            'correct_answer' => '210',
            'explanation' => 'Confidential explanation: 15 * 14 = 210',
        ]);

        $assessment->questions()->attach($q->id, ['order_index' => 1, 'marks' => 20.0, 'negative_marks' => 0.0]);

        $session = AssessmentSession::create([
            'assessment_id' => $assessment->id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'status' => 'SUBMITTED',
            'started_at' => Carbon::now()->subMinutes(15),
            'expires_at' => Carbon::now()->addMinutes(15),
            'submitted_at' => Carbon::now(),
        ]);

        AssessmentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $q->id,
            'student_id' => $this->student->id,
            'answer_text' => '200', // incorrect
            'saved_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/students/me/assessments/sessions/{$session->id}/result");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'result' => [
                'session_id',
                'assessment_title',
                'status',
                'total_score',
                'total_possible',
                'passed',
                'pass_percentage',
                'evaluation_summary',
                'improvement_roadmap' => [
                    'critical_focus_areas',
                    'code_diagnostics',
                    'can_reattempt',
                    'reattempt_cooldown_hours',
                ],
            ],
        ]);

        // Security check: correct answer and explanation must not leak in response
        $content = $response->getContent();
        $this->assertStringNotContainsString('Confidential explanation', $content);
    }

    public function test_ai_interview_growth_plan_and_session_formatting(): void
    {
        $interview = AiInterview::create([
            'title' => 'Junior Full Stack Engineer Mock',
            'code' => 'AI-MOCK-FS-01',
            'target_role' => 'Full Stack Engineer',
            'interview_type' => 'MIXED',
            'difficulty' => 'ENTRY',
            'duration_minutes' => 30,
            'pass_percentage' => 70.0,
            'created_by_user_id' => $this->officerUser->id,
            'status' => 'PUBLISHED',
        ]);

        $session = AiInterviewSession::create([
            'ai_interview_id' => $interview->id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'started_at' => Carbon::now()->subMinutes(20),
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        AiInterviewMessage::create([
            'session_id' => $session->id,
            'sender' => 'AI',
            'message_type' => 'QUESTION',
            'content' => 'Describe a challenge you solved in a team web project.',
        ]);

        AiInterviewMessage::create([
            'session_id' => $session->id,
            'sender' => 'CANDIDATE',
            'message_type' => 'ANSWER',
            'content' => 'I helped my team build a website and it worked well.',
        ]);

        /** @var AiInterviewEvaluatorService $evaluatorService */
        $evaluatorService = app(AiInterviewEvaluatorService::class);
        $evaluatedSession = $evaluatorService->evaluateInterviewSession($session);

        $this->assertEquals('EVALUATED', $evaluatedSession->status);
        $summary = $evaluatedSession->ai_evaluation_summary;

        $this->assertIsArray($summary);
        $this->assertArrayHasKey('actionable_growth_plan', $summary);

        $plan = $summary['actionable_growth_plan'];
        $this->assertArrayHasKey('priority_level', $plan);
        $this->assertNotEmpty($plan['rubric_dimension_targets']);
        $this->assertNotEmpty($plan['exemplar_refinements']);

        // Check exemplar comparison contains candidate quote and improved exemplar
        $exemplar = $plan['exemplar_refinements'][0];
        $this->assertNotEmpty($exemplar['candidate_quote']);
        $this->assertNotEmpty($exemplar['improved_exemplar']);
        $this->assertStringContainsString('Situation', $exemplar['improved_exemplar']);
        $this->assertStringContainsString('Result', $exemplar['improved_exemplar']);

        // Check session formatting for candidate presentation
        /** @var AiInterviewSessionService $sessionService */
        $sessionService = app(AiInterviewSessionService::class);
        $formatted = $sessionService->formatSessionForCandidate($evaluatedSession);

        $this->assertNotNull($formatted['evaluation']);
        $this->assertArrayHasKey('actionable_growth_plan', $formatted['evaluation']);
        $this->assertArrayHasKey('overall_assessment', $formatted['evaluation']);
    }

    public function test_programming_failure_classifications(): void
    {
        $assessment = Assessment::create([
            'title' => 'Coding Sandbox Diagnostic Suite',
            'code' => 'CODE-DIAG-202',
            'assessment_type' => 'CODING',
            'duration_minutes' => 45,
            'total_marks' => 20.0,
            'pass_percentage' => 80.0,
            'created_by_user_id' => $this->officerUser->id,
            'status' => 'PUBLISHED',
        ]);

        $qSyntax = Question::create([
            'title' => 'Syntax Challenge',
            'question_text' => 'Valid code test',
            'type' => 'PROGRAMMING',
            'category' => 'Algorithms',
            'programming_language' => 'php',
            'marks' => 10.0,
            'test_cases' => [['input' => '1', 'expected_output' => '1', 'is_hidden' => false]],
        ]);

        $qEdge = Question::create([
            'title' => 'Edge Case Challenge',
            'question_text' => 'Boundary cases test',
            'type' => 'PROGRAMMING',
            'category' => 'Data Structures',
            'programming_language' => 'php',
            'marks' => 10.0,
            'test_cases' => [
                ['input' => 'sample', 'expected_output' => 'SAMPLE', 'is_hidden' => false],
                ['input' => '', 'expected_output' => 'EMPTY', 'is_hidden' => true],
            ],
        ]);

        $assessment->questions()->attach($qSyntax->id, ['order_index' => 1, 'marks' => 10.0, 'negative_marks' => 0.0]);
        $assessment->questions()->attach($qEdge->id, ['order_index' => 2, 'marks' => 10.0, 'negative_marks' => 0.0]);

        $session = AssessmentSession::create([
            'assessment_id' => $assessment->id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'started_at' => Carbon::now()->subMinutes(20),
            'expires_at' => Carbon::now()->addMinutes(25),
        ]);

        // Submit code with simulated compile error
        AssessmentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $qSyntax->id,
            'student_id' => $this->student->id,
            'answer_text' => '// SIMULATE_COMPILE_ERROR invalid syntax',
            'code_language' => 'php',
            'saved_at' => Carbon::now(),
        ]);

        // Submit code that passes sample but fails hidden edge case
        AssessmentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $qEdge->id,
            'student_id' => $this->student->id,
            'answer_text' => 'echo strtoupper($stdin);',
            'code_language' => 'php',
            'saved_at' => Carbon::now(),
        ]);

        /** @var AssessmentScoringService $scoringService */
        $scoringService = app(AssessmentScoringService::class);
        $evaluated = $scoringService->evaluateSession($session);

        $codeDiags = $evaluated->evaluation_summary['improvement_roadmap']['code_diagnostics'];
        $this->assertCount(2, $codeDiags);

        $syntaxDiag = collect($codeDiags)->firstWhere('question_title', 'Syntax Challenge');
        $this->assertEquals('SYNTAX_ERROR', $syntaxDiag['failure_reason']);

        $edgeDiag = collect($codeDiags)->firstWhere('question_title', 'Edge Case Challenge');
        $this->assertEquals('EDGE_CASE_FAILURE', $edgeDiag['failure_reason']);
    }
}
