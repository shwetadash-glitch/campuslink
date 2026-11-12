<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Job;
use App\Models\Skill;
use App\Models\JobRequirement;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Enums\JobStatus;
use App\Enums\ProficiencyLevel;

class DriveRoundsWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $tpoUser;
    protected Company $company;
    protected Job $job;
    protected PlacementDrive $drive;
    protected Student $studentCs;
    protected Student $studentAi;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tpoUser = User::factory()->create([
            'email' => 'tpo_test@college.edu',
            'role' => 'PLACEMENT_OFFICER',
            'is_active' => true,
        ]);

        $this->company = Company::create([
            'name' => 'Microsoft Enterprise',
            'industry' => 'Cloud & Software',
        ]);

        $this->job = Job::create([
            'company_id' => $this->company->id,
            'title' => 'Software Development Engineer',
            'description' => 'Microsoft SDE 1 Full-Time Software Engineering role targeting CS & AI.',
            'employment_type' => 'FULL_TIME',
            'status' => JobStatus::PUBLISHED,
            'eligibility_config' => [
                'min_cgpa' => 7.0,
                'max_active_backlogs' => 0,
                'allowed_branches' => ['Computer Science', 'CSE', 'Artificial Intelligence and Data Science', 'IT'],
            ],
        ]);

        $pySkill = Skill::firstOrCreate(['name' => 'Python'], ['category' => 'Technical']);
        $sqlSkill = Skill::firstOrCreate(['name' => 'SQL'], ['category' => 'Technical']);
        $cppSkill = Skill::firstOrCreate(['name' => 'C++'], ['category' => 'Technical']);

        JobRequirement::create([
            'job_id' => $this->job->id,
            'skill_id' => $pySkill->id,
            'required_proficiency' => ProficiencyLevel::INTERMEDIATE,
            'is_mandatory' => true,
        ]);

        JobRequirement::create([
            'job_id' => $this->job->id,
            'skill_id' => $sqlSkill->id,
            'required_proficiency' => ProficiencyLevel::INTERMEDIATE,
            'is_mandatory' => true,
        ]);

        JobRequirement::create([
            'job_id' => $this->job->id,
            'skill_id' => $cppSkill->id,
            'required_proficiency' => ProficiencyLevel::INTERMEDIATE,
            'is_mandatory' => false,
        ]);

        $this->drive = PlacementDrive::create([
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'name' => 'Microsoft SDE Campus Drive 2026',
            'status' => 'REGISTRATION_OPEN',
            'start_date' => now(),
            'end_date' => now()->addDays(2),
        ]);

        $user1 = User::factory()->create(['email' => 'cs_cand@college.edu', 'role' => 'STUDENT']);
        $this->studentCs = Student::create([
            'user_id' => $user1->id,
            'student_identifier' => 'STU_CS_01',
            'first_name' => 'John',
            'last_name' => 'Developer',
            'branch' => 'Computer Science',
            'graduation_year' => 2026,
            'cgpa' => 8.8,
            'backlogs_current' => 0,
        ]);

        $user2 = User::factory()->create(['email' => 'ai_cand@college.edu', 'role' => 'STUDENT']);
        $this->studentAi = Student::create([
            'user_id' => $user2->id,
            'student_identifier' => 'STU_AI_02',
            'first_name' => 'Sarah',
            'last_name' => 'Scientist',
            'branch' => 'Artificial Intelligence and Data Science',
            'graduation_year' => 2026,
            'cgpa' => 8.5,
            'backlogs_current' => 0,
        ]);

        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->studentCs->id,
            'status' => 'REGISTERED',
        ]);

        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->studentAi->id,
            'status' => 'REGISTERED',
        ]);
    }

    public function test_drive_rounds_pipeline_returns_three_rounds_and_technical_questions()
    {
        $response = $this->actingAs($this->tpoUser)
            ->getJson("/api/v1/officer/drives/{$this->drive->id}/rounds-pipeline");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'drive_info' => ['drive_id', 'drive_name', 'company_name', 'job_title', 'required_skills'],
                'rounds',
                'quiz_config' => ['difficulty', 'duration_minutes', 'passing_cutoff', 'skills_covered', 'questions'],
                'gd_topics',
                'candidates',
                'summary' => ['total_applicants', 'round_1_qualified', 'round_2_cleared', 'round_3_selected'],
            ]);

        $data = $response->json();
        $this->assertCount(3, $data['rounds']);
        $this->assertEquals('AI Eligibility & Shortlisting', $data['rounds'][0]['name']);
        $this->assertEquals('Advanced Technical Quiz Assessment', $data['rounds'][1]['name']);
        $this->assertEquals('Technical Group Discussion (GD)', $data['rounds'][2]['name']);

        // Check technical quiz covers job required skills
        $this->assertContains('Python', $data['quiz_config']['skills_covered']);
        $this->assertContains('SQL', $data['quiz_config']['skills_covered']);
        $this->assertNotEmpty($data['quiz_config']['questions']);
    }

    public function test_advance_candidates_promotes_qualified_students_to_round_2()
    {
        $candId = DriveCandidate::where('drive_id', $this->drive->id)->first()->id;

        $response = $this->actingAs($this->tpoUser)
            ->postJson("/api/v1/officer/drives/{$this->drive->id}/advance-candidates", [
                'from_round' => 1,
                'to_round' => 2,
                'candidate_ids' => [$candId],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'updated_count' => 1,
                'target_round' => 2,
            ]);

        $this->assertEquals(2, DriveCandidate::find($candId)->current_round_number);
    }

    public function test_submit_technical_quiz_records_score_and_cleared_status()
    {
        $cand = DriveCandidate::where('drive_id', $this->drive->id)->first();

        $response = $this->actingAs($this->tpoUser)
            ->postJson("/api/v1/officer/drives/{$this->drive->id}/submit-quiz", [
                'candidate_id' => $cand->id,
                'score' => 82.5,
                'correct_answers' => 10,
                'skill_breakdown' => ['Python' => 85.0, 'SQL' => 80.0],
                'notes' => 'Strong performance on query optimization and GIL concurrency.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'candidate_id' => $cand->id,
            ]);

        $fresh = $cand->fresh();
        $this->assertEquals('CLEARED', $fresh->round_results['round_2']['status']);
        $this->assertEquals(82.5, $fresh->round_results['round_2']['score']);
    }

    public function test_submit_group_discussion_evaluation_records_rubric_and_offer()
    {
        $cand = DriveCandidate::where('drive_id', $this->drive->id)->first();

        $response = $this->actingAs($this->tpoUser)
            ->postJson("/api/v1/officer/drives/{$this->drive->id}/submit-gd", [
                'candidate_id' => $cand->id,
                'topic' => 'Microservices vs Monolith Architecture',
                'technical_depth' => 22,
                'communication' => 21,
                'critical_thinking' => 20,
                'leadership' => 21,
                'decision' => 'SELECTED',
                'remarks' => 'Outstanding articulation of distributed transaction boundaries and Saga patterns.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'candidate_id' => $cand->id,
            ]);

        $fresh = $cand->fresh();
        $this->assertEquals(84.0, $fresh->round_results['round_3']['overall_score']);
        $this->assertEquals('SELECTED', $fresh->round_results['round_3']['decision']);
        $this->assertEquals('OFFERED', $fresh->status);
    }

    public function test_export_csv_endpoint_generates_valid_spreadsheet()
    {
        $response = $this->actingAs($this->tpoUser)
            ->get("/api/v1/officer/drives/{$this->drive->id}/export-rounds");

        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $content = $response->getContent();
        $this->assertStringContainsString('Roll Number', $content);
        $this->assertStringContainsString('R1: AI Shortlist Rank', $content);
        $this->assertStringContainsString('R2: Technical Quiz Score %', $content);
        $this->assertStringContainsString('R3: Overall GD Score (/100)', $content);
        $this->assertStringContainsString('STU_CS_01', $content);
        $this->assertStringContainsString('STU_AI_02', $content);
    }

    public function test_student_cannot_access_quiz_before_tpo_dispatches()
    {
        $userStudent = $this->studentCs->user;

        $response = $this->actingAs($userStudent)
            ->getJson("/api/v1/students/me/drives/{$this->drive->id}/technical-quiz");

        $response->assertStatus(403)
            ->assertJson([
                'quiz_status' => 'AWAITING_TPO_DISPATCH',
            ]);
    }

    public function test_complete_tpo_dispatch_to_student_quiz_and_submission_workflow()
    {
        $candCs = DriveCandidate::where('drive_id', $this->drive->id)->where('student_id', $this->studentCs->id)->first();
        $userStudent = $this->studentCs->user;

        // 1. Placement Officer dispatches technical quiz to shortlisted candidates
        $dispatchRes = $this->actingAs($this->tpoUser)
            ->postJson("/api/v1/officer/drives/{$this->drive->id}/dispatch-quiz", [
                'candidate_ids' => [$candCs->id],
            ]);

        $dispatchRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'dispatched_count' => 1,
            ]);

        $candFresh = $candCs->fresh();
        $this->assertTrue($candFresh->round_results['round_2']['quiz_sent']);
        $this->assertEquals('DISPATCHED_PENDING', $candFresh->round_results['round_2']['status']);

        // 2. Student now fetches assigned quiz - verify correct options are masked
        $quizRes = $this->actingAs($userStudent)
            ->getJson("/api/v1/students/me/drives/{$this->drive->id}/technical-quiz");

        $quizRes->assertStatus(200)
            ->assertJsonStructure([
                'drive_id',
                'job_title',
                'duration_minutes',
                'passing_cutoff',
                'total_questions',
                'questions' => [
                    '*' => ['id', 'skill', 'difficulty', 'question', 'options']
                ],
            ]);

        $questions = $quizRes->json('questions');
        $this->assertNotEmpty($questions);
        // Ensure security: correct_option must NOT be exposed to candidate
        foreach ($questions as $q) {
            $this->assertArrayNotHasKey('correct_option', $q);
            $this->assertArrayNotHasKey('explanation', $q);
        }

        // 3. Student takes the quiz and submits answers
        // Prepare answers with both correct answers to test score evaluation
        $answers = [
            'PY-101' => 'B', // Correct
            'PY-102' => 'A', // Correct
            'SQL-201' => 'C', // Correct
            'SQL-202' => 'C', // Correct
            'CPP-301' => 'B', // Correct
        ];

        $submitRes = $this->actingAs($userStudent)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/submit-quiz", [
                'answers' => $answers,
            ]);

        $submitRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'CLEARED',
            ]);

        $this->assertGreaterThanOrEqual(60.0, $submitRes->json('score'));

        // 4. Verify candidate state updated in database
        $candAfter = $candCs->fresh();
        $this->assertEquals('CLEARED', $candAfter->round_results['round_2']['status']);
        $this->assertTrue($candAfter->round_results['round_2']['student_submitted']);
        $this->assertEquals(3, $candAfter->current_round_number);

        // 5. Verify TPO pipeline immediately reflects student's submitted score
        $pipelineRes = $this->actingAs($this->tpoUser)
            ->getJson("/api/v1/officer/drives/{$this->drive->id}/rounds-pipeline");

        $pipelineRes->assertStatus(200);
        $candidates = collect($pipelineRes->json('candidates'));
        $csInPipeline = $candidates->firstWhere('candidate_id', $candCs->id);
        $this->assertEquals('CLEARED', $csInPipeline['round_2']['status']);
        $this->assertTrue($csInPipeline['round_2']['student_submitted']);
        $this->assertNotNull($csInPipeline['round_2']['quiz_score']);

        // 6. Student cannot re-submit once completed
        $reSubmitRes = $this->actingAs($userStudent)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/submit-quiz", [
                'answers' => $answers,
            ]);
        $reSubmitRes->assertStatus(400);
    }

    public function test_student_cannot_access_gd_session_before_clearing_quiz()
    {
        // studentAi has NOT cleared Round 2 quiz
        $userAi = $this->studentAi->user;

        $response = $this->actingAs($userAi)
            ->getJson("/api/v1/students/me/drives/{$this->drive->id}/gd-session");

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    public function test_student_can_fetch_gd_session_and_participate_in_video_call()
    {
        $userCs = $this->studentCs->user;
        $candCs = DriveCandidate::where('drive_id', $this->drive->id)
            ->where('student_id', $this->studentCs->id)
            ->firstOrFail();

        // Mark Round 2 cleared
        $results = $candCs->round_results ?? [];
        $results['round_2'] = [
            'quiz_sent' => true,
            'student_submitted' => true,
            'status' => 'CLEARED',
            'score' => 88.0,
        ];
        $candCs->round_results = $results;
        $candCs->current_round_number = 3;
        $candCs->save();

        // 1. Fetch GD Session Data
        $sessionRes = $this->actingAs($userCs)
            ->getJson("/api/v1/students/me/drives/{$this->drive->id}/gd-session");

        $sessionRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $session = $sessionRes->json('session');
        $this->assertNotEmpty($session['group_panel']);
        $this->assertNotEmpty($session['peers']);
        $this->assertCount(3, $session['peers']);
        $this->assertEquals(5, count($session['rubrics']));

        // Verify the 5 exact rubrics exist
        $rubricKeys = array_column($session['rubrics'], 'key');
        $this->assertContains('clarity_and_fluency', $rubricKeys);
        $this->assertContains('active_listening', $rubricKeys);
        $this->assertContains('body_language', $rubricKeys);
        $this->assertContains('topic_knowledge', $rubricKeys);
        $this->assertContains('creativity_and_perspectivity', $rubricKeys);

        // 2. Submit GD video evaluation with 5 rubric scores
        $submitRes = $this->actingAs($userCs)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/submit-gd", [
                'topic' => 'Monolithic vs Microservices Architecture in Hyperscale Systems',
                'clarity_and_fluency' => 18.5,
                'active_listening' => 19.0,
                'body_language' => 17.5,
                'topic_knowledge' => 19.5,
                'creativity_and_perspectivity' => 18.5,
                'speaking_duration_seconds' => 165,
                'speech_transcript' => 'We must account for distributed transactions using Saga choreography while preserving modular bounded contexts.',
            ]);

        $submitRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $result = $submitRes->json('result');
        $this->assertEquals('CLEARED', $result['status']);
        $this->assertEquals('SELECTED', $result['decision']);
        $this->assertEquals(93.0, $result['overall_score']);
        $this->assertTrue($result['interview_unlocked']);
        $this->assertEquals('Round 4: Final Interview', $result['next_stage']);
        $this->assertNotEmpty($result['peer_evaluations']);

        // 3. Verify Candidate updated to Round 4 / INTERVIEWING
        $fresh = $candCs->fresh();
        $this->assertEquals(4, $fresh->current_round_number);
        $this->assertEquals('INTERVIEWING', $fresh->status);
        $this->assertEquals(93.0, $fresh->round_results['round_3']['overall_score']);
        $this->assertEquals('SELECTED', $fresh->round_results['round_3']['decision']);
    }
}
