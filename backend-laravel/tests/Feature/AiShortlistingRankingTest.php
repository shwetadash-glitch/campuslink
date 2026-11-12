<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Job;
use App\Models\Skill;
use App\Models\StudentSkill;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Enums\UserRole;
use App\Enums\ProficiencyLevel;
use App\Enums\DriveStatus;
use App\Enums\JobStatus;
use App\Services\BranchNormalizationService;
use App\Services\EligibilityService;
use App\Services\CandidateRankingService;

class AiShortlistingRankingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Part 1: Branch Normalization Canonical Taxonomy Mapping
     */
    public function test_branch_normalization_canonical_taxonomy(): void
    {
        // IT
        $this->assertEquals('IT', BranchNormalizationService::normalize('Information Technology'));
        $this->assertEquals('IT', BranchNormalizationService::normalize('it'));
        $this->assertEquals('IT', BranchNormalizationService::normalize('B.Tech IT'));
        $this->assertEquals('IT', BranchNormalizationService::normalize('btech it'));
        $this->assertEquals('IT', BranchNormalizationService::normalize('infotech'));
        $this->assertEquals('IT', BranchNormalizationService::normalize('info tech'));

        // CSE
        $this->assertEquals('CSE', BranchNormalizationService::normalize('Computer Science'));
        $this->assertEquals('CSE', BranchNormalizationService::normalize('cse'));
        $this->assertEquals('CSE', BranchNormalizationService::normalize('cs'));
        $this->assertEquals('CSE', BranchNormalizationService::normalize('Computer Science and Engineering'));
        $this->assertEquals('CSE', BranchNormalizationService::normalize('Computer Science & Engineering'));
        $this->assertEquals('CSE', BranchNormalizationService::normalize('B.Tech CSE'));

        // ECE
        $this->assertEquals('ECE', BranchNormalizationService::normalize('ECE'));
        $this->assertEquals('ECE', BranchNormalizationService::normalize('Electronics & Communication Engineering'));
        $this->assertEquals('ECE', BranchNormalizationService::normalize('Electronics and Communication'));
        $this->assertEquals('ECE', BranchNormalizationService::normalize('electronics and telecommunication'));

        // EEE
        $this->assertEquals('EEE', BranchNormalizationService::normalize('EEE'));
        $this->assertEquals('EEE', BranchNormalizationService::normalize('Electrical and Electronics Engineering'));
        $this->assertEquals('EEE', BranchNormalizationService::normalize('Electrical Engineering'));

        // MECH
        $this->assertEquals('MECH', BranchNormalizationService::normalize('Mechanical'));
        $this->assertEquals('MECH', BranchNormalizationService::normalize('Mechanical Engineering'));
        $this->assertEquals('MECH', BranchNormalizationService::normalize('ME'));

        // CIVIL
        $this->assertEquals('CIVIL', BranchNormalizationService::normalize('Civil'));
        $this->assertEquals('CIVIL', BranchNormalizationService::normalize('Civil Engineering'));
        $this->assertEquals('CIVIL', BranchNormalizationService::normalize('CE'));

        // AIML & DS
        $this->assertEquals('AIML', BranchNormalizationService::normalize('AIML'));
        $this->assertEquals('AIML', BranchNormalizationService::normalize('AI/ML'));
        $this->assertEquals('AIML', BranchNormalizationService::normalize('Artificial Intelligence & Machine Learning'));
        $this->assertEquals('DS', BranchNormalizationService::normalize('Data Science'));
        $this->assertEquals('DS', BranchNormalizationService::normalize('CSE Data Science'));

        // CHEM & BIOTECH
        $this->assertEquals('CHEM', BranchNormalizationService::normalize('Chemical Engineering'));
        $this->assertEquals('BIOTECH', BranchNormalizationService::normalize('Biotechnology'));
    }

    /**
     * Part 1: Branch Allowed Equivalence Engine
     */
    public function test_branch_allowed_equivalence_checks(): void
    {
        $allowed = ['Computer Science', 'CSE', 'IT'];

        // Candidate STU4083 scenario
        $this->assertTrue(BranchNormalizationService::isBranchAllowed('Information Technology', $allowed));
        $this->assertTrue(BranchNormalizationService::isBranchAllowed('B.Tech IT', $allowed));
        $this->assertTrue(BranchNormalizationService::isBranchAllowed('CSE', $allowed));
        $this->assertTrue(BranchNormalizationService::isBranchAllowed('cs', $allowed));

        // Ineligible branch
        $this->assertFalse(BranchNormalizationService::isBranchAllowed('Mechanical Engineering', $allowed));
        $this->assertFalse(BranchNormalizationService::isBranchAllowed('Civil', $allowed));

        // Wildcard ALL
        $this->assertTrue(BranchNormalizationService::isBranchAllowed('Mechanical', ['ALL']));
        // Empty allowed means unrestricted
        $this->assertTrue(BranchNormalizationService::isBranchAllowed('Mechanical', []));
    }

    /**
     * Part 1 Integration: EligibilityService resolves STU4083 branch mismatch
     */
    public function test_eligibility_service_resolves_stu4083_branch_mismatch(): void
    {
        $company = Company::factory()->create(['name' => 'TechCorp']);
        $job = Job::factory()->create([
            'company_id' => $company->id,
            'title' => 'Associate Software Engineer 2026',
            'eligibility_config' => [
                'min_cgpa' => 7.0,
                'max_active_backlogs' => 0,
                'allowed_branches' => ['Computer Science', 'CSE', 'IT'],
            ],
        ]);

        $user = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $student = Student::factory()->create([
            'user_id' => $user->id,
            'student_identifier' => 'STU4083',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'branch' => 'Information Technology',
            'cgpa' => 8.2,
            'backlogs_current' => 0,
        ]);

        $service = new EligibilityService();
        $result = $service->checkHardEligibility($student, $job);

        $this->assertTrue($result['is_eligible']);
        $this->assertEmpty($result['failed_criteria']);
    }

    /**
     * Part 2: Recruiter-Centric Radar Fit & Over-Specialization Priority Test
     * Validates Section 9: Candidate Y (Perfect Fit) outranks Candidate X (Over-Specialized)
     */
    public function test_recruiter_radar_fit_and_ranking_priority(): void
    {
        $company = Company::factory()->create(['name' => 'TechCorp']);
        $job = Job::factory()->create([
            'company_id' => $company->id,
            'title' => 'SWE Backend',
        ]);

        $python = Skill::factory()->create(['name' => 'Python']);
        $sql = Skill::factory()->create(['name' => 'SQL']);
        $docker = Skill::factory()->create(['name' => 'Docker']);

        // Recruiter Requirements: Python (Adv=3), SQL (Interm=2), Docker (Interm=2)
        $job->requirements()->create([
            'skill_id' => $python->id,
            'required_proficiency' => ProficiencyLevel::ADVANCED->value,
            'is_mandatory' => true,
        ]);
        $job->requirements()->create([
            'skill_id' => $sql->id,
            'required_proficiency' => ProficiencyLevel::INTERMEDIATE->value,
            'is_mandatory' => true,
        ]);
        $job->requirements()->create([
            'skill_id' => $docker->id,
            'required_proficiency' => ProficiencyLevel::INTERMEDIATE->value,
            'is_mandatory' => true,
        ]);

        // Candidate X: Over-Specialized (Python Expert=4, SQL Expert=4, Docker missing=0)
        $userX = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $studentX = Student::factory()->create([
            'user_id' => $userX->id,
            'student_identifier' => 'STU_X',
            'first_name' => 'Candidate',
            'last_name' => 'X',
            'cgpa' => 8.5,
        ]);
        StudentSkill::create(['student_id' => $studentX->id, 'skill_id' => $python->id, 'proficiency_level' => ProficiencyLevel::EXPERT->value]);
        StudentSkill::create(['student_id' => $studentX->id, 'skill_id' => $sql->id, 'proficiency_level' => ProficiencyLevel::EXPERT->value]);

        // Candidate Y: Perfect Job Fit (Python Adv=3, SQL Interm=2, Docker Interm=2)
        $userY = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $studentY = Student::factory()->create([
            'user_id' => $userY->id,
            'student_identifier' => 'STU_Y',
            'first_name' => 'Candidate',
            'last_name' => 'Y',
            'cgpa' => 8.0,
        ]);
        StudentSkill::create(['student_id' => $studentY->id, 'skill_id' => $python->id, 'proficiency_level' => ProficiencyLevel::ADVANCED->value]);
        StudentSkill::create(['student_id' => $studentY->id, 'skill_id' => $sql->id, 'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value]);
        StudentSkill::create(['student_id' => $studentY->id, 'skill_id' => $docker->id, 'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value]);

        $rankingService = new CandidateRankingService();

        // Calculate radar fit
        $fitX = $rankingService->calculateRadarFit($studentX, $job, 88.0);
        $fitY = $rankingService->calculateRadarFit($studentY, $job, 82.0);

        // Candidate X JFS = (1.0 + 1.0 + 0) / 3 * 100 = 66.7%
        $this->assertEquals(66.7, $fitX['job_fit_score']);
        $this->assertEquals(2, $fitX['mandatory_met_count']);

        // Candidate Y JFS = (1.0 + 1.0 + 1.0) / 3 * 100 = 100.0%
        $this->assertEquals(100.0, $fitY['job_fit_score']);
        $this->assertEquals(3, $fitY['mandatory_met_count']);

        // Rank the candidates
        $candidates = [
            [
                'student_id' => $studentX->id,
                'student_identifier' => 'STU_X',
                'is_eligible' => true,
                'fit_score' => $fitX['fit_score'],
                'mandatory_met_count' => $fitX['mandatory_met_count'],
                'readiness_score' => 88.0,
                'cgpa' => 8.5,
            ],
            [
                'student_id' => $studentY->id,
                'student_identifier' => 'STU_Y',
                'is_eligible' => true,
                'fit_score' => $fitY['fit_score'],
                'mandatory_met_count' => $fitY['mandatory_met_count'],
                'readiness_score' => 82.0,
                'cgpa' => 8.0,
            ],
        ];

        $ranked = $rankingService->rankCandidates($candidates);

        // Candidate Y MUST outrank Candidate X (Rank #1 vs Rank #2)
        $this->assertEquals('STU_Y', $ranked[0]['student_identifier']);
        $this->assertEquals(1, $ranked[0]['rank']);

        $this->assertEquals('STU_X', $ranked[1]['student_identifier']);
        $this->assertEquals(2, $ranked[1]['rank']);
    }

    /**
     * Part 2: Deterministic 5-Stage Comparator and Continuous Rank Assignment
     */
    public function test_deterministic_5_stage_comparator_and_continuous_ranks(): void
    {
        $rankingService = new CandidateRankingService();

        $candidates = [
            // C1: Ineligible, high score -> should be at bottom with rank null
            [
                'student_identifier' => 'C1_INELIGIBLE',
                'is_eligible' => false,
                'fit_score' => 99.0,
                'mandatory_met_count' => 5,
                'readiness_score' => 95.0,
                'cgpa' => 9.5,
            ],
            // C2: Eligible, fit_score 90.0, mandatory 4
            [
                'student_identifier' => 'C2_FIT_90',
                'is_eligible' => true,
                'fit_score' => 90.0,
                'mandatory_met_count' => 4,
                'readiness_score' => 85.0,
                'cgpa' => 8.5,
            ],
            // C3: Eligible, fit_score 90.0, mandatory 5 (higher mandatory count)
            [
                'student_identifier' => 'C3_FIT_90_MORE_MANDATORY',
                'is_eligible' => true,
                'fit_score' => 90.0,
                'mandatory_met_count' => 5,
                'readiness_score' => 80.0,
                'cgpa' => 8.0,
            ],
            // C4: Eligible, fit_score 95.0 -> should be #1
            [
                'student_identifier' => 'C4_TOP_FIT',
                'is_eligible' => true,
                'fit_score' => 95.0,
                'mandatory_met_count' => 4,
                'readiness_score' => 80.0,
                'cgpa' => 8.0,
            ],
            // C5: Eligible, fit 90.0, mandatory 4, same readiness 85.0, higher CGPA
            [
                'student_identifier' => 'C5_HIGHER_CGPA',
                'is_eligible' => true,
                'fit_score' => 90.0,
                'mandatory_met_count' => 4,
                'readiness_score' => 85.0,
                'cgpa' => 9.0,
            ],
        ];

        $ranked = $rankingService->rankCandidates($candidates);

        // #1 is C4 (fit_score 95.0)
        $this->assertEquals('C4_TOP_FIT', $ranked[0]['student_identifier']);
        $this->assertEquals(1, $ranked[0]['rank']);

        // #2 is C3 (fit 90.0, mandatory 5)
        $this->assertEquals('C3_FIT_90_MORE_MANDATORY', $ranked[1]['student_identifier']);
        $this->assertEquals(2, $ranked[1]['rank']);

        // #3 is C5 (fit 90.0, mandatory 4, readiness 85, CGPA 9.0)
        $this->assertEquals('C5_HIGHER_CGPA', $ranked[2]['student_identifier']);
        $this->assertEquals(3, $ranked[2]['rank']);

        // #4 is C2 (fit 90.0, mandatory 4, readiness 85, CGPA 8.5)
        $this->assertEquals('C2_FIT_90', $ranked[3]['student_identifier']);
        $this->assertEquals(4, $ranked[3]['rank']);

        // Ineligible candidate is at the bottom with rank null (Rank N/A)
        $this->assertEquals('C1_INELIGIBLE', $ranked[4]['student_identifier']);
        $this->assertNull($ranked[4]['rank']);
    }

    /**
     * Full Integration API Test: GET /api/v1/officer/drives/{driveId}/ai-shortlist
     */
    public function test_ai_shortlist_api_endpoint_ranks_candidates_and_fixes_stu4083(): void
    {
        $officer = User::factory()->create(['role' => UserRole::PLACEMENT_OFFICER->value]);

        $company = Company::factory()->create(['name' => 'TechCorp']);
        $recUser = User::factory()->create(['role' => UserRole::RECRUITER->value]);
        Recruiter::create([
            'user_id' => $recUser->id,
            'company_id' => $company->id,
            'contact_name' => 'TechCorp Recruiter',
            'contact_email' => 'techcorp@recruiter.com',
        ]);

        $job = Job::factory()->create([
            'company_id' => $company->id,
            'title' => 'Software Engineer 2026',
            'eligibility_config' => [
                'min_cgpa' => 7.0,
                'max_active_backlogs' => 0,
                'allowed_branches' => ['Computer Science', 'CSE', 'IT'],
            ],
        ]);

        $python = Skill::factory()->create(['name' => 'Python']);
        $sql = Skill::factory()->create(['name' => 'SQL']);

        $job->requirements()->create([
            'skill_id' => $python->id,
            'required_proficiency' => ProficiencyLevel::ADVANCED->value,
            'is_mandatory' => true,
        ]);
        $job->requirements()->create([
            'skill_id' => $sql->id,
            'required_proficiency' => ProficiencyLevel::INTERMEDIATE->value,
            'is_mandatory' => true,
        ]);

        $drive = PlacementDrive::create([
            'company_id' => $company->id,
            'job_id' => $job->id,
            'name' => 'TechCorp Campus Drive 2026',
            'status' => DriveStatus::IN_PROGRESS->value,
            'start_date' => now(),
            'end_date' => now()->addDays(7),
        ]);

        // Student 1: STU4083 (Information Technology, high readiness)
        $user1 = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $stu4083 = Student::factory()->create([
            'user_id' => $user1->id,
            'student_identifier' => 'STU4083',
            'first_name' => 'Rahul',
            'last_name' => 'Sharma',
            'branch' => 'Information Technology',
            'cgpa' => 8.2,
            'backlogs_current' => 0,
        ]);
        StudentSkill::create(['student_id' => $stu4083->id, 'skill_id' => $python->id, 'proficiency_level' => ProficiencyLevel::ADVANCED->value]);
        StudentSkill::create(['student_id' => $stu4083->id, 'skill_id' => $sql->id, 'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value]);

        // Student 2: STU9001 (Mechanical Engineering - Ineligible Branch)
        $user2 = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $stuIneligible = Student::factory()->create([
            'user_id' => $user2->id,
            'student_identifier' => 'STU9001',
            'first_name' => 'Vikram',
            'last_name' => 'Singh',
            'branch' => 'Mechanical Engineering',
            'cgpa' => 8.9,
            'backlogs_current' => 0,
        ]);
        StudentSkill::create(['student_id' => $stuIneligible->id, 'skill_id' => $python->id, 'proficiency_level' => ProficiencyLevel::ADVANCED->value]);

        // Attach candidates to drive
        DriveCandidate::create(['drive_id' => $drive->id, 'student_id' => $stu4083->id]);
        DriveCandidate::create(['drive_id' => $drive->id, 'student_id' => $stuIneligible->id]);

        $response = $this->actingAs($officer)->getJson("/api/v1/officer/drives/{$drive->id}/ai-shortlist");

        $response->assertStatus(200);
        $json = $response->json();

        $this->assertEquals(2, $json['total']);
        $this->assertCount(2, $json['candidates']);

        $c0 = $json['candidates'][0];
        $c1 = $json['candidates'][1];

        // STU4083 must be eligible, ranked #1, and HIGHLY_EMPLOYABLE
        $this->assertEquals('STU4083', $c0['student_identifier']);
        $this->assertEquals(1, $c0['rank']);
        $this->assertTrue($c0['is_eligible']);
        $this->assertEquals('HIGHLY_EMPLOYABLE', $c0['tier']);
        $this->assertGreaterThanOrEqual(75.0, $c0['fit_score']);
        $this->assertNotEmpty($c0['radar_data']);
        $this->assertStringContainsString('Rank #1', $c0['justification']);

        // Ineligible candidate must be at bottom with rank null (Rank N/A)
        $this->assertEquals('STU9001', $c1['student_identifier']);
        $this->assertNull($c1['rank']);
        $this->assertFalse($c1['is_eligible']);
        $this->assertEquals('NOT_READY', $c1['tier']);
        $this->assertNotEmpty($c1['failed_criteria']);
    }

    /**
     * Civil Core Placement Drive: Segregates and Shortlists Civil Candidates with Civil Competencies
     */
    public function test_civil_core_placement_drive_shortlists_and_segregates_civil_candidates(): void
    {
        $officer = User::factory()->create(['role' => UserRole::PLACEMENT_OFFICER->value]);

        $company = Company::factory()->create(['name' => 'L&T Construction']);
        $job = Job::factory()->create([
            'company_id' => $company->id,
            'title' => 'GET - Structural Engineering',
            'employment_type' => 'FULL_TIME',
            'description' => 'Civil structural analysis and site execution.',
            'eligibility_config' => [
                'min_cgpa' => 6.8,
                'max_active_backlogs' => 0,
                'allowed_branches' => ['Civil Engineering', 'CIVIL'],
            ],
        ]);

        $autocad = Skill::factory()->create(['name' => 'AutoCAD Civil']);
        $staad = Skill::factory()->create(['name' => 'STAAD.Pro']);

        $job->requirements()->createMany([
            ['skill_id' => $autocad->id, 'required_proficiency' => ProficiencyLevel::ADVANCED->value, 'is_mandatory' => true],
            ['skill_id' => $staad->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE->value, 'is_mandatory' => true],
        ]);

        $drive = PlacementDrive::create([
            'company_id' => $company->id,
            'job_id' => $job->id,
            'name' => 'L&T Construction Infrastructure Campus Drive 2026',
            'status' => DriveStatus::IN_PROGRESS->value,
            'start_date' => now(),
            'end_date' => now()->addDays(15),
        ]);

        // Student 1: Civil Engineering (With AutoCAD & STAAD.Pro)
        $userCiv = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $stuCivil = Student::factory()->create([
            'user_id' => $userCiv->id,
            'student_identifier' => 'STU_CIVIL_01',
            'first_name' => 'Ramesh',
            'last_name' => 'Patel',
            'branch' => 'Civil Engineering',
            'cgpa' => 8.4,
            'backlogs_current' => 0,
        ]);
        StudentSkill::create(['student_id' => $stuCivil->id, 'skill_id' => $autocad->id, 'proficiency_level' => ProficiencyLevel::ADVANCED->value]);
        StudentSkill::create(['student_id' => $stuCivil->id, 'skill_id' => $staad->id, 'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value]);

        // Student 2: Mechanical Engineering (Ineligible for Civil drive)
        $userMech = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $stuMech = Student::factory()->create([
            'user_id' => $userMech->id,
            'student_identifier' => 'STU_MECH_01',
            'first_name' => 'Anil',
            'last_name' => 'Sharma',
            'branch' => 'Mechanical Engineering',
            'cgpa' => 8.8,
            'backlogs_current' => 0,
        ]);

        DriveCandidate::create(['drive_id' => $drive->id, 'student_id' => $stuCivil->id]);
        DriveCandidate::create(['drive_id' => $drive->id, 'student_id' => $stuMech->id]);

        // Request shortlist
        $response = $this->actingAs($officer)->getJson("/api/v1/officer/drives/{$drive->id}/ai-shortlist");
        $response->assertStatus(200);
        $json = $response->json();

        $this->assertEquals(2, $json['total']);
        $this->assertArrayHasKey('branch_breakdown', $json);
        $this->assertArrayHasKey('drive_info', $json);
        $this->assertStringContainsString('Civil', $json['drive_info']['track']);

        // Civil student is Rank #1
        $c0 = $json['candidates'][0];
        $this->assertEquals('STU_CIVIL_01', $c0['student_identifier']);
        $this->assertEquals(1, $c0['rank']);
        $this->assertTrue($c0['is_eligible']);
        $this->assertEquals('HIGHLY_EMPLOYABLE', $c0['tier']);

        // Mech student is Disqualified
        $c1 = $json['candidates'][1];
        $this->assertEquals('STU_MECH_01', $c1['student_identifier']);
        $this->assertNull($c1['rank']);
        $this->assertFalse($c1['is_eligible']);

        // Test branch filter parameter: ?branch=CIVIL
        $filterRes = $this->actingAs($officer)->getJson("/api/v1/officer/drives/{$drive->id}/ai-shortlist?branch=CIVIL");
        $filterRes->assertStatus(200);
        $filterJson = $filterRes->json();
        $this->assertCount(1, $filterJson['candidates']);
        $this->assertEquals('STU_CIVIL_01', $filterJson['candidates'][0]['student_identifier']);
    }

    /**
     * Mechanical Core Placement Drive: Segregates and Shortlists Mechanical Candidates
     */
    public function test_mechanical_core_placement_drive_shortlists_and_segregates_mechanical_candidates(): void
    {
        $officer = User::factory()->create(['role' => UserRole::PLACEMENT_OFFICER->value]);

        $company = Company::factory()->create(['name' => 'Tata Motors Limited']);
        $job = Job::factory()->create([
            'company_id' => $company->id,
            'title' => 'GET - EV Powertrain & Mechanical Systems',
            'employment_type' => 'FULL_TIME',
            'description' => 'Automotive chassis and thermal CAE design.',
            'eligibility_config' => [
                'min_cgpa' => 6.8,
                'max_active_backlogs' => 0,
                'allowed_branches' => ['Mechanical Engineering', 'MECH'],
            ],
        ]);

        $solidworks = Skill::factory()->create(['name' => 'SolidWorks CAD']);
        $ansys = Skill::factory()->create(['name' => 'ANSYS FEA']);

        $job->requirements()->createMany([
            ['skill_id' => $solidworks->id, 'required_proficiency' => ProficiencyLevel::ADVANCED->value, 'is_mandatory' => true],
            ['skill_id' => $ansys->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE->value, 'is_mandatory' => true],
        ]);

        $drive = PlacementDrive::create([
            'company_id' => $company->id,
            'job_id' => $job->id,
            'name' => 'Tata Motors EV & Automotive Engineering Drive 2026',
            'status' => DriveStatus::IN_PROGRESS->value,
            'start_date' => now(),
            'end_date' => now()->addDays(20),
        ]);

        // Student 1: Mechanical Engineering (With SolidWorks & ANSYS)
        $userMech = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $stuMech = Student::factory()->create([
            'user_id' => $userMech->id,
            'student_identifier' => 'STU_MECH_02',
            'first_name' => 'Sunil',
            'last_name' => 'Verma',
            'branch' => 'Mechanical Engineering',
            'cgpa' => 8.5,
            'backlogs_current' => 0,
        ]);
        StudentSkill::create(['student_id' => $stuMech->id, 'skill_id' => $solidworks->id, 'proficiency_level' => ProficiencyLevel::ADVANCED->value]);
        StudentSkill::create(['student_id' => $stuMech->id, 'skill_id' => $ansys->id, 'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value]);

        // Student 2: Computer Science (Ineligible for Mechanical drive)
        $userCs = User::factory()->create(['role' => UserRole::STUDENT->value]);
        $stuCs = Student::factory()->create([
            'user_id' => $userCs->id,
            'student_identifier' => 'STU_CS_01',
            'first_name' => 'Pooja',
            'last_name' => 'Nair',
            'branch' => 'Computer Science',
            'cgpa' => 9.1,
            'backlogs_current' => 0,
        ]);

        DriveCandidate::create(['drive_id' => $drive->id, 'student_id' => $stuMech->id]);
        DriveCandidate::create(['drive_id' => $drive->id, 'student_id' => $stuCs->id]);

        $response = $this->actingAs($officer)->getJson("/api/v1/officer/drives/{$drive->id}/ai-shortlist");
        $response->assertStatus(200);
        $json = $response->json();

        $this->assertEquals(2, $json['total']);
        $this->assertStringContainsString('Mechanical', $json['drive_info']['track']);

        // Mechanical candidate is Rank #1
        $c0 = $json['candidates'][0];
        $this->assertEquals('STU_MECH_02', $c0['student_identifier']);
        $this->assertEquals(1, $c0['rank']);
        $this->assertTrue($c0['is_eligible']);
        $this->assertEquals('HIGHLY_EMPLOYABLE', $c0['tier']);

        // CS candidate is Disqualified
        $c1 = $json['candidates'][1];
        $this->assertEquals('STU_CS_01', $c1['student_identifier']);
        $this->assertNull($c1['rank']);
        $this->assertFalse($c1['is_eligible']);

        // Test branch filter parameter: ?branch=MECH
        $filterRes = $this->actingAs($officer)->getJson("/api/v1/officer/drives/{$drive->id}/ai-shortlist?branch=MECH");
        $filterRes->assertStatus(200);
        $filterJson = $filterRes->json();
        $this->assertCount(1, $filterJson['candidates']);
        $this->assertEquals('STU_MECH_02', $filterJson['candidates'][0]['student_identifier']);
    }
}
