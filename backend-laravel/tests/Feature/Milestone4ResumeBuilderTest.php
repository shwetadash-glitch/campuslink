<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Skill;
use App\Models\StudentSkill;
use App\Models\StudentProject;
use App\Models\StudentCertification;
use App\Models\StudentAcademicHistory;
use App\Models\Resume;
use App\Models\ResumeVersion;
use App\Models\Job;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Application;
use App\Services\AI\AiManager;
use App\Services\AI\MockAiProvider;
use App\Enums\UserRole;
use App\Enums\ProficiencyLevel;
use App\Enums\SkillSource;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class Milestone4ResumeBuilderTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser1;
    protected Student $student1;
    protected User $studentUser2;
    protected Student $student2;
    protected User $recruiterUser;
    protected Recruiter $recruiter;
    protected Company $company;
    protected Job $job;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        // Student 1 (CS discipline with full profile)
        $this->studentUser1 = User::create([
            'email' => 'alice.cs@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student1 = Student::create([
            'user_id' => $this->studentUser1->id,
            'student_identifier' => 'STU-CS-2026-01',
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.90,
            'phone' => '+91 9876543210',
            'profile_metadata' => [
                'linkedin_url' => 'https://linkedin.com/in/alicesmith',
                'github_url' => 'https://github.com/alicesmith',
                'location' => 'Bangalore, India',
            ],
        ]);

        // Skills for Alice
        $skillPhp = Skill::create(['name' => 'PHP', 'category' => 'Backend']);
        $skillLaravel = Skill::create(['name' => 'Laravel', 'category' => 'Framework']);
        $skillPostgres = Skill::create(['name' => 'PostgreSQL', 'category' => 'Database']);
        $skillDocker = Skill::create(['name' => 'Docker', 'category' => 'DevOps']);

        StudentSkill::create([
            'student_id' => $this->student1->id,
            'skill_id' => $skillPhp->id,
            'proficiency_level' => ProficiencyLevel::ADVANCED->value,
            'months_experience' => 24,
            'source' => SkillSource::ASSESSMENT->value, // Verified
        ]);

        StudentSkill::create([
            'student_id' => $this->student1->id,
            'skill_id' => $skillLaravel->id,
            'proficiency_level' => ProficiencyLevel::ADVANCED->value,
            'months_experience' => 18,
            'source' => SkillSource::ASSESSMENT->value, // Verified
        ]);

        StudentSkill::create([
            'student_id' => $this->student1->id,
            'skill_id' => $skillPostgres->id,
            'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value,
            'months_experience' => 12,
            'source' => SkillSource::STUDENT->value,
        ]);

        StudentSkill::create([
            'student_id' => $this->student1->id,
            'skill_id' => $skillDocker->id,
            'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value,
            'months_experience' => 10,
            'source' => SkillSource::CERTIFICATION->value, // Verified
        ]);

        // Capstone Project for Alice
        StudentProject::create([
            'student_id' => $this->student1->id,
            'title' => 'High-Concurrency Placement Portal',
            'description' => "Architected an automated campus placement portal with optimistic concurrency guards.\nIntegrated PostgreSQL pessimistic row locking for conflict detection.\nImplemented background queue workers for asynchronous notifications.",
            'technologies' => 'PHP, Laravel, PostgreSQL, Docker',
            'project_url' => 'https://github.com/alicesmith/placement-portal',
        ]);

        // Verified Certification for Alice
        StudentCertification::create([
            'student_id' => $this->student1->id,
            'name' => 'AWS Certified Cloud Practitioner',
            'issuing_org' => 'Amazon Web Services',
            'issue_date' => Carbon::now()->subMonths(6),
            'credential_id' => 'AWS-CCP-98765',
            'proof_path' => 'certifications/aws_ccp_alice.pdf',
        ]);

        // Academic History for Alice
        StudentAcademicHistory::create([
            'student_id' => $this->student1->id,
            'qualification' => 'B.Tech in Computer Science and Engineering',
            'institution' => 'National Institute of Technology',
            'specialization' => 'Distributed Systems',
            'start_year' => 2022,
            'end_year' => 2026,
            'score_value' => 8.90,
            'score_type' => 'CGPA',
        ]);

        // Student 2 (Mechanical Engineering discipline with minimal profile)
        $this->studentUser2 = User::create([
            'email' => 'bob.mech@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student2 = Student::create([
            'user_id' => $this->studentUser2->id,
            'student_identifier' => 'STU-ME-2026-02',
            'first_name' => 'Bob',
            'last_name' => 'Miller',
            'branch' => 'Mechanical Engineering',
            'graduation_year' => 2026,
            'cgpa' => 7.40,
            // phone is intentionally null
            // profile_metadata is intentionally null
        ]);

        // Recruiter & Job Requisition
        $this->company = Company::create([
            'name' => 'Apex Cloud Systems',
            'industry' => 'Cloud Infrastructure',
        ]);

        $this->recruiterUser = User::create([
            'email' => 'recruiter@apexcloud.com',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);

        $this->recruiter = Recruiter::create([
            'user_id' => $this->recruiterUser->id,
            'company_id' => $this->company->id,
            'contact_name' => 'Apex Talent Lead',
            'contact_email' => 'recruiter@apexcloud.com',
        ]);

        $this->job = Job::create([
            'company_id' => $this->company->id,
            'title' => 'Cloud Backend Engineer',
            'description' => 'Looking for engineers skilled in PHP, Laravel, PostgreSQL, Docker, and REST APIs.',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
        ]);
    }

    /**
     * Test 1: Baseline student profile integration and non-destructive aggregation.
     */
    public function test_baseline_profile_aggregation_preserves_student_data(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', [
                'title' => 'Software Engineer v1',
                'target_role' => 'Backend Engineer',
                'template' => 'modern',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'resume' => [
                    'title' => 'Software Engineer v1',
                    'target_role' => 'Backend Engineer',
                    'template' => 'modern',
                    'is_primary' => true,
                ],
            ]);

        $resumeData = $response->json('resume');
        $content = $resumeData['content'];

        // Verify grounded data
        $this->assertEquals('Alice Smith', $content['personal_info']['full_name']);
        $this->assertEquals('alice.cs@campuslink.edu', $content['personal_info']['email']);
        $this->assertEquals(8.90, $content['personal_info']['cgpa']);
        $this->assertCount(4, $content['skills']);
        $this->assertCount(1, $content['projects']);
        $this->assertCount(1, $content['certifications']);
        $this->assertTrue($content['certifications'][0]['is_verified']);

        // Verify underlying student records are completely untouched
        $this->assertDatabaseHas('students', [
            'id' => $this->student1->id,
            'cgpa' => 8.90,
            'branch' => 'Computer Science and Engineering',
        ]);

        // Verify initial version 1 snapshot created
        $this->assertDatabaseHas('resume_versions', [
            'resume_id' => $resumeData['id'],
            'version_number' => 1,
        ]);
    }

    /**
     * Test 2: Handling student with minimal or missing profile information.
     */
    public function test_handling_student_with_limited_information(): void
    {
        $token = $this->studentUser2->createToken('bob_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', [
                'title' => 'Mechanical Engineering Graduate',
                'target_role' => 'Design Trainee',
                'template' => 'classic',
            ]);

        $response->assertStatus(201);
        $content = $response->json('resume.content');

        $this->assertEquals('Bob Miller', $content['personal_info']['full_name']);
        $this->assertEquals('Mechanical Engineering', $content['personal_info']['branch']);
        $this->assertEmpty($content['skills']);
        $this->assertEmpty($content['projects']);
        $this->assertEmpty($content['certifications']);
        // Synthesizes default degree from student branch & graduation year
        $this->assertNotEmpty($content['academic_history']);
        $this->assertStringContainsString('Mechanical Engineering', $content['academic_history'][0]['qualification']);
    }

    /**
     * Test 3: AI professional summary generation grounded strictly in verified profile.
     */
    public function test_ai_professional_summary_generation_is_grounded(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', [
                'title' => 'Cloud Backend Candidate',
            ]);
        $resumeId = $createRes->json('resume.id');

        $summaryRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/generate-summary", [
                'target_role' => 'Backend Systems Engineer',
            ]);

        $summaryRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'groundedness_verified' => true,
            ]);

        $summaryText = $summaryRes->json('summary');
        $this->assertNotEmpty($summaryText);
        $this->assertStringContainsString('Computer Science', $summaryText);
        $this->assertStringContainsString('2026', $summaryText);
    }

    /**
     * Test 4: AI project description enhancement formats into action verbs.
     */
    public function test_ai_project_description_enhancement(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Project Polishing']);
        $resumeId = $createRes->json('resume.id');

        $improveRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/improve-project", [
                'project' => [
                    'title' => 'High-Concurrency Placement Portal',
                    'technologies' => 'PHP, Laravel, PostgreSQL',
                    'description' => 'I made a portal for campus placements with locking.',
                ],
            ]);

        $improveRes->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $bulletPoints = $improveRes->json('bullet_points');
        $this->assertIsArray($bulletPoints);
        $this->assertGreaterThanOrEqual(2, count($bulletPoints));
    }

    /**
     * Test 5: Job description analysis extracts skills, identifies matches/gaps, and explains rationale.
     */
    public function test_job_description_analysis_and_evidence_recommendations(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Job Customization']);
        $resumeId = $createRes->json('resume.id');

        $jobDesc = "We are seeking a Backend Engineer with strong expertise in PHP, Laravel, PostgreSQL, Redis, Kubernetes, and REST APIs.";

        $analysisRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/analyze-job", [
                'job_description' => $jobDesc,
            ]);

        $analysisRes->assertStatus(200);
        $data = $analysisRes->json();

        $this->assertGreaterThan(0, $data['job_match_score']);
        $this->assertContains('PHP', $data['matching_skills']);
        $this->assertContains('Laravel', $data['matching_skills']);
        $this->assertContains('PostgreSQL', $data['matching_skills']);
        $this->assertContains('Kubernetes', $data['missing_skills']);
        $this->assertContains('Redis', $data['missing_skills']);

        // Recommendations must provide explicit rationale (why)
        $this->assertNotEmpty($data['recommendations']);
        $this->assertNotEmpty($data['recommendations'][0]['rationale']);
    }

    /**
     * Test 6: Unsupported and contradictory claims are flagged during quality audit.
     */
    public function test_quality_analysis_detects_unsupported_and_contradictory_claims(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Quality Audit Test']);
        $resumeId = $createRes->json('resume.id');
        $content = $createRes->json('resume.content');

        // Inject unverified skill and contradictory CGPA into resume content
        $content['skills'][] = [
            'name' => 'Quantum Computing Q#',
            'category' => 'Quantum',
            'proficiency_level' => 'Expert',
            'is_verified' => false,
        ];
        $content['personal_info']['cgpa'] = 9.99; // Contradicts 8.90 in database

        $updateRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/students/me/resumes/{$resumeId}", [
                'content' => $content,
            ]);

        $audit = $updateRes->json('resume.analysis_summary');

        $this->assertNotEmpty($audit['unsupported_claims']);
        $claimTypes = collect($audit['unsupported_claims'])->pluck('type')->all();
        $this->assertContains('UNVERIFIED_SKILL', $claimTypes);
        $this->assertContains('CONTRADICTORY_CGPA', $claimTypes);
    }

    /**
     * Test 7: Resume version snapshots, version history listing, and diff comparison.
     */
    public function test_resume_version_history_and_comparison(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Version Test']);
        $resumeId = $createRes->json('resume.id');

        // Create explicit Version 2 snapshot
        $v2Res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/versions", [
                'change_summary' => 'Added AWS certification and updated summary',
            ]);
        $v2Res->assertStatus(201)
            ->assertJson(['version' => ['version_number' => 2]]);

        // List version history
        $listRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/students/me/resumes/{$resumeId}/versions");
        $listRes->assertStatus(200);
        $this->assertCount(2, $listRes->json('versions'));

        // Compare with baseline profile
        $compareRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/compare", [
                'compare_with_profile' => true,
            ]);
        $compareRes->assertStatus(200)
            ->assertJsonStructure(['comparison' => ['left', 'right']]);
    }

    /**
     * Test 8: Student approval required before final PDF export.
     */
    public function test_student_approval_required_before_pdf_export(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Approval Gate Test']);
        $resumeId = $createRes->json('resume.id');

        // Attempt export without approval -> HTTP 422 APPROVAL_REQUIRED
        $unapprovedRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");

        $unapprovedRes->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'APPROVAL_REQUIRED',
            ]);

        // Student approves resume
        $approveRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");
        $approveRes->assertStatus(200)
            ->assertJson(['status' => 'success']);

        // Now export succeeds
        $exportRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");
        $exportRes->assertStatus(200)
            ->assertJson(['status' => 'success']);
        $this->assertNotEmpty($exportRes->json('pdf_path'));
    }

    /**
     * Test 9: PDF export generates valid binary PDF 1.4 document parseable by smalot/pdfparser across all 3 templates.
     */
    public function test_pdf_generation_integrity_across_templates(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $parser = new PdfParser();

        foreach (['modern', 'classic', 'technical'] as $tmpl) {
            $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson('/api/v1/students/me/resumes', [
                    'title' => "Resume Template {$tmpl}",
                    'template' => $tmpl,
                ]);
            $resumeId = $createRes->json('resume.id');

            // Approve and export
            $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");

            $exportRes = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");
            $exportRes->assertStatus(200);

            $pdfPath = $exportRes->json('pdf_path');
            $this->assertTrue(Storage::disk('local')->exists($pdfPath));

            $pdfBytes = Storage::disk('local')->get($pdfPath);

            // PDF 1.4 Header and EOF verification
            $this->assertStringStartsWith("%PDF-1.4", $pdfBytes);
            $this->assertStringContainsString("%%EOF", $pdfBytes);

            // Parse document content using smalot/pdfparser to verify text layer
            $parsedPdf = $parser->parseContent($pdfBytes);
            $text = $parsedPdf->getText();

            $this->assertStringContainsString('Alice Smith', $text);
            $this->assertStringContainsString('Computer Science and Engineering', $text);
            $this->assertStringContainsString('Laravel', $text);
        }
    }

    /**
     * Test 10: Cross-student resume access restrictions (Student B cannot access Student A's resume).
     */
    public function test_cross_student_resume_access_is_blocked(): void
    {
        // Alice creates resume
        $aliceToken = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Alice Private Resume']);
        $resumeId = $createRes->json('resume.id');

        // Bob attempts to view Alice's resume -> 404
        $this->app['auth']->forgetGuards();
        $bobToken = $this->studentUser2->createToken('bob_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->getJson("/api/v1/students/me/resumes/{$resumeId}")
            ->assertStatus(404);

        // Bob attempts to modify Alice's resume -> 404
        $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->putJson("/api/v1/students/me/resumes/{$resumeId}", ['title' => 'Hacked Title'])
            ->assertStatus(404);

        // Bob attempts to delete Alice's resume -> 404
        $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->deleteJson("/api/v1/students/me/resumes/{$resumeId}")
            ->assertStatus(404);

        // Bob attempts to download Alice's resume PDF -> 404
        $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->getJson("/api/v1/students/me/resumes/{$resumeId}/download-pdf")
            ->assertStatus(404);
    }

    /**
     * Test 11: Authorized Recruiter access when candidate has an active application relationship.
     */
    public function test_authorized_recruiter_resume_download(): void
    {
        // Alice applies to Apex Cloud Systems' job
        Application::create([
            'student_id' => $this->student1->id,
            'job_id' => $this->job->id,
            'status' => 'APPLIED',
            'applied_at' => Carbon::now(),
        ]);

        $aliceToken = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Official Placement Resume']);
        $resumeId = $createRes->json('resume.id');

        $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");
        $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");

        // Recruiter accesses candidate's official resume
        $this->app['auth']->forgetGuards();
        $recruiterToken = $this->recruiterUser->createToken('recruiter_token')->plainTextToken;

        $downloadRes = $this->withHeader('Authorization', 'Bearer ' . $recruiterToken)
            ->getJson("/api/v1/resumes/students/{$this->student1->id}/{$resumeId}/download-pdf");

        $downloadRes->assertStatus(200);
        $this->assertEquals('application/pdf', $downloadRes->headers->get('content-type'));
    }

    /**
     * Test 12: AI service unavailability handling in production mode.
     */
    public function test_ai_service_unavailability_handling(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Offline AI Test']);
        $resumeId = $createRes->json('resume.id');

        // Create an AiManager in production mode pointing to unreachable endpoint
        config(['app.env' => 'production']);
        $prodAiManager = new AiManager('production');

        // Swap AiManager in container
        $this->app->instance(AiManager::class, $prodAiManager);

        // When external AI is unreachable in production, AI endpoints throw structured 503 AI_SERVICE_UNAVAILABLE
        $aiRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/generate-summary");

        $aiRes->assertStatus(503)
            ->assertJson([
                'status' => 'error',
                'code' => 'AI_SERVICE_UNAVAILABLE',
            ]);

        // CRITICAL CHECK: Manual editing and profile management continue to function 100% cleanly
        $manualUpdateRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/students/me/resumes/{$resumeId}", [
                'title' => 'Manually Edited Resume Offline',
                'content' => array_merge($createRes->json('resume.content'), [
                    'summary' => 'Manually authored professional summary written without AI assistance.',
                ]),
            ]);

        $manualUpdateRes->assertStatus(200);
        $this->assertEquals('Manually Edited Resume Offline', $manualUpdateRes->json('resume.title'));
    }

    /**
     * Test 13: Cross-company recruiter access denial and placement officer authorization.
     */
    public function test_unauthorized_cross_company_recruiter_access_is_denied(): void
    {
        // Alice has an approved resume
        $aliceToken = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Alice Private Candidate Resume']);
        $resumeId = $createRes->json('resume.id');

        $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");
        $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");

        // Unaffiliated Recruiter from Beta Corp (Alice NEVER applied to Beta Corp)
        $betaCompany = Company::create(['name' => 'Beta Corp', 'industry' => 'Finance']);
        $betaUser = User::create([
            'email' => 'recruiter@betacorp.com',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);
        Recruiter::create([
            'user_id' => $betaUser->id,
            'company_id' => $betaCompany->id,
            'contact_name' => 'Beta Recruiter',
            'contact_email' => 'recruiter@betacorp.com',
        ]);

        $this->app['auth']->forgetGuards();
        $betaToken = $betaUser->createToken('beta_token')->plainTextToken;

        // Attempting to download Alice's resume solely by knowing studentId and resumeId -> 403 FORBIDDEN
        $unauthorizedRes = $this->withHeader('Authorization', 'Bearer ' . $betaToken)
            ->getJson("/api/v1/resumes/students/{$this->student1->id}/{$resumeId}/download-pdf");

        $unauthorizedRes->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'code' => 'UNAUTHORIZED_RECRUITER_ACCESS',
            ]);

        // Verified Placement Officer access is preserved
        $this->app['auth']->forgetGuards();
        $officerUser = User::create([
            'email' => 'tpo@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);
        $officerToken = $officerUser->createToken('officer_token')->plainTextToken;

        $officerRes = $this->withHeader('Authorization', 'Bearer ' . $officerToken)
            ->getJson("/api/v1/resumes/students/{$this->student1->id}/{$resumeId}/download-pdf");
        $officerRes->assertStatus(200);
        $this->assertEquals('application/pdf', $officerRes->headers->get('content-type'));
    }

    /**
     * Test 14: Editing resume content invalidates student approval and blocks unapproved PDF export.
     */
    public function test_content_edit_invalidates_approval_and_blocks_pdf_export(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Approved Resume v1']);
        $resumeId = $createRes->json('resume.id');

        // Approve and export initially
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve")
            ->assertStatus(200);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf")
            ->assertStatus(200);

        $resume = Resume::find($resumeId);
        $this->assertTrue($resume->isApproved());
        $this->assertNotNull($resume->pdf_path);

        // Edit resume content
        $content = $resume->content;
        $content['summary'] = 'Updated summary with newly acquired skills and leadership experience.';

        $updateRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/students/me/resumes/{$resumeId}", [
                'content' => $content,
            ]);
        $updateRes->assertStatus(200);

        // Verify approval and cached PDF have been invalidated
        $resume->refresh();
        $this->assertFalse($resume->isApproved());
        $this->assertNull($resume->approved_by_student_at);
        $this->assertNull($resume->pdf_path);

        // Attempting to export edited, unapproved resume must fail with HTTP 422 APPROVAL_REQUIRED
        $exportBlocked = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");

        $exportBlocked->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'APPROVAL_REQUIRED',
            ]);

        // Student re-approves -> Export succeeds cleanly
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve")
            ->assertStatus(200);

        $exportSucceeds = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");
        $exportSucceeds->assertStatus(200);
    }

    /**
     * Test 15: Restoring an older version invalidates approval requiring re-review.
     */
    public function test_restore_version_invalidates_approval_and_blocks_export(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Version Invalidation Test']);
        $resumeId = $createRes->json('resume.id');

        // Create Version 2 snapshot
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/versions", [
                'change_summary' => 'Version 2 with expanded tech stack',
            ]);

        // Approve current state
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");
        $this->assertTrue(Resume::find($resumeId)->isApproved());

        // Restore Version 1
        $restoreRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/versions/1/restore");
        $restoreRes->assertStatus(200);

        // Assert approval was invalidated
        $resume = Resume::find($resumeId);
        $this->assertFalse($resume->isApproved());
        $this->assertNull($resume->approved_by_student_at);

        // Export blocked
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf")
            ->assertStatus(422)
            ->assertJson(['code' => 'APPROVAL_REQUIRED']);
    }

    /**
     * Test 16: Authoritative student record change invalidates approved resumes.
     */
    public function test_authoritative_student_record_change_invalidates_approved_resumes(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Official CGPA Resume']);
        $resumeId = $createRes->json('resume.id');

        // Approve and export
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");

        $this->assertTrue(Resume::find($resumeId)->isApproved());

        // Examination cell updates student CGPA from 8.90 to 9.15
        $this->student1->update(['cgpa' => 9.15]);

        // Resume approval must be automatically invalidated
        $resume = Resume::find($resumeId);
        $this->assertFalse($resume->isApproved());
        $this->assertNull($resume->approved_by_student_at);
        $this->assertNull($resume->pdf_path);

        // Export blocked until student updates and re-approves
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf")
            ->assertStatus(422)
            ->assertJson(['code' => 'APPROVAL_REQUIRED']);
    }

    /**
     * Test 17: PDF integrity with Unicode/Indian student names, special characters, and multi-page layout.
     */
    public function test_pdf_unicode_indian_names_special_chars_and_multipage_integrity(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Unicode Multi-Page Test']);
        $resumeId = $createRes->json('resume.id');
        $content = $createRes->json('resume.content');

        // Inject Indian student name and unicode special characters
        $content['personal_info']['full_name'] = 'Aarav Pradeep Sharma';
        $content['summary'] = "Results-oriented software engineer — passionate about building high-throughput systems with ₹10M+ cost savings. Experienced with “microservices”, ‘fault tolerance’, and continuous integration • verified via automated pipelines.";

        // Inject long project descriptions to trigger multi-page layout
        $content['projects'] = [
            [
                'title' => 'Distributed Microservices Architecture Platform',
                'technologies' => 'PHP, Laravel, PostgreSQL, Redis, Docker, Kafka',
                'highlights' => [
                    'Architected distributed microservices platform processing 100,000+ requests/sec with 99.99% availability.',
                    'Engineered resilient message queues with dead-letter queue routing and automated backpressure handling.',
                    'Integrated PostgreSQL row-level pessimistic locking for zero-conflict high-concurrency interview scheduling.',
                    'Built automated failover protocols reducing recovery time objective (RTO) from 45 minutes to under 30 seconds.',
                ],
            ],
            [
                'title' => 'Autonomous Campus Placement Intelligence Engine',
                'technologies' => 'Python, Next.js, FastAPI, PostgreSQL, Docker',
                'highlights' => [
                    'Engineered real-time algorithmic conflict detection across simultaneous corporate placement schedules.',
                    'Implemented comprehensive student journey tracking across eligibility, assessments, and multi-round interviews.',
                    'Developed student readiness index based on verified assessment scores and capstone project competencies.',
                    'Integrated automated audit logging with non-repudiation database triggers preventing unauthorized record alteration.',
                ],
            ],
            [
                'title' => 'Enterprise Security and Identity Governance Suite',
                'technologies' => 'OAuth 2.0, Sanctum, Redis, PostgreSQL, Linux',
                'highlights' => [
                    'Implemented cross-TLD Bearer token authentication architecture compatible with modern browser third-party cookie restrictions.',
                    'Conducted rigorous cryptographic audit verification and vulnerability penetration assessments.',
                    'Enforced granular role-based access control protecting confidential student academic records and offer letters.',
                ],
            ],
            [
                'title' => 'Cloud Native Observability and Metrics Aggregator',
                'technologies' => 'Prometheus, Grafana, OpenTelemetry, Go, Docker',
                'highlights' => [
                    'Designed distributed telemetry collector ingesting 50,000 metric data points per second.',
                    'Implemented synthetic latency probing for international database cluster health monitoring.',
                    'Engineered real-time alerting pipelines with automated webhook notifications and PagerDuty escalation.',
                ],
            ],
            [
                'title' => 'High-Throughput Distributed Cache Cluster',
                'technologies' => 'Redis, C++, Linux Epoll, Consistent Hashing',
                'highlights' => [
                    'Implemented custom consistent hashing ring for zero-downtime cache node expansion and contraction.',
                    'Reduced database read contention by 82% across high-volume placement drive registration bursts.',
                    'Conducted rigorous load testing simulating 10,000 concurrent student applications under 50ms latency.',
                ],
            ],
            [
                'title' => 'Automated Code Assessment Sandbox Infrastructure',
                'technologies' => 'Docker, cgroups, seccomp, Linux Namespaces, Python',
                'highlights' => [
                    'Constructed hardened execution sandbox enforcing strict 2.0s CPU time and 128MB memory caps.',
                    'Restricted network egress and blocked arbitrary system calls to prevent unauthorized host access.',
                    'Evaluated multi-language candidate submissions across automated unit test suites with deterministic scoring.',
                ],
            ],
        ];

        // Save content & approve
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/students/me/resumes/{$resumeId}", ['content' => $content]);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/approve");

        $exportRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/export-pdf");

        $exportRes->assertStatus(200);
        $pdfPath = $exportRes->json('pdf_path');

        $this->assertTrue(Storage::disk('local')->exists($pdfPath));
        $pdfBytes = Storage::disk('local')->get($pdfPath);

        // Verify PDF 1.4 binary structure
        $this->assertStringStartsWith("%PDF-1.4", $pdfBytes);
        $this->assertStringContainsString("%%EOF", $pdfBytes);

        // Verify multi-page generation
        $parser = new PdfParser();
        $parsedPdf = $parser->parseContent($pdfBytes);
        $pages = $parsedPdf->getPages();
        $this->assertGreaterThanOrEqual(2, count($pages), "Expected multi-page PDF document due to comprehensive content.");

        // Verify text extraction preserves Indian name and project details
        $allText = $parsedPdf->getText();
        $this->assertStringContainsString('Aarav Pradeep Sharma', $allText);
        $this->assertStringContainsString('Distributed Microservices', $allText);
        $this->assertStringContainsString('Autonomous Campus Placement', $allText);
    }

    /**
     * Test 18: Protection against arbitrary file path traversal and unauthorized document paths.
     */
    public function test_arbitrary_file_path_traversal_prevention(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'Security Path Test']);
        $resumeId = $createRes->json('resume.id');

        $resume = Resume::find($resumeId);
        $resume->approve();

        // Simulate corrupted or malicious path traversal attack in database record
        $resume->update([
            'pdf_path' => 'resumes/../../../../etc/passwd',
            'pdf_generated_at' => Carbon::now(),
        ]);

        $downloadRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/students/me/resumes/{$resumeId}/download-pdf");

        // Must reject with HTTP 400 INVALID_DOCUMENT_PATH
        $downloadRes->assertStatus(400)
            ->assertJson([
                'status' => 'error',
                'code' => 'INVALID_DOCUMENT_PATH',
            ]);
    }

    /**
     * Test 19: AI transparency metadata confirms simulated development mode and review requirement.
     */
    public function test_ai_output_transparency_and_simulation_markers(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/students/me/resumes', ['title' => 'AI Transparency Test']);
        $resumeId = $createRes->json('resume.id');

        // Professional summary generation
        $summaryRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/generate-summary");

        $summaryRes->assertStatus(200);
        $data = $summaryRes->json();

        // Explicit simulation markers
        $this->assertTrue($data['is_simulated'], "In local/testing environment, AI output must be flagged as simulated.");
        $this->assertEquals('mock', $data['provider']);
        $this->assertTrue($data['review_required'], "AI-generated drafts must explicitly flag review_required=true.");
        $this->assertStringContainsString('SIMULATED_AI_DEVELOPMENT_MODE', $data['notice']);

        // Verify that calling AI generator did NOT automatically approve or commit to the resume model
        $resume = Resume::find($resumeId);
        $this->assertFalse($resume->isApproved());
        $this->assertNull($resume->approved_by_student_at);

        // Project enhancement
        $improveRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/resumes/{$resumeId}/improve-project", [
                'project' => [
                    'title' => 'Database Engine',
                    'technologies' => 'PHP, PostgreSQL',
                    'description' => 'Built database engine with pessimistic locking.',
                ],
            ]);

        $improveRes->assertStatus(200);
        $improveData = $improveRes->json();
        $this->assertTrue($improveData['is_simulated']);
        $this->assertTrue($improveData['review_required']);
    }
}
