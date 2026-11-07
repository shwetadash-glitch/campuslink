<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Job;
use App\Models\Recruiter;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\Assessment;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\AssessmentSession;
use App\Models\AssessmentAnswer;
use App\Models\AssessmentSessionEvent;
use App\Models\AssessmentScoreHistory;
use App\Services\AI\AiManager;
use App\Services\AI\AiProviderInterface;
use App\Services\Sandbox\SandboxManager;
use App\Services\Sandbox\MockSandboxAdapter;
use App\Services\Sandbox\Judge0SandboxAdapter;
use App\Enums\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class Milestone5AssessmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;
    protected Student $student;
    protected User $officerUser;
    protected User $recruiterUser;
    protected Company $company;
    protected PlacementDrive $drive;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Placement Officer User
        $this->officerUser = User::create([
            'email' => 'tpo.director@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        // 2. Student User & Profile
        $this->studentUser = User::create([
            'email' => 'student.dev@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'student_identifier' => 'STU-CSE-2026-99',
            'first_name' => 'Kavitha',
            'last_name' => 'Narayanan',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.85,
        ]);

        // 3. Corporate Partner & Placement Drive
        $this->company = Company::create([
            'name' => 'InnoTech Solutions',
            'industry' => 'Cloud Platforms',
        ]);

        $this->recruiterUser = User::create([
            'email' => 'recruiter@innotech.com',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);

        $job = Job::create([
            'company_id' => $this->company->id,
            'title' => 'Cloud Backend Engineer',
            'description' => 'Distributed backend microservices in PHP, PostgreSQL, Docker.',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
        ]);

        $this->drive = PlacementDrive::create([
            'company_id' => $this->company->id,
            'job_id' => $job->id,
            'name' => 'InnoTech 2026 Graduate Engineering Drive',
            'start_date' => Carbon::now()->addDays(2),
            'end_date' => Carbon::now()->addDays(5),
            'status' => 'PUBLISHED',
        ]);
    }

    /**
     * Test 1: Placement Officer creates an assessment and attaches MCQ, coding, and subjective questions.
     */
    public function test_officer_assessment_creation_and_question_configuration(): void
    {
        $token = $this->officerUser->createToken('officer_token')->plainTextToken;

        // Create Assessment
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/officer/assessments', [
                'title' => 'Technical Screening Round 1',
                'code' => 'TECH-ROUND-001',
                'description' => 'Evaluates core algorithms, database concurrency, and system programming.',
                'drive_id' => $this->drive->id,
                'assessment_type' => 'MIXED',
                'duration_minutes' => 60,
                'total_marks' => 25.0,
                'pass_percentage' => 60.0,
                'max_attempts' => 2,
                'is_randomized' => true,
                'negative_marking_rate' => 0.25,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'assessment' => [
                    'code' => 'TECH-ROUND-001',
                    'status' => 'DRAFT',
                    'duration_minutes' => 60,
                ],
            ]);

        $assessmentId = $response->json('assessment.id');

        // Create question bank & questions
        $bank = QuestionBank::create([
            'name' => 'Core Computer Science',
            'created_by_user_id' => $this->officerUser->id,
        ]);

        $qMcq = Question::create([
            'question_bank_id' => $bank->id,
            'type' => 'MCQ',
            'difficulty' => 'MEDIUM',
            'title' => 'ACID Isolation Mechanics',
            'question_text' => 'Which isolation level prevents non-repeatable reads in relational databases?',
            'options' => [
                ['id' => 'A', 'text' => 'Read Uncommitted'],
                ['id' => 'B', 'text' => 'Read Committed'],
                ['id' => 'C', 'text' => 'Repeatable Read'],
                ['id' => 'D', 'text' => 'Snapshot Isolation only'],
            ],
            'correct_answer' => 'C',
            'marks' => 5.0,
            'negative_marks' => 1.25,
        ]);

        $qCoding = Question::create([
            'question_bank_id' => $bank->id,
            'type' => 'PROGRAMMING',
            'difficulty' => 'MEDIUM',
            'title' => 'Array Pair Sum',
            'question_text' => 'Read two space-separated integers from STDIN and output their sum.',
            'programming_language' => 'php',
            'code_snippet' => "<?php\n// Solution here\n",
            'test_cases' => [
                ['input' => '4 6', 'expected_output' => '10', 'is_hidden' => false],
                ['input' => '50 -20', 'expected_output' => '30', 'is_hidden' => true],
            ],
            'correct_answer' => "<?php echo array_sum(explode(' ', trim(fgets(STDIN))));",
            'marks' => 20.0,
            'negative_marks' => 0.0,
        ]);

        // Attach questions to assessment
        $attachRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/officer/assessments/{$assessmentId}/questions", [
                'questions' => [
                    ['question_id' => $qMcq->id, 'marks' => 5.0, 'negative_marks' => 1.25, 'order_index' => 1],
                    ['question_id' => $qCoding->id, 'marks' => 20.0, 'negative_marks' => 0.0, 'order_index' => 2],
                ],
            ]);

        $attachRes->assertStatus(200);
        $this->assertEquals(2, $attachRes->json('questions_count'));

        // Publish Assessment
        $publishRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/officer/assessments/{$assessmentId}/publish");

        $publishRes->assertStatus(200);
        $this->assertDatabaseHas('assessments', [
            'id' => $assessmentId,
            'status' => 'PUBLISHED',
        ]);
    }

    /**
     * Test 2: Secure Candidate Session with strict Answer-Key stripping and Hidden Test-Case protection.
     */
    public function test_candidate_session_sanitizes_answers_and_hidden_test_cases(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();

        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $startRes->assertStatus(200);
        $session = $startRes->json('session');

        $this->assertEquals('IN_PROGRESS', $session['status']);
        $this->assertNotEmpty($session['expires_at']);
        $this->assertGreaterThan(0, $session['seconds_remaining']);

        // CRITICAL SECURITY ASSERTION: Secret answer keys and hidden test cases MUST NOT be leaked to candidate
        foreach ($session['questions'] as $q) {
            $this->assertArrayNotHasKey('correct_answer', $q, "CRITICAL: Candidate API leaked question correct_answer!");
            $this->assertArrayNotHasKey('test_cases', $q, "CRITICAL: Candidate API leaked raw test_cases!");
            $this->assertArrayNotHasKey('rubric', $q, "CRITICAL: Candidate API leaked grading rubric!");

            if ($q['type'] === 'PROGRAMMING') {
                $this->assertArrayHasKey('sample_test_cases', $q);
                foreach ($q['sample_test_cases'] as $sample) {
                    $this->assertTrue($sample['is_sample']);
                    $this->assertArrayNotHasKey('is_hidden', $sample);
                }
            }
        }
    }

    /**
     * Test 3: Question Randomization per session when configured on assessment.
     */
    public function test_question_randomization_per_candidate_session(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions(true); // is_randomized = true

        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $sessionData = $startRes->json('session');
        $sessionModel = AssessmentSession::find($sessionData['id']);

        $this->assertIsArray($sessionModel->question_order);
        $this->assertCount(3, $sessionModel->question_order);

        // Verify session returned questions in the specific randomized order stored
        $returnedIds = collect($sessionData['questions'])->pluck('id')->all();
        $this->assertEquals($sessionModel->question_order, $returnedIds);
    }

    /**
     * Test 4: Answer Autosaving and Network Interruption Recovery.
     */
    public function test_answer_autosaving_and_network_interruption_recovery(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        // Candidate starts exam
        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');
        $qMcqId = $startRes->json('session.questions.0.id');

        // Candidate selects option B and autosaves
        $saveRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qMcqId,
                'answer_text' => 'B',
            ]);

        $saveRes->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseHas('assessment_answers', [
            'session_id' => $sessionId,
            'question_id' => $qMcqId,
            'answer_text' => 'B',
            'is_auto_saved' => true,
        ]);

        // NETWORK INTERRUPTION SIMULATION: Candidate disconnects and reconnects later
        // Calling startSession again on the same assessment returns the active unexpired session!
        $recoveryRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $recoveryRes->assertStatus(200);
        $this->assertEquals($sessionId, $recoveryRes->json('session.id'));
        $this->assertEquals('B', $recoveryRes->json('session.saved_answers.' . $qMcqId . '.answer_text'));

        // Verify CONNECTION_RESTORED telemetry event was logged
        $this->assertDatabaseHas('assessment_session_events', [
            'session_id' => $sessionId,
            'event_type' => 'CONNECTION_RESTORED',
        ]);
    }

    /**
     * Test 5: Authoritative Server-Side Deadline Enforcement (Submissions after expiration are rejected).
     */
    public function test_server_side_deadline_enforcement(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');
        $qMcqId = $startRes->json('session.questions.0.id');

        // Manually simulate time expiration on the authoritative server model
        $session = AssessmentSession::find($sessionId);
        $session->update([
            'expires_at' => Carbon::now()->subMinutes(5), // Expired 5 minutes ago
        ]);

        // Attempting to autosave an answer on an expired session must be rejected
        $lateSaveRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qMcqId,
                'answer_text' => 'C',
            ]);

        $lateSaveRes->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'DEADLINE_EXPIRED',
            ]);

        // Session must be auto-transitioned to EXPIRED
        $this->assertEquals('EXPIRED', $session->fresh()->status);
    }

    /**
     * Test 6: Attempt Limits Enforcement.
     */
    public function test_attempt_limits_enforcement(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $assessment->update(['max_attempts' => 1]); // Strictly 1 attempt allowed

        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        // Attempt 1
        $startRes1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId1 = $startRes1->json('session.id');

        // Submit Attempt 1
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId1}/submit");

        // Attempt 2 -> Must be rejected with HTTP 422
        $startRes2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $startRes2->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'SESSION_START_FAILED',
            ]);
    }

    /**
     * Test 7: Automatic Objective Scoring with Negative Marking.
     */
    public function test_objective_scoring_with_negative_marking(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');
        $qMcq = Question::where('type', 'MCQ')->first();

        // Submit wrong answer ('A' instead of correct 'C')
        // Marks = 5.0, negative_marks = 1.25 -> Awarded should be -1.25
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qMcq->id,
                'answer_text' => 'A', // WRONG
            ]);

        $submitRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");

        $submitRes->assertStatus(200);

        $answer = AssessmentAnswer::where('session_id', $sessionId)
            ->where('question_id', $qMcq->id)
            ->first();

        $this->assertFalse($answer->is_correct);
        $this->assertEquals(-1.25, $answer->score_awarded);
    }

    /**
     * Test 8: Mock Programming Assessment Sandbox Evaluation and Test-Case Scoring.
     */
    public function test_programming_sandbox_evaluation_and_test_case_scoring(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');
        $qCoding = Question::where('type', 'PROGRAMMING')->first();

        // 1. Practice execution against sample test cases via run-code endpoint
        $runCodeRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/run-code", [
                'question_id' => $qCoding->id,
                'language' => 'php',
                'source_code' => "<?php [\$a, \$b] = explode(' ', trim(fgets(STDIN))); echo ((int)\$a + (int)\$b);",
            ]);

        $runCodeRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'result' => [
                    'adapter' => 'mock',
                    'is_simulated' => true,
                    'status' => 'ALL_TESTS_PASSED',
                ],
            ]);

        // 2. Save valid code solution
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qCoding->id,
                'code_language' => 'php',
                'answer_text' => "<?php [\$a, \$b] = explode(' ', trim(fgets(STDIN))); echo ((int)\$a + (int)\$b);",
            ]);

        // 3. Final exam submission evaluates both visible AND hidden test cases
        $submitRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");

        $submitRes->assertStatus(200);

        $answer = AssessmentAnswer::where('session_id', $sessionId)
            ->where('question_id', $qCoding->id)
            ->first();

        $this->assertTrue($answer->is_correct);
        $this->assertEquals(20.0, $answer->score_awarded); // Full marks awarded
        $this->assertNotEmpty($answer->execution_result);
        $this->assertEquals(2, $answer->execution_result['passed_test_cases']);
    }

    /**
     * Test 9: Sandbox Adapter Restrictions (Live Judge0 is strictly disabled by default).
     */
    public function test_judge0_sandbox_adapter_restrictions(): void
    {
        $judge0Adapter = new Judge0SandboxAdapter('http://judge0.internal:2358', 'api_key_test', null, false);

        $this->assertFalse($judge0Adapter->isLiveEnabled());

        // Attempting to execute live code when live_enabled is false throws RuntimeException
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('CRITICAL: Live Judge0 execution is disabled');

        $judge0Adapter->execute('php', '<?php echo "hello";', '');
    }

    /**
     * Test 10: AI-Assisted Question Draft Generation and Human Review Workflow.
     */
    public function test_ai_question_draft_generation_and_human_review_workflow(): void
    {
        $officerToken = $this->officerUser->createToken('officer_token')->plainTextToken;

        $sourceText = "We are hiring a Cloud Backend Engineer. Candidates must have deep expertise in PostgreSQL indexes, MVCC concurrency, Redis caching, and Docker containers.";

        $genRes = $this->withHeader('Authorization', 'Bearer ' . $officerToken)
            ->postJson('/api/v1/officer/assessments/generate-questions', [
                'source_text' => $sourceText,
                'type' => 'MCQ',
                'difficulty' => 'HARD',
                'count' => 2,
            ]);

        $genRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'is_simulated' => true,
                'provider' => 'mock',
            ]);

        $drafts = $genRes->json('draft_questions');
        $this->assertCount(2, $drafts);

        $questionId = $drafts[0]['id'];
        $questionModel = Question::find($questionId);

        // Generated questions MUST be flagged as PENDING_REVIEW
        $this->assertTrue($questionModel->ai_generated);
        $this->assertEquals('PENDING_REVIEW', $questionModel->ai_review_status);

        // Human officer reviews and approves question
        $approveRes = $this->withHeader('Authorization', 'Bearer ' . $officerToken)
            ->postJson("/api/v1/officer/assessments/questions/{$questionId}/approve", [
                'marks' => 3.0,
            ]);

        $approveRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'question' => [
                    'id' => $questionId,
                    'ai_review_status' => 'APPROVED',
                    'marks' => 3.0,
                ],
            ]);
    }

    /**
     * Test 11: Placement Drive Candidate Lifecycle Integration (Verified score advances candidate).
     */
    public function test_placement_drive_candidate_lifecycle_integration(): void
    {
        // 1. Candidate registered for InnoTech drive
        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student->id,
            'status' => 'REGISTERED',
            'registered_at' => Carbon::now(),
        ]);

        // 2. Assessment tied to this placement drive
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $assessment->update(['drive_id' => $this->drive->id, 'pass_percentage' => 50.0]);

        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');

        $qCoding = Question::where('type', 'PROGRAMMING')->first();

        // Submit correct coding answer (earns 20 / 25 points = 80% > 50% cutoff)
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qCoding->id,
                'code_language' => 'php',
                'answer_text' => "<?php [\$a, \$b] = explode(' ', trim(fgets(STDIN))); echo ((int)\$a + (int)\$b);",
            ]);

        $submitRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");

        $submitRes->assertStatus(200);

        // Candidate status in DriveCandidate MUST automatically transition to SHORTLISTED
        $candidate->refresh();
        $this->assertEquals('SHORTLISTED', $candidate->status);

        // Verify audit history was appended
        $this->assertDatabaseHas('drive_candidate_status_histories', [
            'drive_candidate_id' => $candidate->id,
            'to_status' => 'SHORTLISTED',
        ]);
    }

    /**
     * Test 12: Subjective Question Grading & Score Override Audit Trail.
     */
    public function test_subjective_grading_and_score_override_audit_trail(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');
        $qDescriptive = Question::where('type', 'DESCRIPTIVE')->first();

        // Student submits descriptive answer
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qDescriptive->id,
                'answer_text' => 'In database systems, isolation ensures transactions execute without interfering with one another. PostgreSQL achieves this through multi-version concurrency control snapshots.',
            ]);

        // Submit exam
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");

        $answer = AssessmentAnswer::where('session_id', $sessionId)
            ->where('question_id', $qDescriptive->id)
            ->first();

        // Officer evaluates subjective answer and assigns official score
        $officerToken = $this->officerUser->createToken('officer_token')->plainTextToken;
        $this->app['auth']->forgetGuards();

        $gradeRes = $this->withHeader('Authorization', 'Bearer ' . $officerToken)
            ->postJson("/api/v1/officer/assessments/submissions/{$sessionId}/evaluate-subjective", [
                'answer_id' => $answer->id,
                'score' => 4.5,
                'reason' => 'Demonstrated excellent understanding of MVCC snapshots.',
                'feedback' => 'Comprehensive technical explanation.',
            ]);

        $gradeRes->assertStatus(200);

        // Verify score history audit log recorded
        $this->assertDatabaseHas('assessment_score_histories', [
            'session_id' => $sessionId,
            'changed_by_user_id' => $this->officerUser->id,
            'new_score' => $gradeRes->json('session.total_score'),
        ]);
    }

    /**
     * Test 13: Examination Security Telemetry Logging.
     */
    public function test_examination_security_telemetry_logging(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');

        // Candidate blurs browser tab or exits fullscreen
        $telemetryRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/telemetry", [
                'event_type' => 'WINDOW_BLUR',
                'event_data' => ['blur_duration_ms' => 4200],
            ]);

        $telemetryRes->assertStatus(200);

        $session = AssessmentSession::find($sessionId);
        $this->assertEquals(1, $session->proctoring_flags_count);

        $this->assertDatabaseHas('assessment_session_events', [
            'session_id' => $sessionId,
            'event_type' => 'WINDOW_BLUR',
        ]);
    }

    /**
     * Test 14: Role-Based Access Control (Student cannot access officer assessment admin).
     */
    public function test_role_based_access_control_on_assessment_endpoints(): void
    {
        $studentToken = $this->studentUser->createToken('student_token')->plainTextToken;

        // Student tries to access officer assessment list -> 403 Forbidden
        $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->getJson('/api/v1/officer/assessments')
            ->assertStatus(403);

        // Student tries to generate AI questions -> 403 Forbidden
        $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson('/api/v1/officer/assessments/generate-questions', [
                'source_text' => 'Sample technical syllabus',
            ])
            ->assertStatus(403);
    }

    /**
     * Test 15: AI Provider Unavailability Handling in Production Mode.
     */
    public function test_ai_provider_unavailability_handling_in_production(): void
    {
        $officerToken = $this->officerUser->createToken('officer_token')->plainTextToken;

        $failingProvider = new class implements AiProviderInterface {
            public function getProviderName(): string { return 'ollama'; }
            public function isAvailable(): bool { return false; }
            public function chat(array $messages, array $options = []): array {
                throw new \RuntimeException('Ollama cluster connection refused (ECONNREFUSED)');
            }
            public function generate(string $prompt, ?array $jsonSchema = null, array $options = []): array|string {
                throw new \RuntimeException('Ollama cluster connection refused (ECONNREFUSED)');
            }
        };

        config(['app.env' => 'production']);
        $prodAiManager = new AiManager('production');
        $prodAiManager->setProvider($failingProvider);
        $this->app->instance(AiManager::class, $prodAiManager);

        $res = $this->withHeader('Authorization', 'Bearer ' . $officerToken)
            ->postJson('/api/v1/officer/assessments/generate-questions', [
                'source_text' => 'Cloud engineering syllabus and microservices architecture',
            ]);

        $res->assertStatus(503)
            ->assertJson([
                'status' => 'error',
                'code' => 'AI_SERVICE_UNAVAILABLE',
            ]);

        config(['app.env' => 'testing']);
    }

    /**
     * Test 16: Cross-Student Session Isolation and Unauthorized Access Prevention.
     */
    public function test_cross_student_session_isolation_and_unauthorized_access(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();

        // Student 1 starts session
        $token1 = $this->studentUser->createToken('token1')->plainTextToken;
        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId1 = $startRes->json('session.id');
        $qId = $startRes->json('session.questions.0.id');

        // Create Student 2
        $user2 = User::create([
            'email' => 'student2@example.com',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $student2 = Student::create([
            'user_id' => $user2->id,
            'student_identifier' => 'STU-CSE-2026-100',
            'first_name' => 'Rahul',
            'last_name' => 'Verma',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.5,
        ]);
        $token2 = $user2->createToken('token2')->plainTextToken;

        // Reset auth guard cache so Sanctum authenticates User 2
        $this->app['auth']->forgetGuards();

        // Student 2 attempts to read Student 1's session -> 404
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson("/api/v1/students/me/assessments/sessions/{$sessionId1}")
            ->assertStatus(404);

        // Student 2 attempts to save answer into Student 1's session -> 404
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId1}/save-answer", [
                'question_id' => $qId,
                'answer_text' => 'MALICIOUS_OVERWRITE',
            ])
            ->assertStatus(404);

        // Student 2 attempts to run code in Student 1's session -> 404
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId1}/run-code", [
                'question_id' => $qId,
                'source_code' => 'echo "hacked";',
                'language' => 'php',
            ])
            ->assertStatus(404);

        // Student 2 attempts to submit Student 1's session -> 404
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId1}/submit")
            ->assertStatus(404);

        // Student 2 attempts to view Student 1's results -> 404
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson("/api/v1/students/me/assessments/sessions/{$sessionId1}/result")
            ->assertStatus(404);

        // Verify Student 1's session is completely unaffected
        $session = AssessmentSession::find($sessionId1);
        $this->assertEquals('IN_PROGRESS', $session->status);
        $this->assertEquals($this->student->id, $session->student_id);
    }

    /**
     * Test 17: Drive Registration and Eligibility Revalidation on Assessment Start.
     */
    public function test_drive_registration_and_eligibility_revalidation_on_start(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $assessment->update(['drive_id' => $this->drive->id]);

        // Student is NOT registered in drive -> must be rejected with 422
        $token = $this->studentUser->createToken('unregistered_token')->plainTextToken;
        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $res->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'SESSION_START_FAILED',
            ]);
        $this->assertStringContainsString('not registered', $res->json('message'));

        // Register candidate with REJECTED status -> must also be rejected
        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student->id,
            'status' => 'REJECTED',
            'registered_at' => Carbon::now(),
        ]);

        $res2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $res2->assertStatus(422);
        $this->assertStringContainsString('not eligible', $res2->json('message'));

        // Update candidate to REGISTERED -> succeeds
        $candidate->update(['status' => 'REGISTERED']);
        $res3 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");

        $res3->assertStatus(200)
            ->assertJson(['status' => 'success']);
    }

    /**
     * Test 18: Advanced Candidate States are Protected and Round Results are Preserved.
     */
    public function test_advanced_candidate_states_are_protected_and_round_results_preserved(): void
    {
        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student->id,
            'status' => 'OFFERED', // Candidate is already in OFFERED status
            'registered_at' => Carbon::now(),
        ]);

        $assessment = $this->createPublishedAssessmentWithQuestions();
        $assessment->update(['drive_id' => $this->drive->id, 'pass_percentage' => 50.0]);

        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        // Start session
        $candidate->update(['status' => 'SHORTLISTED']); // temporarily eligible to take round 2 assessment
        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');

        // Restore OFFERED status
        $candidate->update(['status' => 'OFFERED']);

        // Submit session with passing score
        $qCoding = Question::where('type', 'PROGRAMMING')->first();
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qCoding->id,
                'code_language' => 'php',
                'answer_text' => "<?php [\$a, \$b] = explode(' ', trim(fgets(STDIN))); echo ((int)\$a + (int)\$b);",
            ]);

        $submitRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");
        $submitRes->assertStatus(200);

        // Verify status remains OFFERED (not demoted or overwritten to SHORTLISTED)
        $candidate->refresh();
        $this->assertEquals('OFFERED', $candidate->status);

        // Verify round_results contains the assessment record
        $this->assertIsArray($candidate->round_results);
        $this->assertCount(1, $candidate->round_results);
        $this->assertEquals($assessment->id, $candidate->round_results[0]['assessment_id']);
        $this->assertTrue($candidate->round_results[0]['passed']);
    }

    /**
     * Test 19: Duplicate Submissions Are Idempotent and Do Not Recalculate Scores.
     */
    public function test_duplicate_submissions_are_idempotent(): void
    {
        $assessment = $this->createPublishedAssessmentWithQuestions();
        $token = $this->studentUser->createToken('student_token')->plainTextToken;

        $startRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/{$assessment->id}/start");
        $sessionId = $startRes->json('session.id');
        $qMcq = Question::where('type', 'MCQ')->first();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/save-answer", [
                'question_id' => $qMcq->id,
                'answer_text' => 'C', // Correct
            ]);

        // Submission 1
        $sub1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");
        $sub1->assertStatus(200);
        $firstScore = $sub1->json('session.total_score');

        // Submission 2 (Duplicate)
        $sub2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/assessments/sessions/{$sessionId}/submit");
        $sub2->assertStatus(200);
        $secondScore = $sub2->json('session.total_score');

        $this->assertEquals($firstScore, $secondScore);
        $this->assertEquals(1, AssessmentSession::where('id', $sessionId)->count());
    }

    /**
     * Helper: Create published assessment with 3 question types (MCQ, Coding, Descriptive).
     */
    protected function createPublishedAssessmentWithQuestions(bool $isRandomized = false): Assessment
    {
        $assessment = Assessment::create([
            'title' => 'Comprehensive Placement Evaluation',
            'code' => 'COMP-TEST-' . uniqid(),
            'created_by_user_id' => $this->officerUser->id,
            'assessment_type' => 'MIXED',
            'duration_minutes' => 60,
            'total_marks' => 30.0,
            'pass_percentage' => 60.0,
            'max_attempts' => 2,
            'is_randomized' => $isRandomized,
            'negative_marking_rate' => 0.25,
            'status' => 'PUBLISHED',
            'published_at' => Carbon::now(),
        ]);

        $q1 = Question::create([
            'type' => 'MCQ',
            'difficulty' => 'MEDIUM',
            'title' => 'Database Indexes',
            'question_text' => 'Which index structure is default in B-tree databases?',
            'options' => [
                ['id' => 'A', 'text' => 'Hash Index'],
                ['id' => 'B', 'text' => 'B-Tree Index'],
                ['id' => 'C', 'text' => 'GIN Index'],
            ],
            'correct_answer' => 'C',
            'marks' => 5.0,
            'negative_marks' => 1.25,
        ]);

        $q2 = Question::create([
            'type' => 'PROGRAMMING',
            'difficulty' => 'MEDIUM',
            'title' => 'Add Two Numbers',
            'question_text' => 'Read two space separated numbers and print sum.',
            'programming_language' => 'php',
            'code_snippet' => "<?php\n// Write code here",
            'test_cases' => [
                ['input' => '4 6', 'expected_output' => '10', 'is_hidden' => false],
                ['input' => '20 30', 'expected_output' => '50', 'is_hidden' => true],
            ],
            'correct_answer' => "<?php echo array_sum(explode(' ', trim(fgets(STDIN))));",
            'marks' => 20.0,
            'negative_marks' => 0.0,
        ]);

        $q3 = Question::create([
            'type' => 'DESCRIPTIVE',
            'difficulty' => 'MEDIUM',
            'title' => 'Explain Isolation',
            'question_text' => 'Explain transaction isolation and MVCC.',
            'correct_answer' => 'Isolation ensures transactions execute without interfering. PostgreSQL uses MVCC.',
            'marks' => 5.0,
            'negative_marks' => 0.0,
        ]);

        $assessment->questions()->attach([
            $q1->id => ['marks' => 5.0, 'negative_marks' => 1.25, 'order_index' => 1],
            $q2->id => ['marks' => 20.0, 'negative_marks' => 0.0, 'order_index' => 2],
            $q3->id => ['marks' => 5.0, 'negative_marks' => 0.0, 'order_index' => 3],
        ]);

        return $assessment;
    }
}
