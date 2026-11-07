<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Job;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveSchedule;
use App\Models\DriveCandidate;
use App\Models\Offer;
use App\Models\AiInterview;
use App\Models\AiInterviewSession;
use App\Models\EmergencyClearance;
use App\Models\InstitutionalEvent;
use App\Enums\UserRole;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\CandidateDriveStatus;
use App\Enums\DriveStatus;
use App\Services\Analytics\InstitutionalAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class Milestone8Stage3InstitutionalAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $tpoUser;
    protected User $adminUser;
    protected User $studentUser;
    protected User $recruiterUser;
    protected Company $company;
    protected Job $job;
    protected PlacementDrive $drive;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tpoUser = User::create([
            'email' => 'tpo.analytics@campuslink.edu',
            'password_hash' => bcrypt('TpoPass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        $this->adminUser = User::create([
            'email' => 'admin.analytics@campuslink.edu',
            'password_hash' => bcrypt('AdminPass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $this->studentUser = User::create([
            'email' => 'student.analytics@campuslink.edu',
            'password_hash' => bcrypt('StudentPass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->recruiterUser = User::create([
            'email' => 'recruiter.analytics@campuslink.edu',
            'password_hash' => bcrypt('RecruiterPass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);

        $this->company = Company::create([
            'name' => 'Acme Technologies',
            'industry' => 'Software',
            'website' => 'https://acme.example.com',
        ]);

        $this->job = Job::create([
            'company_id' => $this->company->id,
            'title' => 'Software Engineer',
            'description' => 'Core Engineering Role',
            'employment_type' => 'Full-time',
            'location' => 'Bengaluru',
        ]);

        $this->drive = PlacementDrive::create([
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'name' => 'Acme Campus Drive 2026',
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(4),
            'status' => DriveStatus::IN_PROGRESS->value,
        ]);
    }

    protected function createStudent(array $overrides = []): Student
    {
        $unique = uniqid();
        $user = User::create([
            'email' => "student_{$unique}@campuslink.edu",
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        return Student::create(array_merge([
            'user_id' => $user->id,
            'student_identifier' => "STU-{$unique}",
            'first_name' => 'Test',
            'last_name' => "Student {$unique}",
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.50,
            'backlogs_current' => 0,
            'backlogs_history' => 0,
        ], $overrides));
    }

    /**
     * Test 1: Analytics access allowed for PLACEMENT_OFFICER.
     */
    public function test_analytics_access_allowed_for_placement_officer(): void
    {
        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        // Test primary officer route
        $responseOfficer = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview');
        $responseOfficer->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'data' => [
                    'cohort',
                    'participation',
                    'placement',
                    'placements_outside_baseline_eligibility',
                    'compensation',
                    'filters_applied',
                ],
            ]);

        // Test TPO route alias
        $responseTpo = $this->withToken($token)->getJson('/api/v1/tpo/analytics/overview');
        $responseTpo->assertStatus(200)
            ->assertJsonPath('status', 'success');
    }

    /**
     * Test 2: Analytics access allowed for SUPER_ADMIN.
     */
    public function test_analytics_access_allowed_for_super_admin(): void
    {
        $token = $this->adminUser->createToken('admin')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview');
        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');
    }

    /**
     * Test 3: Unauthorized roles and unauthenticated guests are denied.
     */
    public function test_unauthorized_roles_and_guests_are_denied(): void
    {
        // 1. Guest
        $this->getJson('/api/v1/officer/analytics/overview')->assertStatus(401);

        // 2. Student
        $studentToken = $this->studentUser->createToken('student')->plainTextToken;
        $this->withToken($studentToken)->getJson('/api/v1/officer/analytics/overview')->assertStatus(403);

        // 3. Recruiter
        $recruiterToken = $this->recruiterUser->createToken('recruiter')->plainTextToken;
        $this->withToken($recruiterToken)->getJson('/api/v1/officer/analytics/overview')->assertStatus(403);
    }

    /**
     * Test 4: Multiple drive-candidate records do not duplicate a participating student.
     */
    public function test_multiple_drive_candidate_records_do_not_duplicate_participating_student(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        $drive2 = PlacementDrive::create([
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'name' => 'Acme Drive 2',
            'start_date' => now()->addDays(5),
            'end_date' => now()->addDays(6),
            'status' => DriveStatus::IN_PROGRESS->value,
        ]);

        $drive3 = PlacementDrive::create([
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'name' => 'Acme Drive 3',
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(8),
            'status' => DriveStatus::IN_PROGRESS->value,
        ]);

        DriveCandidate::create(['drive_id' => $this->drive->id, 'student_id' => $student->id, 'status' => 'REGISTERED']);
        DriveCandidate::create(['drive_id' => $drive2->id, 'student_id' => $student->id, 'status' => 'SHORTLISTED']);
        DriveCandidate::create(['drive_id' => $drive3->id, 'student_id' => $student->id, 'status' => 'INTERVIEWING']);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(1, $data['participation']['participating_students']);
        $this->assertEquals(3, $data['participation']['gross_applications']);
        $this->assertEquals(100.0, $data['participation']['participation_rate']);
    }

    /**
     * Test 5: A student with only withdrawn candidate records is not counted as participating.
     */
    public function test_student_with_only_withdrawn_candidate_records_is_not_counted_as_participating(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'status' => CandidateDriveStatus::WITHDRAWN->value,
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(0, $data['participation']['participating_students']);
        $this->assertEquals(0, $data['participation']['gross_applications']);
        $this->assertEquals(0.0, $data['participation']['participation_rate']);
    }

    /**
     * Test 6: An off-campus self-reported offer establishes participation without requiring verification.
     */
    public function test_off_campus_offer_establishes_participation_without_verification(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        // Student has 0 drive applications, but has 1 unverified off-campus offer
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Off-Campus Corp',
            'designation' => 'Junior Developer',
            'ctc' => 8.5,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'is_off_campus' => true,
            'offer_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(1, $data['participation']['participating_students']);
        $this->assertEquals(100.0, $data['participation']['participation_rate']);
        // Placed student count must remain 0 because verification_status is PENDING_VERIFICATION
        $this->assertEquals(0, $data['placement']['placed_students']);
    }

    /**
     * Test 7: Students outside baseline cohort are not included in placement rate.
     */
    public function test_students_outside_baseline_cohort_are_excluded_from_placement_rate(): void
    {
        // Student A: Ineligible (backlogs = 1), but has verified accepted offer
        $studentA = $this->createStudent([
            'graduation_year' => 2026,
            'cgpa' => 7.5,
            'backlogs_current' => 1,
        ]);

        Offer::create([
            'student_id' => $studentA->id,
            'company_name' => 'Special Tech',
            'designation' => 'Developer',
            'ctc' => 10.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]);

        // Student B: Eligible (cgpa = 8.0, backlogs = 0), unplaced
        $studentB = $this->createStudent([
            'graduation_year' => 2026,
            'cgpa' => 8.0,
            'backlogs_current' => 0,
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Cohort breakdown
        $this->assertEquals(2, $data['cohort']['total_students']);
        $this->assertEquals(1, $data['cohort']['eligible_students']);
        $this->assertEquals(1, $data['cohort']['ineligible_students']);

        // Placed count in eligible cohort must be 0!
        $this->assertEquals(0, $data['placement']['placed_students']);
        $this->assertEquals(0.0, $data['placement']['placement_rate']);

        // Placements outside baseline eligibility
        $this->assertEquals(1, $data['placements_outside_baseline_eligibility']['total_count']);
        $this->assertEquals('UNAVAILABLE', $data['placements_outside_baseline_eligibility']['special_clearance_association']);
        $this->assertNotEmpty($data['placements_outside_baseline_eligibility']['special_clearance_limitation_note']);
    }

    /**
     * Test 8: A verified accepted or joined offer qualifies for institutional placement.
     */
    public function test_verified_accepted_or_joined_offer_qualifies_for_placement(): void
    {
        $student1 = $this->createStudent(['graduation_year' => 2026]);
        $student2 = $this->createStudent(['graduation_year' => 2026]);

        Offer::create([
            'student_id' => $student1->id,
            'company_name' => 'Company A',
            'designation' => 'SDE',
            'ctc' => 12.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]);

        Offer::create([
            'student_id' => $student2->id,
            'company_name' => 'Company B',
            'designation' => 'SDE',
            'ctc' => 15.0,
            'status' => OfferStatus::JOINED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
            'joining_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(2, $data['cohort']['eligible_students']);
        $this->assertEquals(2, $data['placement']['placed_students']);
        $this->assertEquals(100.0, $data['placement']['placement_rate']);
        $this->assertEquals(0, $data['placement']['unplaced_students']);
    }

    /**
     * Test 9: An unverified accepted offer does NOT qualify for placement.
     */
    public function test_unverified_accepted_offer_does_not_qualify_for_placement(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Company A',
            'designation' => 'SDE',
            'ctc' => 12.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(1, $data['cohort']['eligible_students']);
        $this->assertEquals(0, $data['placement']['placed_students']);
        $this->assertEquals(0.0, $data['placement']['placement_rate']);
        $this->assertEquals(1, $data['placement']['unplaced_students']);
    }

    /**
     * Test 10: Multiple qualifying offers for a single student do not duplicate placement count.
     */
    public function test_multiple_qualifying_offers_for_single_student_do_not_duplicate_placement_count(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        // Offer 1: ACCEPTED + VERIFIED
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Company A',
            'designation' => 'SDE',
            'ctc' => 10.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now()->subDays(5),
            'acceptance_date' => now()->subDays(3),
        ]);

        // Offer 2: JOINED + VERIFIED
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Company B',
            'designation' => 'Senior SDE',
            'ctc' => 16.0,
            'status' => OfferStatus::JOINED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now()->subDays(2),
            'acceptance_date' => now()->subDay(),
            'joining_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(1, $data['cohort']['eligible_students']);
        $this->assertEquals(1, $data['placement']['placed_students']);
        $this->assertEquals(100.0, $data['placement']['placement_rate']);
    }

    /**
     * Test 11: Formally issued offer counts include canonical statuses and exclude withdrawn.
     */
    public function test_formally_issued_offer_counts_include_canonical_statuses_and_exclude_withdrawn(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        $statuses = [
            OfferStatus::PENDING->value,
            OfferStatus::ACCEPTED->value,
            OfferStatus::DECLINED->value,
            OfferStatus::REJECTED->value,
            OfferStatus::DEFERRED->value,
            OfferStatus::JOINED->value,
            OfferStatus::WITHDRAWN->value,
        ];

        foreach ($statuses as $st) {
            Offer::create([
                'student_id' => $student->id,
                'company_name' => "Company for {$st}",
                'designation' => 'Engineer',
                'ctc' => 10.0,
                'status' => $st,
                'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                'offer_date' => now(),
            ]);
        }

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Total 7 created, but WITHDRAWN is excluded -> formally issued must be exactly 6!
        $this->assertEquals(6, $data['participation']['formally_issued_offers']);
    }

    /**
     * Test 12: Compensation ignores unverified, non-accepted/non-joined, null, and non-positive CTC.
     */
    public function test_compensation_ignores_unverified_non_accepted_null_and_non_positive_ctc(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        // 1. ACCEPTED but PENDING_VERIFICATION (CTC = 25.0) -> must be ignored
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Unverified Corp',
            'designation' => 'SDE',
            'ctc' => 25.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        // 2. VERIFIED but REJECTED (CTC = 30.0) -> must be ignored
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Rejected Corp',
            'designation' => 'SDE',
            'ctc' => 30.0,
            'status' => OfferStatus::REJECTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
        ]);

        // 3. VERIFIED + ACCEPTED but CTC = 0 -> must be ignored
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Zero CTC Corp',
            'designation' => 'Intern',
            'ctc' => 0.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
        ]);

        // 4. VERIFIED + ACCEPTED with CTC = 14.5 -> MUST be included
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Qualifying Corp',
            'designation' => 'Software Engineer',
            'ctc' => 14.5,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/compensation?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Only offer 4 is evaluated
        $this->assertEquals(1, $data['student_level_primary']['placed_students_count']);
        $this->assertEquals(14.5, $data['student_level_primary']['highest_ctc']);
        $this->assertEquals(14.5, $data['student_level_primary']['lowest_ctc']);
        $this->assertEquals(14.5, $data['student_level_primary']['average_ctc']);
        $this->assertEquals(14.5, $data['student_level_primary']['median_ctc']);

        $this->assertEquals(1, $data['offer_level_gross']['total_verified_offers']);
        $this->assertEquals(14.5, $data['offer_level_gross']['highest_ctc']);

        // Check exclusions tracking
        $this->assertEquals(1, $data['exclusions']['unverified_or_pending_offers_excluded_count']);
        $this->assertEquals(1, $data['exclusions']['non_accepted_or_joined_offers_excluded_count']);
        $this->assertEquals(1, $data['exclusions']['zero_or_null_ctc_offers_excluded_count']);
    }

    /**
     * Test 13: Offer-level and student-level compensation calculations follow their separate definitions.
     */
    public function test_offer_level_and_student_level_compensation_follow_separate_definitions(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        // Student has two verified accepted offers: 10.0 LPA and 20.0 LPA
        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Company Low',
            'designation' => 'SDE',
            'ctc' => 10.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now()->subDays(5),
            'acceptance_date' => now()->subDays(4),
        ]);

        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Company High',
            'designation' => 'Senior SDE',
            'ctc' => 20.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now()->subDays(2),
            'acceptance_date' => now()->subDay(), // later date + higher ctc -> primary!
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/compensation?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Student-level evaluates only the selected primary offer (20.0)
        $this->assertEquals(1, $data['student_level_primary']['placed_students_count']);
        $this->assertEquals(20.0, $data['student_level_primary']['average_ctc']);
        $this->assertEquals(20.0, $data['student_level_primary']['median_ctc']);

        // Offer-level evaluates both verified offers (10.0 and 20.0) -> avg is 15.0!
        $this->assertEquals(2, $data['offer_level_gross']['total_verified_offers']);
        $this->assertEquals(20.0, $data['offer_level_gross']['highest_ctc']);
        $this->assertEquals(10.0, $data['offer_level_gross']['lowest_ctc']);
        $this->assertEquals(15.0, $data['offer_level_gross']['average_ctc']);
        $this->assertEquals(15.0, $data['offer_level_gross']['median_ctc']);
    }

    /**
     * Test 14: Primary-offer tie-breaking is strictly deterministic across all four tiers.
     */
    public function test_primary_offer_tie_breaker_is_strictly_deterministic(): void
    {
        $service = app(InstitutionalAnalyticsService::class);
        $student = $this->createStudent(['graduation_year' => 2026]);

        // Tier 1: JOINED beats ACCEPTED even if ACCEPTED has higher CTC
        $offerJoined = Offer::create([
            'id' => 101,
            'student_id' => $student->id,
            'company_name' => 'Tier 1 Joined',
            'designation' => 'Engineer',
            'ctc' => 8.0,
            'status' => OfferStatus::JOINED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now()->subDays(5),
            'joining_date' => now(),
        ]);

        $offerAccepted = Offer::create([
            'id' => 102,
            'student_id' => $student->id,
            'company_name' => 'Tier 1 Accepted',
            'designation' => 'Engineer',
            'ctc' => 30.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now()->subDay(),
        ]);

        $primaryTier1 = $service->selectPrimaryOffer([$offerAccepted, $offerJoined]);
        $this->assertNotNull($primaryTier1);
        $this->assertEquals($offerJoined->id, $primaryTier1->id); // JOINED wins over ACCEPTED

        // Tier 2: Both ACCEPTED: later acceptance_date beats earlier acceptance_date
        $offerEarlier = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Earlier Date',
            'designation' => 'Dev',
            'ctc' => 15.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'acceptance_date' => Carbon::parse('2026-09-01 10:00:00'),
            'offer_date' => now(),
        ]);

        $offerLater = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Later Date',
            'designation' => 'Dev',
            'ctc' => 12.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'acceptance_date' => Carbon::parse('2026-10-01 10:00:00'),
            'offer_date' => now(),
        ]);

        $primaryTier2 = $service->selectPrimaryOffer([$offerEarlier, $offerLater]);
        $this->assertNotNull($primaryTier2);
        $this->assertEquals($offerLater->id, $primaryTier2->id); // Later acceptance date wins

        // Tier 3: Same acceptance_date: higher CTC beats lower CTC
        $sameDate = Carbon::parse('2026-10-15 12:00:00');
        $offerLowCtc = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Low CTC',
            'designation' => 'Dev',
            'ctc' => 11.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'acceptance_date' => $sameDate,
            'offer_date' => now(),
        ]);

        $offerHighCtc = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'High CTC',
            'designation' => 'Dev',
            'ctc' => 19.5,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'acceptance_date' => $sameDate,
            'offer_date' => now(),
        ]);

        $primaryTier3 = $service->selectPrimaryOffer([$offerLowCtc, $offerHighCtc]);
        $this->assertNotNull($primaryTier3);
        $this->assertEquals($offerHighCtc->id, $primaryTier3->id); // Higher CTC wins

        // Tier 4: Same date and same CTC: lowest offer ID wins
        $firstCreatedOffer = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'First Created (Lower ID)',
            'designation' => 'Dev',
            'ctc' => 15.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'acceptance_date' => $sameDate,
            'offer_date' => now(),
        ]);

        $secondCreatedOffer = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Second Created (Higher ID)',
            'designation' => 'Dev',
            'ctc' => 15.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'acceptance_date' => $sameDate,
            'offer_date' => now(),
        ]);

        $this->assertLessThan($secondCreatedOffer->id, $firstCreatedOffer->id);

        $primaryTier4 = $service->selectPrimaryOffer([$secondCreatedOffer, $firstCreatedOffer]);
        $this->assertNotNull($primaryTier4);
        $this->assertEquals($firstCreatedOffer->id, $primaryTier4->id); // Lowest ID wins
    }

    /**
     * Test 15: Branch comparison and academic year trends aggregate without PII leakage.
     */
    public function test_branch_comparison_and_trends_aggregate_without_pii(): void
    {
        $student1 = $this->createStudent([
            'first_name' => 'AaravSecret',
            'last_name' => 'SharmaSecret',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2025,
        ]);

        $student2 = $this->createStudent([
            'first_name' => 'DiyaSecret',
            'last_name' => 'PatelSecret',
            'branch' => 'Mechanical Engineering',
            'graduation_year' => 2026,
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        // 1. Branch comparison
        $respBranch = $this->withToken($token)->getJson('/api/v1/officer/analytics/branch-comparison');
        $respBranch->assertStatus(200);
        $contentBranch = $respBranch->getContent();

        $this->assertStringNotContainsString('AaravSecret', $contentBranch);
        $this->assertStringNotContainsString('SharmaSecret', $contentBranch);
        $this->assertStringNotContainsString('DiyaSecret', $contentBranch);
        $this->assertStringNotContainsString('student_', $contentBranch); // No emails

        // 2. Academic year trends
        $respTrends = $this->withToken($token)->getJson('/api/v1/officer/analytics/trends');
        $respTrends->assertStatus(200);
        $contentTrends = $respTrends->getContent();

        $this->assertStringNotContainsString('AaravSecret', $contentTrends);
        $this->assertStringNotContainsString('DiyaSecret', $contentTrends);
        $this->assertStringNotContainsString('student_', $contentTrends);
    }

    /**
     * Test 16: Interview metrics report schema limitation on physical attendance.
     */
    public function test_interview_metrics_report_schema_limitation(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        DriveSchedule::create([
            'drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'start_time' => now()->addHour(),
            'end_time' => now()->addHours(2),
            'status' => 'SCHEDULED',
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/interviews?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals('UNAVAILABLE', $data['attendance_tracking']);
        $this->assertStringContainsString('Physical candidate interview attendance tracking is not persisted', $data['limitation_note']);
        $this->assertEquals(1, $data['scheduled_interviews_count']);
    }

    /**
     * Test 17: Placement Funnel endpoint returns all stages and conversions.
     */
    public function test_placement_funnel_endpoint_returns_stages_and_conversions(): void
    {
        $student = $this->createStudent(['graduation_year' => 2026]);

        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'status' => CandidateDriveStatus::INTERVIEWING->value,
            'current_round_number' => 2,
        ]);

        Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Acme Tech',
            'designation' => 'Developer',
            'ctc' => 12.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/funnel?graduation_year=2026');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(6, $data['stages']);
        $this->assertEquals('total_cohort', $data['stages'][0]['stage']);
        $this->assertEquals(1, $data['stages'][0]['count']);

        $this->assertEquals('verified_placed', $data['stages'][5]['stage']);
        $this->assertEquals(1, $data['stages'][5]['count']);
        $this->assertEquals(100.0, $data['stages'][5]['overall_placement_rate']);
    }

    /**
     * Test 18: Drive metrics listing and drive detail endpoint.
     */
    public function test_drive_metrics_and_drive_detail_endpoints(): void
    {
        $round1 = DriveRound::create([
            'drive_id' => $this->drive->id,
            'round_number' => 1,
            'name' => 'Online Assessment',
            'round_type' => 'ASSESSMENT',
            'status' => 'COMPLETED',
        ]);

        $round2 = DriveRound::create([
            'drive_id' => $this->drive->id,
            'round_number' => 2,
            'name' => 'Technical Interview',
            'round_type' => 'INTERVIEW',
            'status' => 'ONGOING',
        ]);

        $student = $this->createStudent(['graduation_year' => 2026]);

        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'status' => CandidateDriveStatus::INTERVIEWING->value,
            'current_round_number' => 2,
        ]);

        Offer::create([
            'placement_drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'company_name' => $this->company->name,
            'designation' => 'Software Engineer',
            'ctc' => 14.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        // Listing
        $respList = $this->withToken($token)->getJson('/api/v1/officer/analytics/drives');
        $respList->assertStatus(200)
            ->assertJsonPath('status', 'success');
        $this->assertNotEmpty($respList->json('data.data'));

        // Detail
        $respDetail = $this->withToken($token)->getJson("/api/v1/officer/analytics/drives/{$this->drive->id}");
        $respDetail->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.drive.id', $this->drive->id)
            ->assertJsonPath('data.candidates_summary.active_candidates', 1)
            ->assertJsonPath('data.offers_summary.formally_issued_count', 1);
        $this->assertEquals(14.0, $respDetail->json('data.compensation.highest_ctc'));
    }

    /**
     * Test 19: Primary offer with null or zero CTC does not fall back to lower priority offer.
     */
    public function test_primary_offer_with_null_or_zero_ctc_does_not_fall_back_to_lower_priority_offer(): void
    {
        $service = app(InstitutionalAnalyticsService::class);

        // 1. In-memory offer test with NULL CTC: JOINED with null CTC vs ACCEPTED with 16.5 CTC
        $offerJoinedNull = (new Offer([
            'status' => OfferStatus::JOINED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'ctc' => null,
            'offer_date' => now(),
            'acceptance_date' => now(),
            'joining_date' => now(),
        ]))->forceFill(['id' => 101]);

        $offerAcceptedValid = (new Offer([
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'ctc' => 16.5,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]))->forceFill(['id' => 102]);

        // Precedence: JOINED is primary regardless of null CTC
        $primary1 = $service->selectPrimaryOffer([$offerAcceptedValid, $offerJoinedNull]);
        $this->assertNotNull($primary1);
        $this->assertEquals(101, $primary1->id);
        $this->assertNull($primary1->ctc);

        // 2. Database persisted test respecting NOT NULL on offers.ctc (Zero CTC on JOINED vs 22.0 CTC on ACCEPTED)
        $student = $this->createStudent(['graduation_year' => 2027]);

        $offerJoinedZero = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'Zero Corp',
            'designation' => 'Dev',
            'ctc' => 0.0,
            'status' => OfferStatus::JOINED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
            'joining_date' => now(),
        ]);

        $offerAcceptedHigh = Offer::create([
            'student_id' => $student->id,
            'company_name' => 'High Corp',
            'designation' => 'Dev',
            'ctc' => 22.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
        ]);

        $primary2 = $service->selectPrimaryOffer([$offerAcceptedHigh, $offerJoinedZero]);
        $this->assertNotNull($primary2);
        $this->assertEquals($offerJoinedZero->id, $primary2->id);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/compensation?graduation_year=2027');
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(1, $data['student_level_primary']['placed_students_count']);
        $this->assertEquals(0, $data['student_level_primary']['placed_students_with_valid_compensation']);
        $this->assertEquals(1, $data['student_level_primary']['placed_students_with_unspecified_compensation']);
        $this->assertNull($data['student_level_primary']['highest_ctc']);
        $this->assertNull($data['student_level_primary']['average_ctc']);
        $this->assertNull($data['student_level_primary']['median_ctc']);
    }

    /**
     * Test 20: Outside baseline eligibility is the true complement with null CGPA handling.
     */
    public function test_outside_baseline_eligibility_true_complement_with_null_cgpa(): void
    {
        // Eligible student: backlogs = 0, cgpa = 8.5
        $studentEligible = $this->createStudent([
            'graduation_year' => 2028,
            'cgpa' => 8.5,
            'backlogs_current' => 0,
        ]);

        // Ineligible student with null CGPA and 0 backlogs
        $studentNullCgpa = $this->createStudent([
            'graduation_year' => 2028,
            'cgpa' => null,
            'backlogs_current' => 0,
        ]);

        // Ineligible student with positive backlogs and valid CGPA
        $studentBacklog = $this->createStudent([
            'graduation_year' => 2028,
            'cgpa' => 7.0,
            'backlogs_current' => 2,
        ]);

        // Ineligible student with both null CGPA and positive backlogs
        $studentBoth = $this->createStudent([
            'graduation_year' => 2028,
            'cgpa' => null,
            'backlogs_current' => 1,
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/overview?graduation_year=2028');
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(4, $data['cohort']['total_students']);
        $this->assertEquals(1, $data['cohort']['eligible_students']);
        $this->assertEquals(3, $data['cohort']['ineligible_students']);

        // Check exact ineligibility breakdown partitions
        $this->assertEquals(1, $data['cohort']['ineligibility_breakdown']['cgpa_ineligible']); // studentNullCgpa
        $this->assertEquals(1, $data['cohort']['ineligibility_breakdown']['backlog_ineligible']); // studentBacklog
        $this->assertEquals(1, $data['cohort']['ineligibility_breakdown']['both_ineligible']); // studentBoth

        // Verify the sum of partitions equals total ineligible count exactly
        $partitionSum = $data['cohort']['ineligibility_breakdown']['cgpa_ineligible']
            + $data['cohort']['ineligibility_breakdown']['backlog_ineligible']
            + $data['cohort']['ineligibility_breakdown']['both_ineligible'];
        $this->assertEquals($data['cohort']['ineligible_students'], $partitionSum);
    }

    /**
     * Test 21: Interview evaluation metrics separate evaluations from attendance.
     */
    public function test_interview_evaluation_metrics_separate_evaluations_from_attendance(): void
    {
        $student = $this->createStudent(['graduation_year' => 2029]);

        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'status' => CandidateDriveStatus::INTERVIEWING->value,
            'current_round_number' => 2,
            'round_results' => [
                '1' => ['round_number' => 1, 'result' => 'PASSED', 'score' => 85.0],
                '2' => ['round_number' => 2, 'result' => 'FAILED', 'score' => 45.0],
            ],
        ]);

        DriveSchedule::create([
            'drive_id' => $this->drive->id,
            'student_id' => $student->id,
            'start_time' => now()->addHour(),
            'end_time' => now()->addHours(2),
            'status' => 'SCHEDULED',
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withToken($token)->getJson('/api/v1/officer/analytics/interviews?graduation_year=2029');
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(1, $data['scheduled_interviews_count']);
        $this->assertEquals(1, $data['candidates_reached_interview_stage_count']);
        $this->assertEquals(2, $data['completed_round_evaluations_count']); // 2 round evaluations (PASSED, FAILED)
        $this->assertEquals('UNAVAILABLE', $data['attendance_tracking']);
        $this->assertStringContainsString('Physical candidate interview attendance', $data['limitation_note']);
    }

    /**
     * Test 22: Decimal-safe median and average precision calculations.
     */
    public function test_decimal_safe_median_and_average_precision(): void
    {
        $service = app(InstitutionalAnalyticsService::class);

        // Even dataset: [8.35, 9.45, 11.15, 13.85]
        // Middle two values are 9.45 and 11.15. Average = (9.45 + 11.15) / 2 = 20.60 / 2 = 10.30
        $evenValues = [13.85, 8.35, 11.15, 9.45];
        $this->assertEquals(10.30, $service->calculateMedian($evenValues));

        // Odd dataset: [5.50, 7.25, 10.00] -> median is 7.25
        $oddValues = [10.00, 5.50, 7.25];
        $this->assertEquals(7.25, $service->calculateMedian($oddValues));

        // Decimal-safe average: [10.15, 12.35, 14.50] -> sum = 37.00 / 3 = 12.3333... -> 12.33
        $avgValues = [10.15, 12.35, 14.50];
        $this->assertEquals(12.33, $service->calculateAverage($avgValues));

        // Empty dataset returns null
        $this->assertNull($service->calculateMedian([]));
        $this->assertNull($service->calculateAverage([]));
    }
}
