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
use App\Models\DriveCandidate;
use App\Models\DriveSchedule;
use App\Models\Offer;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Jobs\ProcessNotificationJob;
use App\Services\NotificationService;
use App\Enums\UserRole;
use App\Enums\CandidateDriveStatus;
use App\Enums\OfferStatus;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class Milestone3StudentPlacementJourneyTest extends TestCase
{
    use RefreshDatabase;

    protected User $tpoUser;
    protected User $studentUser1;
    protected User $studentUser2;
    protected Student $student1;
    protected Student $student2;
    protected Company $company;
    protected Recruiter $recruiter;
    protected Job $job;
    protected PlacementDrive $drive;

    protected function setUp(): void
    {
        parent::setUp();

        // TPO User
        $this->tpoUser = User::create([
            'email' => 'tpo_lead@campuslink.edu',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        // Student 1 (Alice: CS, 8.8 CGPA, 0 backlogs, graduating 2026)
        $this->studentUser1 = User::create([
            'email' => 'alice@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student1 = Student::create([
            'user_id' => $this->studentUser1->id,
            'student_identifier' => 'STU-CS-001',
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'branch' => 'CS',
            'graduation_year' => 2026,
            'cgpa' => 8.8,
            'backlogs_current' => 0,
        ]);

        // Student 2 (Bob: EE, 7.1 CGPA, 1 backlog, graduating 2026)
        $this->studentUser2 = User::create([
            'email' => 'bob@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student2 = Student::create([
            'user_id' => $this->studentUser2->id,
            'student_identifier' => 'STU-EE-002',
            'first_name' => 'Bob',
            'last_name' => 'Jones',
            'branch' => 'EE',
            'graduation_year' => 2026,
            'cgpa' => 7.1,
            'backlogs_current' => 1,
        ]);

        // Company & Recruiter
        $this->company = Company::create([
            'name' => 'Acme Corporation',
            'industry' => 'Technology',
            'website' => 'https://acme.example.com',
        ]);

        $recruiterUser = User::create([
            'email' => 'recruiter@acme.example.com',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);

        $this->recruiter = Recruiter::create([
            'user_id' => $recruiterUser->id,
            'company_id' => $this->company->id,
            'contact_name' => 'Acme HR',
            'contact_email' => 'recruiter@acme.example.com',
        ]);

        // Job with strict eligibility
        $this->job = Job::create([
            'company_id' => $this->company->id,
            'title' => 'Software Engineer',
            'description' => 'Core engineering role.',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
            'eligibility_config' => [
                'min_cgpa' => 7.5,
                'allowed_branches' => ['CS', 'IT'],
                'max_active_backlogs' => 0,
            ],
        ]);

        // Placement Drive
        $this->drive = PlacementDrive::create([
            'name' => 'Acme Campus Recruitment 2026',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => Carbon::now()->addDays(5),
            'end_date' => Carbon::now()->addDays(7),
            'registration_deadline' => Carbon::now()->addDays(3),
            'status' => 'PUBLISHED',
            'drive_type' => 'ON_CAMPUS',
            'capacity' => 100,
            'branches' => ['CS', 'IT'],
        ]);
    }

    /**
     * Test 1: Student Placement Dashboard returns unified summary, action items, and schedules.
     */
    public function test_student_placement_dashboard_returns_unified_summary(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        // Register student 1
        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::SHORTLISTED->value,
            'current_round_number' => 1,
            'round_results' => ['round_1' => ['result' => 'PASSED', 'score' => 85]],
            'registered_at' => Carbon::now()->subDays(2),
        ]);

        // Add an interview schedule
        DriveSchedule::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'start_time' => Carbon::now()->addHours(24),
            'end_time' => Carbon::now()->addHours(25),
            'venue' => 'Interview Lab 3',
        ]);

        // Add a pending offer
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'placement_drive_id' => $this->drive->id,
            'drive_candidate_id' => $candidate->id,
            'ctc' => 14.5,
            'offer_date' => Carbon::now(),
            'valid_until' => Carbon::now()->addDays(7),
            'status' => OfferStatus::PENDING,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/students/me/placement-dashboard');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'student' => [
                    'id' => $this->student1->id,
                    'student_identifier' => 'STU-CS-001',
                    'first_name' => 'Alice',
                    'branch' => 'CS',
                ],
                'placement_summary' => [
                    'overall_status' => 'OFFER_RECEIVED',
                    'registered_drives_count' => 1,
                    'active_interviews_count' => 1,
                    'pending_offers_count' => 1,
                    'accepted_offers_count' => 0,
                ],
            ]);

        $data = $response->json();
        $this->assertNotEmpty($data['action_items']);
        $this->assertEquals('PENDING_OFFER_DECISION', $data['action_items'][0]['type']);
        $this->assertEquals($offer->id, $data['action_items'][0]['offer_id']);
        $this->assertCount(1, $data['upcoming_schedules']);
        $this->assertEquals('Interview Lab 3', $data['upcoming_schedules'][0]['venue']);
        $this->assertCount(1, $data['active_applications']);
        $this->assertEquals('SHORTLISTED', $data['active_applications'][0]['current_status']);
    }

    /**
     * Test 2: Available drives evaluates real-time criteria (eligible vs ineligible).
     */
    public function test_available_drives_evaluates_real_time_eligibility(): void
    {
        // Alice (CS, 8.8 CGPA, 0 backlogs) -> Eligible
        $aliceToken = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $aliceRes = $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->getJson('/api/v1/students/me/available-drives');

        $aliceRes->assertStatus(200);
        $aliceDrives = $aliceRes->json('drives');
        $this->assertCount(1, $aliceDrives);
        $this->assertTrue($aliceDrives[0]['is_eligible']);
        $this->assertTrue($aliceDrives[0]['can_register']);
        $this->assertFalse($aliceDrives[0]['is_registered']);

        // Bob (EE, 7.1 CGPA, 1 backlog) -> Ineligible
        $this->app['auth']->forgetGuards();
        $bobToken = $this->studentUser2->createToken('bob_token')->plainTextToken;
        $bobRes = $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->getJson('/api/v1/students/me/available-drives');

        $bobRes->assertStatus(200);
        $bobDrives = $bobRes->json('drives');
        $this->assertCount(1, $bobDrives);
        $this->assertFalse($bobDrives[0]['is_eligible']);
        $this->assertFalse($bobDrives[0]['can_register']);
        $this->assertNotEmpty($bobDrives[0]['eligibility_reasons']);
    }

    /**
     * Test 3: Eligible student can register, generating candidate record, status history, and notification.
     */
    public function test_student_can_register_for_eligible_drive(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/register");

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'candidate' => [
                    'drive_id' => $this->drive->id,
                    'student_id' => $this->student1->id,
                    'status' => 'REGISTERED',
                ],
            ]);

        // Verify database candidate record
        $this->assertDatabaseHas('drive_candidates', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => 'REGISTERED',
        ]);

        // Verify status history
        $this->assertDatabaseHas('drive_candidate_status_histories', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'from_status' => null,
            'to_status' => 'REGISTERED',
        ]);

        // Verify registration confirmation notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->studentUser1->id,
            'notification_type' => 'REGISTRATION_CONFIRMATION',
            'channel' => 'IN_APP',
        ]);
    }

    /**
     * Test 4: Ineligible student cannot register for drive.
     */
    public function test_ineligible_student_cannot_register(): void
    {
        $token = $this->studentUser2->createToken('bob_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/register");

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'INELIGIBLE_FOR_DRIVE',
            ]);

        $this->assertDatabaseMissing('drive_candidates', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student2->id,
        ]);
    }

    /**
     * Test 5: Registration prevented if deadline has expired.
     */
    public function test_registration_prevented_after_deadline(): void
    {
        $this->drive->update([
            'registration_deadline' => Carbon::now()->subHour(),
        ]);

        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/register");

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'REGISTRATION_DEADLINE_EXPIRED',
            ]);
    }

    /**
     * Test 6: Duplicate registration prevented with HTTP 409.
     */
    public function test_duplicate_registration_prevented(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        // First registration
        $first = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/register");
        $first->assertStatus(201);

        // Second registration attempt
        $second = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/register");

        $second->assertStatus(409)
            ->assertJson([
                'status' => 'error',
                'code' => 'ALREADY_REGISTERED',
            ]);
    }

    /**
     * Test 7: Student can withdraw from drive, transitioning to WITHDRAWN.
     */
    public function test_student_can_withdraw_from_drive(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        // Register first
        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::REGISTERED->value,
            'registered_at' => Carbon::now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/drives/{$this->drive->id}/withdraw", [
                'reason' => 'Opting for higher studies.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'candidate' => [
                    'status' => 'WITHDRAWN',
                ],
            ]);

        $this->assertDatabaseHas('drive_candidates', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => 'WITHDRAWN',
        ]);

        $this->assertDatabaseHas('drive_candidate_status_histories', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'from_status' => 'REGISTERED',
            'to_status' => 'WITHDRAWN',
            'reason' => 'Opting for higher studies.',
        ]);
    }

    /**
     * Test 8: Independent multi-drive tracking per student.
     */
    public function test_independent_multi_drive_tracking(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        // Drive B
        $driveB = PlacementDrive::create([
            'name' => 'Beta Systems Recruitment',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => Carbon::now()->addDays(10),
            'status' => 'PUBLISHED',
        ]);

        // Candidate in Drive A: INTERVIEWING
        DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::INTERVIEWING->value,
            'current_round_number' => 2,
        ]);

        // Candidate in Drive B: REGISTERED
        DriveCandidate::create([
            'drive_id' => $driveB->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::REGISTERED->value,
            'current_round_number' => 0,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/students/me/placement-dashboard');

        $response->assertStatus(200);
        $apps = $response->json('active_applications');
        $this->assertCount(2, $apps);

        $statuses = collect($apps)->pluck('current_status')->all();
        $this->assertContains('INTERVIEWING', $statuses);
        $this->assertContains('REGISTERED', $statuses);
    }

    /**
     * Test 9: Offer acceptance synchronizes offer and candidate status to ACCEPTED / OFFER_ACCEPTED.
     */
    public function test_offer_acceptance_synchronizes_candidate_status(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::OFFERED->value,
        ]);

        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'placement_drive_id' => $this->drive->id,
            'drive_candidate_id' => $candidate->id,
            'ctc' => 12.0,
            'offer_date' => Carbon::now(),
            'status' => OfferStatus::PENDING,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/accept", [
                'notes' => 'Thrilled to accept the position!',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'offer' => [
                    'status' => 'ACCEPTED',
                ],
            ]);

        // Verify Offer
        $this->assertEquals(OfferStatus::ACCEPTED, $offer->fresh()->status);
        $this->assertNotNull($offer->fresh()->accepted_at);

        // Verify Candidate status synchronized
        $this->assertEquals(CandidateDriveStatus::OFFER_ACCEPTED->value, $candidate->fresh()->status);

        // Verify Status History
        $this->assertDatabaseHas('drive_candidate_status_histories', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'from_status' => 'OFFERED',
            'to_status' => 'OFFER_ACCEPTED',
        ]);
    }

    /**
     * Test 10: Offer rejection synchronizes offer and candidate status to DECLINED / OFFER_REJECTED.
     */
    public function test_offer_rejection_synchronizes_candidate_status(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::OFFERED->value,
        ]);

        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'placement_drive_id' => $this->drive->id,
            'drive_candidate_id' => $candidate->id,
            'ctc' => 12.0,
            'offer_date' => Carbon::now(),
            'status' => OfferStatus::PENDING,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/reject", [
                'rejection_reason' => 'Relocating to another city for family reasons.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'offer' => [
                    'status' => 'DECLINED',
                    'rejection_reason' => 'Relocating to another city for family reasons.',
                ],
            ]);

        // Verify Offer & Candidate
        $this->assertEquals(OfferStatus::DECLINED, $offer->fresh()->status);
        $this->assertEquals(CandidateDriveStatus::OFFER_REJECTED->value, $candidate->fresh()->status);

        // Verify Status History
        $this->assertDatabaseHas('drive_candidate_status_histories', [
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'from_status' => 'OFFERED',
            'to_status' => 'OFFER_REJECTED',
            'reason' => 'Offer declined by candidate: Relocating to another city for family reasons.',
        ]);
    }

    /**
     * Test 11: Confirm joining advances offer and candidate to JOINED.
     */
    public function test_confirm_joining_advances_to_joined(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::OFFER_ACCEPTED->value,
        ]);

        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'placement_drive_id' => $this->drive->id,
            'drive_candidate_id' => $candidate->id,
            'ctc' => 12.0,
            'offer_date' => Carbon::now()->subDays(5),
            'status' => OfferStatus::ACCEPTED,
            'verification_status' => \App\Enums\OfferVerificationStatus::VERIFIED->value,
        ]);

        $joiningDate = Carbon::now()->addMonths(2)->format('Y-m-d');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/confirm-joining", [
                'joining_date' => $joiningDate,
                'notes' => 'All onboarding documents verified.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'offer' => [
                    'status' => 'JOINED',
                ],
            ]);

        $this->assertEquals(OfferStatus::JOINED, $offer->fresh()->status);
        $this->assertEquals(CandidateDriveStatus::JOINED->value, $candidate->fresh()->status);
    }

    /**
     * Test 12: Student cannot accept or reject another student's offer.
     */
    public function test_student_cannot_act_on_another_students_offer(): void
    {
        // Offer belongs to student 1 (Alice)
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'ctc' => 10.0,
            'offer_date' => Carbon::now(),
            'status' => OfferStatus::PENDING,
        ]);

        // Student 2 (Bob) tries to accept Alice's offer
        $bobToken = $this->studentUser2->createToken('bob_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/accept", [
                'notes' => 'Attempting unauthorized accept',
            ]);

        $response->assertStatus(404);
        $this->assertEquals(OfferStatus::PENDING, $offer->fresh()->status);
    }

    /**
     * Test 13: Core Notifications: listing, unread-count, marking single and all read.
     */
    public function test_notifications_lifecycle(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        // Create 3 notifications
        $n1 = Notification::create([
            'user_id' => $this->studentUser1->id,
            'notification_type' => 'DRIVE_PUBLISHED',
            'channel' => 'IN_APP',
            'title' => 'Drive Published',
            'message' => 'New drive available',
            'status' => 'DELIVERED',
            'read_at' => null,
        ]);

        $n2 = Notification::create([
            'user_id' => $this->studentUser1->id,
            'notification_type' => 'SCHEDULE_MODIFIED',
            'channel' => 'IN_APP',
            'title' => 'Schedule Modified',
            'message' => 'Your interview slot was adjusted',
            'status' => 'DELIVERED',
            'read_at' => null,
        ]);

        $n3 = Notification::create([
            'user_id' => $this->studentUser1->id,
            'notification_type' => 'REGISTRATION_CONFIRMATION',
            'channel' => 'IN_APP',
            'title' => 'Registration Confirmed',
            'message' => 'You are registered',
            'status' => 'READ',
            'read_at' => Carbon::now()->subDay(),
        ]);

        // 1. Unread count check
        $resCount = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/notifications/unread-count');
        $resCount->assertStatus(200)->assertJson(['unread_count' => 2]);

        // 2. Mark n1 as read
        $resMark1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/notifications/{$n1->id}/read");
        $resMark1->assertStatus(200)->assertJson(['status' => 'success']);
        $this->assertEquals('READ', $n1->fresh()->status);
        $this->assertNotNull($n1->fresh()->read_at);

        // Verify unread count is now 1
        $resCount2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/notifications/unread-count');
        $resCount2->assertStatus(200)->assertJson(['unread_count' => 1]);

        // 3. Mark all as read
        $resMarkAll = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/notifications/mark-all-read');
        $resMarkAll->assertStatus(200)->assertJson(['status' => 'success', 'marked_count' => 1]);

        // Verify unread count is now 0
        $resCount3 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/notifications/unread-count');
        $resCount3->assertStatus(200)->assertJson(['unread_count' => 0]);
    }

    /**
     * Test 14: Idempotency deduplication prevents duplicate notifications.
     */
    public function test_notification_idempotency_prevents_duplicate_records(): void
    {
        $notificationService = app(NotificationService::class);

        // Send first notification
        $notif1 = $notificationService->sendNotification([
            'user_id' => $this->studentUser1->id,
            'type' => 'REGISTRATION_CONFIRMATION',
            'channel' => 'IN_APP',
            'title' => 'Registration Confirmed: Acme',
            'message' => 'You have been registered for Acme.',
            'metadata' => [
                'entity_type' => 'drive_candidate',
                'entity_id' => 999,
            ],
            'idempotency_key' => 'registration:student1:drive1',
        ]);

        $this->assertNotNull($notif1);

        // Send duplicate notification with same idempotency key
        $notif2 = $notificationService->sendNotification([
            'user_id' => $this->studentUser1->id,
            'type' => 'REGISTRATION_CONFIRMATION',
            'channel' => 'IN_APP',
            'title' => 'Registration Confirmed: Acme',
            'message' => 'You have been registered for Acme.',
            'metadata' => [
                'entity_type' => 'drive_candidate',
                'entity_id' => 999,
            ],
            'idempotency_key' => 'registration:student1:drive1',
        ]);

        // Should return existing notification and NOT create a second row
        $this->assertEquals($notif1->id, $notif2->id);
        $this->assertEquals(1, Notification::where('idempotency_key', 'registration:student1:drive1')->count());
    }

    /**
     * Test 15: Notification preferences suppress disabled channels and types.
     */
    public function test_notification_preferences_suppress_disabled_notifications(): void
    {
        // Disable DRIVE_PUBLISHED for Alice on IN_APP channel
        NotificationPreference::create([
            'user_id' => $this->studentUser1->id,
            'channel' => 'IN_APP',
            'notification_type' => 'DRIVE_PUBLISHED',
            'is_enabled' => false,
        ]);

        $notificationService = app(NotificationService::class);

        $result = $notificationService->send(
            $this->studentUser1->id,
            'DRIVE_PUBLISHED',
            'New Drive Available',
            'A new drive has been posted',
            ['entity_type' => 'PlacementDrive', 'entity_id' => $this->drive->id],
            'IN_APP'
        );

        $this->assertNull($result);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $this->studentUser1->id,
            'notification_type' => 'DRIVE_PUBLISHED',
        ]);
    }

    /**
     * Test 16: Notification preference GET and PUT endpoints.
     */
    public function test_notification_preference_endpoints(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        // Update preferences
        $updateRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/notifications/preferences', [
                'preferences' => [
                    [
                        'channel' => 'IN_APP',
                        'notification_type' => 'SCHEDULE_MODIFIED',
                        'is_enabled' => false,
                    ],
                    [
                        'channel' => 'EMAIL',
                        'notification_type' => 'OFFER_EXTENDED',
                        'is_enabled' => true,
                    ],
                ],
            ]);

        $updateRes->assertStatus(200)->assertJson(['status' => 'success']);

        // Fetch preferences
        $getRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/notifications/preferences');

        $getRes->assertStatus(200);
        $prefs = $getRes->json('preferences');
        $this->assertCount(2, $prefs);
    }

    /**
     * Test 17: ProcessNotificationJob retry handling on failure.
     */
    public function test_process_notification_job_retry_handling(): void
    {
        $notification = Notification::create([
            'user_id' => $this->studentUser1->id,
            'notification_type' => 'OFFER_EXTENDED',
            'channel' => 'IN_APP',
            'title' => 'Offer Extended',
            'message' => 'Congratulations!',
            'status' => 'PENDING',
            'retry_count' => 2,
            'max_retries' => 3,
        ]);

        $notification->recordFailure('Temporary network timeout during delivery dispatch.');

        $this->assertEquals(3, $notification->retry_count);
        $this->assertEquals('FAILED', $notification->status);
        $this->assertStringContainsString('Temporary network timeout', $notification->last_error);
    }

    /**
     * Test 18: Placement Officer Dashboard returns genuine database aggregations (zero rand() mock values).
     */
    public function test_placement_officer_dashboard_returns_genuine_database_aggregations(): void
    {
        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Alice is placed with 12 LPA offer
        $candAlice = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::JOINED->value,
        ]);

        Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'placement_drive_id' => $this->drive->id,
            'drive_candidate_id' => $candAlice->id,
            'ctc' => 12.0,
            'offer_date' => Carbon::now()->subDays(3),
            'status' => OfferStatus::JOINED,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/officer/dashboard');

        $response->assertStatus(200);
        $data = $response->json();

        // Check genuine DB aggregations
        $this->assertIsInt($data['total_students']);
        $this->assertGreaterThanOrEqual(2, $data['total_students']);
        $this->assertIsInt($data['eligible_students']);
        $this->assertIsInt($data['total_offers']);
        $this->assertEquals(1, $data['total_offers']);
        $this->assertEquals(1, $data['accepted_offers']);
        $this->assertEquals(12.0, (float) $data['average_ctc']);
        $this->assertEquals(12.0, (float) $data['highest_ctc']);

        // Check heatmap preserves expected format with genuine branch data
        $this->assertIsArray($data['heatmap']);
        $csBranch = collect($data['heatmap'])->firstWhere('name', 'CS');
        $this->assertNotNull($csBranch);
        $this->assertGreaterThanOrEqual(1, $csBranch['total']);
        $this->assertEquals(1, $csBranch['placed']);
        $this->assertEquals(12.0, (float) $csBranch['avg_package']);

        // Check active drives list
        $this->assertNotEmpty($data['active_drives']);
        $this->assertEquals('Acme Campus Recruitment 2026', $data['active_drives'][0]['name']);
    }

    /**
     * Test 19: Role-based access control for student placement journey.
     */
    public function test_student_placement_journey_role_authorization(): void
    {
        // Unauthenticated request -> 401
        $this->getJson('/api/v1/students/me/placement-dashboard')
            ->assertStatus(401);

        // TPO cannot access student's personal dashboard endpoint -> 403
        $tpoToken = $this->tpoUser->createToken('tpo_token')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->getJson('/api/v1/students/me/placement-dashboard')
            ->assertStatus(403);
    }

    /**
     * Test 20: Duplicate and invalid offer state transitions are strictly rejected.
     */
    public function test_duplicate_offer_decisions_are_rejected(): void
    {
        $token = $this->studentUser1->createToken('alice_token')->plainTextToken;

        $candidate = DriveCandidate::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::OFFERED->value,
        ]);

        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'placement_drive_id' => $this->drive->id,
            'drive_candidate_id' => $candidate->id,
            'ctc' => 12.0,
            'offer_date' => Carbon::now(),
            'status' => OfferStatus::PENDING,
        ]);

        // Attempting to confirm joining before accepting -> 422
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/confirm-joining", [
                'joining_date' => Carbon::now()->addMonth()->format('Y-m-d'),
            ])
            ->assertStatus(422)
            ->assertJson(['code' => 'INVALID_OFFER_ACTION']);

        // First accept succeeds
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/accept")
            ->assertStatus(200);

        // Second accept attempt -> 422
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/accept")
            ->assertStatus(422)
            ->assertJson(['code' => 'INVALID_OFFER_ACTION']);

        // Attempting to reject an already accepted offer -> 422
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/reject", [
                'rejection_reason' => 'Changed my mind.',
            ])
            ->assertStatus(422)
            ->assertJson(['code' => 'INVALID_OFFER_ACTION']);
    }

    /**
     * Test 21: Cross-student offer document access is strictly blocked.
     */
    public function test_cross_student_offer_document_access_is_blocked(): void
    {
        // Offer belongs to student 2 (Bob)
        $bobsOffer = Offer::create([
            'student_id' => $this->student2->id,
            'recruiter_id' => $this->recruiter->id,
            'job_id' => $this->job->id,
            'ctc' => 15.0,
            'offer_date' => Carbon::now(),
            'status' => OfferStatus::PENDING,
            'offer_letter_url' => 'https://storage.campuslink.edu/offers/letter_bob_002.pdf',
        ]);

        // Alice attempts to access Bob's offer details
        $aliceToken = $this->studentUser1->createToken('alice_token')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->getJson("/api/v1/students/me/offers/{$bobsOffer->id}")
            ->assertStatus(404);

        // Alice attempts to access Bob's offer letter document URL
        $this->withHeader('Authorization', 'Bearer ' . $aliceToken)
            ->getJson("/api/v1/students/me/offers/{$bobsOffer->id}/letter")
            ->assertStatus(404);

        // Bob accesses his own offer letter -> 200
        $this->app['auth']->forgetGuards();
        $bobToken = $this->studentUser2->createToken('bob_token')->plainTextToken;
        $bobRes = $this->withHeader('Authorization', 'Bearer ' . $bobToken)
            ->getJson("/api/v1/students/me/offers/{$bobsOffer->id}/letter");

        $bobRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'offer_letter_url' => 'https://storage.campuslink.edu/offers/letter_bob_002.pdf',
            ]);
    }

    /**
     * Test 22: Email channel delivery restraint: external email provider is not activated.
     */
    public function test_email_channel_delivery_restraint(): void
    {
        $notificationService = app(NotificationService::class);

        // In-App delivery marks DELIVERED
        $inApp = $notificationService->send(
            $this->studentUser1->id,
            'REGISTRATION_CONFIRMATION',
            'In-App Confirmed',
            'Your registration is confirmed.',
            [],
            'IN_APP'
        );
        $this->assertEquals('DELIVERED', $inApp->fresh()->status);
        $this->assertNotNull($inApp->fresh()->delivered_at);

        // Email channel notification remains PENDING (not marked as DELIVERED without active mailer)
        $emailNotif = $notificationService->send(
            $this->studentUser1->id,
            'REGISTRATION_CONFIRMATION',
            'Email Confirmed',
            'Your registration email.',
            [],
            'EMAIL'
        );
        $this->assertEquals('PENDING', $emailNotif->fresh()->status);
        $this->assertNull($emailNotif->fresh()->delivered_at);
        $this->assertStringContainsString('External email delivery provider is not configured', $emailNotif->fresh()->last_error);
    }

    /**
     * Test 23: Deduplication scopes: distinct schedule modifications and reminders remain deliverable.
     */
    public function test_deduplication_scopes_allow_distinct_legitimate_events(): void
    {
        $notificationService = app(NotificationService::class);

        $schedule = DriveSchedule::create([
            'drive_id' => $this->drive->id,
            'student_id' => $this->student1->id,
            'start_time' => Carbon::now()->addDays(2),
            'end_time' => Carbon::now()->addDays(2)->addHour(),
            'venue' => 'Room 101',
        ]);

        // Modification 1
        $n1 = $notificationService->notifyScheduleModification($schedule, 'Room assigned to 101');
        $this->assertNotNull($n1);

        // Repeated execution with same schedule state -> deduplicated
        $n1Repeat = $notificationService->notifyScheduleModification($schedule, 'Room assigned to 101');
        $this->assertEquals($n1->id, $n1Repeat->id);

        // Schedule is genuinely rescheduled 1 day later
        $schedule->update([
            'start_time' => Carbon::now()->addDays(3),
            'end_time' => Carbon::now()->addDays(3)->addHour(),
            'venue' => 'Auditorium Main Hall',
        ]);
        $schedule->touch();

        // Modification 2 with new timestamp -> distinct legitimate notification generated!
        $n2 = $notificationService->notifyScheduleModification($schedule, 'Rescheduled to Auditorium');
        $this->assertNotNull($n2);
        $this->assertNotEquals($n1->id, $n2->id);
    }
}
