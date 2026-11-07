<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Job;
use App\Models\Venue;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveCandidate;
use App\Models\DriveCandidateStatusHistory;
use App\Models\InstitutionalEvent;
use App\Models\AuditLog;
use App\Models\EmergencyClearance;
use App\Models\DriveSchedule;
use App\Enums\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class Milestone2ConflictDetectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $tpoUser;
    protected Company $company;
    protected Job $job;
    protected Student $student1;
    protected Student $student2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tpoUser = User::create([
            'email' => 'tpo_lead@campuslink.edu',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        $this->company = Company::create([
            'name' => 'Acme Corporation',
            'industry' => 'Technology',
            'website' => 'https://acme.example.com',
        ]);

        $this->job = Job::create([
            'company_id' => $this->company->id,
            'title' => 'Associate Software Engineer',
            'description' => 'Full-stack software engineering position.',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
            'eligibility_config' => [
                'min_cgpa' => 7.5,
                'allowed_branches' => ['CS', 'IT'],
                'max_active_backlogs' => 0,
            ],
        ]);

        $studentUser1 = User::create([
            'email' => 'student.alice@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student1 = Student::create([
            'user_id' => $studentUser1->id,
            'student_identifier' => 'STU-CS-001',
            'first_name' => 'Alice',
            'last_name' => 'Smith',
            'branch' => 'CS',
            'graduation_year' => 2026,
            'cgpa' => 8.8,
            'backlogs_current' => 0,
        ]);

        $studentUser2 = User::create([
            'email' => 'student.bob@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student2 = Student::create([
            'user_id' => $studentUser2->id,
            'student_identifier' => 'STU-EE-002',
            'first_name' => 'Bob',
            'last_name' => 'Jones',
            'branch' => 'EE', // Non-CS branch
            'graduation_year' => 2026,
            'cgpa' => 7.1,
            'backlogs_current' => 1,
        ]);
    }

    /**
     * Test 1: Placement drive creation and multi-round management.
     */
    public function test_placement_drive_and_multi_round_creation(): void
    {
        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Acme Annual Campus Drive 2026',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-11-10 09:00:00',
                'end_date' => '2026-11-10 18:00:00',
                'drive_type' => 'ON_CAMPUS',
                'venue' => 'Main Auditorium',
                'capacity' => 200,
                'branches' => ['CS', 'IT'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('drive.name', 'Acme Annual Campus Drive 2026')
            ->assertJsonPath('drive.lock_version', 1);

        $driveId = $response->json('drive.id');

        // Add Round 1: Online Assessment
        $round1Res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$driveId}/rounds", [
                'round_number' => 1,
                'name' => 'Round 1: Online Coding Assessment',
                'round_type' => 'CODING',
                'start_time' => '2026-11-10 10:00:00',
                'end_time' => '2026-11-10 12:00:00',
                'venue' => 'Computer Center Labs',
                'capacity' => 150,
            ]);

        $round1Res->assertStatus(201)
            ->assertJsonPath('round_number', 1)
            ->assertJsonPath('round_type', 'CODING');

        // Add Round 2: Technical Interview
        $round2Res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$driveId}/rounds", [
                'round_number' => 2,
                'name' => 'Round 2: Technical Interview',
                'round_type' => 'INTERVIEW',
                'start_time' => '2026-11-10 14:00:00',
                'end_time' => '2026-11-10 17:00:00',
                'venue' => 'Interview Rooms A-C',
                'capacity' => 40,
            ]);

        $round2Res->assertStatus(201)
            ->assertJsonPath('round_number', 2);

        // Verify retrieval of drive with rounds
        $getRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/tpo/drives/{$driveId}");

        $getRes->assertStatus(200)
            ->assertJsonCount(2, 'rounds')
            ->assertJsonPath('rounds.0.name', 'Round 1: Online Coding Assessment')
            ->assertJsonPath('rounds.1.name', 'Round 2: Technical Interview');
    }

    /**
     * Test 2: Conflict Detection - Academic examination collision triggers HTTP 409 with alternative slots.
     */
    public function test_conflict_detection_academic_examination_overlap(): void
    {
        // Institutional Event: End-Semester Examinations covering CS
        InstitutionalEvent::create([
            'title' => 'End-Semester Theory Examinations',
            'event_type' => 'EXAMINATION',
            'start_time' => '2026-11-15 09:00:00',
            'end_time' => '2026-11-15 13:00:00',
            'affects_branches' => ['CS', 'IT', 'EC'],
            'is_hard_blackout' => true,
            'notes' => 'Mandatory university examination window. No extracurriculars permitted.',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Attempt to schedule a drive during the examination
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Conflicting FinTech Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-11-15 10:00:00',
                'end_date' => '2026-11-15 12:00:00',
                'drive_type' => 'ON_CAMPUS',
                'venue' => 'Seminar Hall',
                'branches' => ['CS'],
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('code', 'SCHEDULE_CONFLICT')
            ->assertJsonPath('conflicts.0.conflict_type', 'ACADEMIC_EXAMINATION_COLLISION')
            ->assertJsonPath('conflicts.0.severity', 'CRITICAL');

        $this->assertGreaterThan(0, count($response->json('alternative_slots')));
        $this->assertNotEmpty($response->json('alternative_slots.0.recommendation_reason'));
    }

    /**
     * Test 3: Conflict Detection - Venue double-booking collision triggers HTTP 409.
     */
    public function test_conflict_detection_venue_collision(): void
    {
        Venue::create([
            'name' => 'Conference Hall A',
            'building' => 'Academic Block 1',
            'capacity' => 100,
            'is_virtual' => false,
        ]);

        // Drive 1 booked in Conference Hall A
        $drive1 = PlacementDrive::create([
            'name' => 'Existing Company Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-11-20 09:00:00',
            'end_date' => '2026-11-20 17:00:00',
            'venue' => 'Conference Hall A',
            'status' => 'PUBLISHED',
        ]);

        DriveRound::create([
            'drive_id' => $drive1->id,
            'round_number' => 1,
            'name' => 'Aptitude Test',
            'round_type' => 'ASSESSMENT',
            'start_time' => '2026-11-20 10:00:00',
            'end_time' => '2026-11-20 12:00:00',
            'venue' => 'Conference Hall A',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Drive 2 attempting to book Conference Hall A during overlapping 11:00 - 13:00
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Second Company Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-11-20 11:00:00',
                'end_date' => '2026-11-20 13:00:00',
                'venue' => 'Conference Hall A',
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('code', 'SCHEDULE_CONFLICT')
            ->assertJsonPath('conflicts.0.conflict_type', 'VENUE_COLLISION');

        // Verify alternative slot recommends virtual substitution or alternative slot
        $alternatives = $response->json('alternative_slots');
        $this->assertNotEmpty($alternatives);
    }

    /**
     * Test 4: Audited Administrative Override logs to immutable audit_logs.
     */
    public function test_audited_administrative_override_records_to_audit_logs(): void
    {
        // Create soft conflicting event
        InstitutionalEvent::create([
            'title' => 'Department Technical Symposium',
            'event_type' => 'SYMPOSIUM',
            'start_time' => '2026-11-25 09:00:00',
            'end_time' => '2026-11-25 12:00:00',
            'affects_branches' => ['CS'],
            'is_hard_blackout' => false,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Attempt override without justification -> validation failure
        $failRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'VIP Recruiter Priority Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-11-25 10:00:00',
                'end_date' => '2026-11-25 12:00:00',
                'venue' => 'Virtual (Zoom)',
                'branches' => ['CS'],
                'force' => true,
                // override_justification omitted
            ]);

        $failRes->assertStatus(422);

        // Attempt override with valid justification
        $successRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'VIP Recruiter Priority Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-11-25 10:00:00',
                'end_date' => '2026-11-25 12:00:00',
                'venue' => 'Virtual (Zoom)',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Approved by Dean of Academics: Participating students have already completed practical exam in Batch A.',
            ]);

        $successRes->assertStatus(201)
            ->assertJsonPath('overridden', true);

        $driveId = $successRes->json('drive.id');

        // Verify audit log entry was written
        $audit = AuditLog::where('entity_type', 'PlacementDrive')
            ->where('entity_id', $driveId)
            ->where('action', 'SCHEDULE_CONFLICT_OVERRIDE')
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals($this->tpoUser->id, $audit->user_id);
        $this->assertStringContainsString('Approved by Dean of Academics', $audit->new_values['override_justification']);

        // Verify audit log is immutable
        $this->expectException(\RuntimeException::class);
        $audit->update(['action' => 'TAMPERED']);
    }

    /**
     * Test 5: Placement lifecycle transitions per student-drive application with immutable history.
     */
    public function test_placement_lifecycle_and_candidate_status_histories(): void
    {
        $driveA = PlacementDrive::create([
            'name' => 'Company Alpha Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-01 09:00:00',
            'end_date' => '2026-12-01 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        $driveB = PlacementDrive::create([
            'name' => 'Company Beta Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-05 09:00:00',
            'end_date' => '2026-12-05 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        // Student 1 registers for BOTH drives simultaneously
        $candidateA = DriveCandidate::create([
            'drive_id' => $driveA->id,
            'student_id' => $this->student1->id,
            'status' => 'REGISTERED',
        ]);

        $candidateB = DriveCandidate::create([
            'drive_id' => $driveB->id,
            'student_id' => $this->student1->id,
            'status' => 'REGISTERED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Progress Drive A: REGISTERED -> SHORTLISTED
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$driveA->id}/transition-candidate/{$candidateA->id}", [
                'new_status' => 'SHORTLISTED',
                'reason' => 'Passed initial resume screening and eligibility criteria.',
            ]);
        $res1->assertStatus(200);

        // Progress Drive A: SHORTLISTED -> INTERVIEWING
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$driveA->id}/transition-candidate/{$candidateA->id}", [
                'new_status' => 'INTERVIEWING',
                'reason' => 'Scored 94% on coding assessment and advanced to interviews.',
            ]);
        $res2->assertStatus(200);

        // Progress Drive A: ROUND_1_CLEARED -> OFFERED
        $res3 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$driveA->id}/transition-candidate/{$candidateA->id}", [
                'new_status' => 'OFFERED',
                'reason' => 'Selected by interviewing panel.',
            ]);
        $res3->assertStatus(200);

        // Verify status histories in Drive A
        $historyRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/tpo/drives/{$driveA->id}/candidate-histories");

        $historyRes->assertStatus(200)
            ->assertJsonCount(3); // 3 transitions recorded

        // Verify candidate B in Drive B remains REGISTERED independently
        $this->assertEquals('REGISTERED', $candidateB->fresh()->status);

        // Terminal State Guard: Attempting transition from REJECTED to active state must fail
        $candidateA->transitionTo('REJECTED', $this->tpoUser->id, 'Declined final offer.');

        $rejectRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$driveA->id}/transition-candidate/{$candidateA->id}", [
                'new_status' => 'OFFERED',
                'reason' => 'Invalid attempt to re-offer without formal override.',
            ]);

        $rejectRes->assertStatus(422)
            ->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');

        // Verify DriveCandidateStatusHistory is immutable
        $historyRecord = DriveCandidateStatusHistory::first();
        $this->assertNotNull($historyRecord);

        try {
            $historyRecord->update(['to_status' => 'TAMPERED']);
            $this->fail('Expected RuntimeException on status history update was not thrown.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
    }

    /**
     * Test 6: Optimistic Concurrency Control guards against concurrent conflicting updates.
     */
    public function test_optimistic_concurrency_control_prevents_stale_updates(): void
    {
        $drive = PlacementDrive::create([
            'name' => 'Concurrent Test Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-10 09:00:00',
            'end_date' => '2026-12-10 17:00:00',
            'status' => 'PUBLISHED',
            'lock_version' => 1,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Transaction A: Updates drive using current version 1
        $updateA = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/tpo/drives/{$drive->id}", [
                'lock_version' => 1,
                'name' => 'Updated by User A',
                'capacity' => 120,
            ]);

        $updateA->assertStatus(200)
            ->assertJsonPath('drive.lock_version', 2);

        // Transaction B: Stale client attempts update using outdated lock_version 1
        $updateB = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/tpo/drives/{$drive->id}", [
                'lock_version' => 1, // Stale version
                'name' => 'Conflicting update by User B',
                'capacity' => 150,
            ]);

        $updateB->assertStatus(409)
            ->assertJsonPath('code', 'CONCURRENT_MODIFICATION_DETECTED')
            ->assertJsonPath('current_lock_version', 2);

        // Verify drive state was preserved from Transaction A
        $this->assertEquals('Updated by User A', $drive->fresh()->name);
    }

    /**
     * Test 7: Scheduler events feed correctly formats multi-entity calendar events.
     */
    public function test_scheduler_events_calendar_feed(): void
    {
        // 1. Institutional Event
        InstitutionalEvent::create([
            'title' => 'Annual Cultural Fest',
            'event_type' => 'SYMPOSIUM',
            'start_time' => '2026-10-16 09:00:00',
            'end_time' => '2026-10-16 18:00:00',
            'is_hard_blackout' => false,
        ]);

        // 2. Drive Round
        $drive = PlacementDrive::create([
            'name' => 'TechCorp Aptitude Test Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-10-16 10:00:00',
            'end_date' => '2026-10-16 12:00:00',
            'status' => 'PUBLISHED',
        ]);

        DriveRound::create([
            'drive_id' => $drive->id,
            'round_number' => 1,
            'name' => 'Aptitude Test',
            'round_type' => 'TEST',
            'start_time' => '2026-10-16 10:00:00',
            'end_time' => '2026-10-16 12:00:00',
            'venue' => 'Computer Center Labs',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/tpo/scheduler/events?start_date=2026-10-01&end_date=2026-10-31');

        $response->assertStatus(200)
            ->assertJsonCount(2);

        $events = $response->json();
        $types = array_column($events, 'type');
        $this->assertContains('SYMPOSIUM', $types);
        $this->assertContains('TEST', $types);
    }

    /**
     * Test 8: Ordinary administrative force=true CANNOT bypass hard institutional blackouts.
     */
    public function test_ordinary_force_override_cannot_bypass_hard_blackout(): void
    {
        InstitutionalEvent::create([
            'title' => 'UGC Central University Final Examinations',
            'event_type' => 'EXAMINATION',
            'start_time' => '2026-12-15 09:00:00',
            'end_time' => '2026-12-15 13:00:00',
            'affects_branches' => ['CS', 'IT'],
            'is_hard_blackout' => true,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Ordinary force=true without emergency authorization must be rejected with HTTP 403
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'High-Frequency Trading Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-15 10:00:00',
                'end_date' => '2026-12-15 12:00:00',
                'venue' => 'Audi 1',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Recruiter cannot attend on any other day.',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('code', 'HARD_BLACKOUT_VIOLATION')
            ->assertJsonPath('status', 'error');

        $this->assertStringContainsString('cannot be overridden by standard administrative force flags', $response->json('message'));
    }

    /**
     * Test 9: Valid Emergency Clearance Code authorizes hard blackout override with dedicated audit action.
     */
    public function test_emergency_clearance_code_allows_hard_blackout_override(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'National Accreditation Inspection Blackout',
            'event_type' => 'INSPECTION',
            'start_time' => '2026-12-18 09:00:00',
            'end_time' => '2026-12-18 17:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'vice_chancellor@campuslink.edu',
            'password_hash' => bcrypt('AdminPass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $event->id,
            'target_drive_name' => 'State Defense Recruitment Special Drive',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'Prof. K. R. Sharma, Vice Chancellor',
            'approving_authority_role' => 'VICE_CHANCELLOR',
            'reason' => 'Authorized by Vice Chancellor and Executive Syndicate for national placement mandate.',
            'valid_minutes' => 60,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'State Defense Recruitment Special Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-18 10:00:00',
                'end_date' => '2026-12-18 14:00:00',
                'venue' => 'Secure Lab Block',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Authorized by Vice Chancellor and Executive Syndicate for national placement mandate.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('overridden', true);

        $driveId = $response->json('drive.id');

        // Verify dedicated emergency audit log
        $audit = AuditLog::where('entity_type', 'PlacementDrive')
            ->where('entity_id', $driveId)
            ->where('action', 'EMERGENCY_HARD_BLACKOUT_OVERRIDE')
            ->first();

        $this->assertNotNull($audit);
        $this->assertTrue($audit->new_values['is_emergency_clearance']);
        $this->assertEquals('Prof. K. R. Sharma, Vice Chancellor', $audit->new_values['approving_authority']);
        $this->assertEquals('VICE_CHANCELLOR', $audit->new_values['approving_role']);
        $this->assertTrue($audit->new_values['token_redacted']);
        $this->assertArrayNotHasKey('raw_clearance_code', $audit->new_values);
    }

    /**
     * Test 18: Invalid emergency clearance code is rejected with HTTP 403 INVALID_CLEARANCE_CODE.
     */
    public function test_invalid_emergency_clearance_code_rejected(): void
    {
        InstitutionalEvent::create([
            'title' => 'Mandatory Convocation Rehearsal Blackout',
            'event_type' => 'CONVOCATION',
            'start_time' => '2026-12-19 09:00:00',
            'end_time' => '2026-12-19 14:00:00',
            'affects_branches' => ['CS'],
            'is_hard_blackout' => true,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Forged Clearance Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-19 10:00:00',
                'end_date' => '2026-12-19 12:00:00',
                'venue' => 'Main Hall',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Attempting override with non-existent emergency clearance code.',
                'emergency_clearance_code' => 'EMG-FORGED-CODE-999',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('code', 'INVALID_CLEARANCE_CODE');
    }

    /**
     * Test 19: Expired emergency clearance code is rejected with HTTP 403 CLEARANCE_EXPIRED.
     */
    public function test_expired_emergency_clearance_code_rejected(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'Senate Annual Meeting Blackout',
            'event_type' => 'MEETING',
            'start_time' => '2026-12-23 09:00:00',
            'end_time' => '2026-12-23 15:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'dean_senate@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $event->id,
            'target_drive_name' => 'Expired Clearance Drive',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'Dr. A. Verma, Dean',
            'approving_authority_role' => 'DEAN_ACADEMICS',
            'reason' => 'Granted temporarily for special slot.',
            'valid_minutes' => -10, // Already expired 10 minutes ago
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Expired Clearance Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-23 10:00:00',
                'end_date' => '2026-12-23 12:00:00',
                'venue' => 'Audi 2',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Presenting expired waiver.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('code', 'CLEARANCE_EXPIRED');
    }

    /**
     * Test 20: Reused emergency clearance code is rejected with HTTP 403 CLEARANCE_ALREADY_USED.
     */
    public function test_reused_emergency_clearance_code_rejected(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'Governor Visit Blackout',
            'event_type' => 'VISIT',
            'start_time' => '2026-12-26 09:00:00',
            'end_time' => '2026-12-26 18:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'registrar@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $event->id,
            'target_drive_name' => 'Authorized Drive 1',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'Registrar Office',
            'approving_authority_role' => 'REGISTRAR',
            'reason' => 'Single-use waiver for premier drive.',
            'valid_minutes' => 120,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // 1. First redemption succeeds
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Authorized Drive 1',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-26 10:00:00',
                'end_date' => '2026-12-26 12:00:00',
                'venue' => 'Seminar Hall 1',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Authorized waiver.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $res1->assertStatus(201);

        // 2. Second attempt using identical clearance code must fail
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Authorized Drive 1',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-26 13:00:00',
                'end_date' => '2026-12-26 15:00:00',
                'venue' => 'Seminar Hall 2',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Attempting to reuse consumed clearance.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $res2->assertStatus(403)
            ->assertJsonPath('code', 'CLEARANCE_ALREADY_USED');
    }

    /**
     * Test 21: Emergency clearance code bound to Event A cannot be redeemed for Event B.
     */
    public function test_event_mismatch_emergency_clearance_rejected(): void
    {
        $eventA = InstitutionalEvent::create([
            'title' => 'Event A - Special Audit',
            'event_type' => 'AUDIT',
            'start_time' => '2026-12-27 09:00:00',
            'end_time' => '2026-12-27 12:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $eventB = InstitutionalEvent::create([
            'title' => 'Event B - State Exam',
            'event_type' => 'EXAMINATION',
            'start_time' => '2026-12-27 14:00:00',
            'end_time' => '2026-12-27 18:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'admin_provost@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        // Issued specifically for Event A
        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $eventA->id,
            'target_drive_name' => 'Mismatch Event Drive',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'Provost Office',
            'approving_authority_role' => 'PROVOST',
            'reason' => 'Clearance granted strictly for morning audit window.',
            'valid_minutes' => 120,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Attempting to redeem during Event B afternoon window
        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Mismatch Event Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-27 15:00:00',
                'end_date' => '2026-12-27 17:00:00',
                'venue' => 'Lab B',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Attempting to use Event A clearance for Event B.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $res->assertStatus(403)
            ->assertJsonPath('code', 'CLEARANCE_EVENT_MISMATCH');
    }

    /**
     * Test 22: Emergency clearance code bound to Drive A cannot be redeemed for Drive B.
     */
    public function test_drive_mismatch_emergency_clearance_rejected(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'National Holiday Blackout',
            'event_type' => 'HOLIDAY',
            'start_time' => '2026-12-29 09:00:00',
            'end_time' => '2026-12-29 18:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'admin_provost_2@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $event->id,
            'target_drive_name' => 'Specific Permitted Drive',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'Executive Committee',
            'approving_authority_role' => 'EXECUTIVE_COMMITTEE',
            'reason' => 'Clearance granted strictly to Specific Permitted Drive.',
            'valid_minutes' => 120,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Attempting to redeem for different drive name
        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Different Unapproved Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-29 10:00:00',
                'end_date' => '2026-12-29 12:00:00',
                'venue' => 'Lab C',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Using someone else clearance.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $res->assertStatus(403)
            ->assertJsonPath('code', 'CLEARANCE_DRIVE_MISMATCH');
    }

    /**
     * Test 23: Student role cannot redeem emergency clearances.
     */
    public function test_unauthorized_user_cannot_redeem_clearance(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'Autonomous Testing Blackout',
            'event_type' => 'TESTING',
            'start_time' => '2026-12-30 09:00:00',
            'end_time' => '2026-12-30 18:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'superadmin_test@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $event->id,
            'target_drive_name' => 'Student Hijack Drive',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'VC Office',
            'approving_authority_role' => 'VICE_CHANCELLOR',
            'reason' => 'Executive mandate.',
            'valid_minutes' => 60,
        ]);

        $studentUser = User::where('role', UserRole::STUDENT->value)->first();

        $this->expectException(\App\Exceptions\ClearanceValidationException::class);
        $this->expectExceptionMessage('is not authorized to execute emergency hard-blackout clearance overrides');

        EmergencyClearance::validateAndConsume(
            $issued['raw_clearance_code'],
            $event->id,
            null,
            'Student Hijack Drive',
            $studentUser
        );
    }

    /**
     * Test 24: Super Admin can issue emergency clearance codes via dedicated API.
     */
    public function test_super_admin_can_issue_emergency_clearance_via_api(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'VIP Summit Window',
            'event_type' => 'SUMMIT',
            'start_time' => '2026-12-31 09:00:00',
            'end_time' => '2026-12-31 18:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $admin = User::create([
            'email' => 'superadmin_api@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/emergency-clearance/issue', [
                'institutional_event_id' => $event->id,
                'target_drive_name' => 'Presidential Placement Drive',
                'reason' => 'National strategic placement mandate approved by Academic Council.',
                'approving_authority_name' => 'Dr. S. Nair, Academic Dean',
                'approving_authority_role' => 'DEAN_ACADEMICS',
                'valid_minutes' => 180,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('bound_event_id', $event->id)
            ->assertJsonPath('target_drive_name', 'Presidential Placement Drive');

        $rawCode = $response->json('raw_clearance_code');
        $this->assertNotEmpty($rawCode);
        $this->assertStringStartsWith('EMG-', $rawCode);

        // Verify stored in database as hash, NOT plaintext
        $record = EmergencyClearance::find($response->json('clearance_id'));
        $this->assertNotNull($record);
        $this->assertEquals(hash('sha256', $rawCode), $record->clearance_token_hash);
    }

    /**
     * Test 26: Separation of duties (two-person rule): Approving authority cannot redeem own clearance.
     */
    public function test_issuer_cannot_redeem_own_emergency_clearance(): void
    {
        $event = InstitutionalEvent::create([
            'title' => 'Executive Accreditation Review',
            'event_type' => 'INSPECTION',
            'start_time' => '2027-01-02 09:00:00',
            'end_time' => '2027-01-02 18:00:00',
            'affects_branches' => ['ALL'],
            'is_hard_blackout' => true,
        ]);

        $superAdmin = User::create([
            'email' => 'dean_executive@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        $issued = EmergencyClearance::issue([
            'institutional_event_id' => $event->id,
            'target_drive_name' => 'Self Clearance Attempt Drive',
            'approved_by_user_id' => $superAdmin->id,
            'approving_authority_name' => 'Dean Executive',
            'approving_authority_role' => 'DEAN',
            'reason' => 'Emergency override request.',
            'valid_minutes' => 60,
        ]);

        // 1. Approving authority attempts to redeem their own clearance -> FAILS (two-person rule)
        $adminToken = $superAdmin->createToken('admin_token')->plainTextToken;
        $failRes = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Self Clearance Attempt Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2027-01-02 10:00:00',
                'end_date' => '2027-01-02 12:00:00',
                'venue' => 'Audi 5',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Self-cleared override attempt.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $failRes->assertStatus(403)
            ->assertJsonPath('code', 'SELF_CLEARANCE_DISALLOWED');

        // Reset auth state between requests with different tokens
        $this->app['auth']->forgetGuards();

        // 2. Separate placement officer redeems the clearance -> SUCCEEDS
        $tpoToken = $this->tpoUser->createToken('tpo_token')->plainTextToken;
        $successRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Self Clearance Attempt Drive',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2027-01-02 10:00:00',
                'end_date' => '2027-01-02 12:00:00',
                'venue' => 'Audi 5',
                'branches' => ['CS'],
                'force' => true,
                'override_justification' => 'Redeemed by independent TPO Lead.',
                'emergency_clearance_code' => $issued['raw_clearance_code'],
            ]);

        $successRes->assertStatus(201);
    }

    /**
     * Test 25: Candidate interview slot scheduling endpoint with conflict detection.
     */
    public function test_candidate_interview_scheduling_and_conflict_detection(): void
    {
        $drive = PlacementDrive::create([
            'name' => 'Global Software Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2027-01-05 09:00:00',
            'end_date' => '2027-01-05 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // 1. Schedule Interview Slot 1 for Alice
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$drive->id}/schedules", [
                'student_id' => $this->student1->id,
                'interviewer_ref' => 'PANEL_ALPHA_1',
                'venue' => 'Interview Cabin 10',
                'start_time' => '2027-01-05 10:00:00',
                'end_time' => '2027-01-05 11:00:00',
            ]);

        $res1->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('schedule.student_id', $this->student1->id)
            ->assertJsonPath('schedule.interviewer_ref', 'PANEL_ALPHA_1');

        // 2. Attempt overlapping interview slot for Alice (10:30 - 11:30) -> Conflict
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$drive->id}/schedules", [
                'student_id' => $this->student1->id,
                'interviewer_ref' => 'PANEL_BETA_2',
                'venue' => 'Interview Cabin 11',
                'start_time' => '2027-01-05 10:30:00',
                'end_time' => '2027-01-05 11:30:00',
            ]);

        $res2->assertStatus(409)
            ->assertJsonPath('code', 'SCHEDULE_CONFLICT')
            ->assertJsonPath('conflicts.0.conflict_type', 'STUDENT_SCHEDULE_OVERLAP');
    }

    /**
     * Test 10: Student overlapping interviews across different drives detected.
     */
    public function test_student_overlapping_interviews_across_different_drives_detected(): void
    {
        $drive1 = PlacementDrive::create([
            'name' => 'First Tech Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-20 09:00:00',
            'end_date' => '2026-12-20 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        // Student 1 booked for interview in Drive 1 from 14:00 to 15:30
        \App\Models\DriveSchedule::create([
            'drive_id' => $drive1->id,
            'student_id' => $this->student1->id,
            'start_time' => '2026-12-20 14:00:00',
            'end_time' => '2026-12-20 15:30:00',
            'venue' => 'Room 101',
            'status' => 'SCHEDULED',
        ]);

        $drive2 = PlacementDrive::create([
            'name' => 'Second Tech Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-20 09:00:00',
            'end_date' => '2026-12-20 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Drive 2 attempts to schedule student 1 at overlapping slot 14:30 - 15:00
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/detect-conflicts', [
                'start_time' => '2026-12-20 14:30:00',
                'end_time' => '2026-12-20 15:00:00',
                'student_ids' => [$this->student1->id],
                'drive_id' => $drive2->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('has_conflict', true)
            ->assertJsonPath('conflicts.0.conflict_type', 'STUDENT_SCHEDULE_OVERLAP');
    }

    /**
     * Test 11: Recruiter / Interviewer double-booking collision detected.
     */
    public function test_recruiter_interviewer_double_booking_conflict(): void
    {
        $drive1 = PlacementDrive::create([
            'name' => 'FinTech Drive Alpha',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-21 09:00:00',
            'end_date' => '2026-12-21 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        \App\Models\DriveSchedule::create([
            'drive_id' => $drive1->id,
            'student_id' => $this->student1->id,
            'interviewer_ref' => 'INT_DAVID_PANEL_1',
            'start_time' => '2026-12-21 10:00:00',
            'end_time' => '2026-12-21 11:30:00',
            'venue' => 'Interview Cabin 3',
            'status' => 'SCHEDULED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Check conflict for same interviewer at overlapping 11:00 - 12:00
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/detect-conflicts', [
                'start_time' => '2026-12-21 11:00:00',
                'end_time' => '2026-12-21 12:00:00',
                'interviewer_ref' => 'INT_DAVID_PANEL_1',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('has_conflict', true)
            ->assertJsonPath('conflicts.0.conflict_type', 'RECRUITER_DOUBLE_BOOKING');
    }

    /**
     * Test 12: Multi-drive participation without overlapping schedule succeeds without conflict.
     */
    public function test_non_overlapping_multi_drive_participation_succeeds(): void
    {
        $drive1 = PlacementDrive::create([
            'name' => 'Morning Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-22 09:00:00',
            'end_date' => '2026-12-22 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        // Student 1 scheduled 09:00 - 11:00 in Drive 1
        \App\Models\DriveSchedule::create([
            'drive_id' => $drive1->id,
            'student_id' => $this->student1->id,
            'start_time' => '2026-12-22 09:00:00',
            'end_time' => '2026-12-22 11:00:00',
            'venue' => 'Hall A',
            'status' => 'SCHEDULED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Student 1 evaluated for afternoon slot 14:00 - 16:00 (clean non-overlap)
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/tpo/detect-conflicts', [
                'start_time' => '2026-12-22 14:00:00',
                'end_time' => '2026-12-22 16:00:00',
                'student_ids' => [$this->student1->id],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('has_conflict', false)
            ->assertJsonPath('conflict_count', 0);
    }

    /**
     * Test 13: Venue collisions across all 4 topological intervals (start, end, interior, engulfing).
     */
    public function test_venue_conflicts_across_partial_and_engulfing_intervals(): void
    {
        $drive = PlacementDrive::create([
            'name' => 'Core Venue Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-24 08:00:00',
            'end_date' => '2026-12-24 20:00:00',
            'status' => 'PUBLISHED',
        ]);

        DriveRound::create([
            'drive_id' => $drive->id,
            'round_number' => 1,
            'name' => 'Base Round',
            'round_type' => 'ASSESSMENT',
            'start_time' => '2026-12-24 10:00:00',
            'end_time' => '2026-12-24 12:00:00',
            'venue' => 'Main Lab 401',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        $checkInterval = function (string $start, string $end) use ($token) {
            return $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson('/api/v1/tpo/detect-conflicts', [
                    'start_time' => $start,
                    'end_time' => $end,
                    'venue' => 'Main Lab 401',
                ]);
        };

        // 1. Start overlap: 09:30 - 10:30 (starts before, ends inside)
        $checkInterval('2026-12-24 09:30:00', '2026-12-24 10:30:00')
            ->assertJsonPath('has_conflict', true)
            ->assertJsonPath('conflicts.0.conflict_type', 'VENUE_COLLISION');

        // 2. End overlap: 11:30 - 12:30 (starts inside, ends after)
        $checkInterval('2026-12-24 11:30:00', '2026-12-24 12:30:00')
            ->assertJsonPath('has_conflict', true)
            ->assertJsonPath('conflicts.0.conflict_type', 'VENUE_COLLISION');

        // 3. Interior overlap: 10:30 - 11:30 (strictly inside)
        $checkInterval('2026-12-24 10:30:00', '2026-12-24 11:30:00')
            ->assertJsonPath('has_conflict', true)
            ->assertJsonPath('conflicts.0.conflict_type', 'VENUE_COLLISION');

        // 4. Engulfing overlap: 09:00 - 13:00 (encompasses entire slot)
        $checkInterval('2026-12-24 09:00:00', '2026-12-24 13:00:00')
            ->assertJsonPath('has_conflict', true)
            ->assertJsonPath('conflicts.0.conflict_type', 'VENUE_COLLISION');

        // 5. Adjacent abutting slot: 12:00 - 13:00 (zero interior intersection -> no collision)
        $checkInterval('2026-12-24 12:00:00', '2026-12-24 13:00:00')
            ->assertJsonPath('has_conflict', false);
    }

    /**
     * Test 14: Non-TPO roles cannot manage placement drives or execute overrides.
     */
    public function test_unauthorized_user_cannot_override_conflicts(): void
    {
        $studentUser = User::where('role', UserRole::STUDENT->value)->first();
        $studentToken = $studentUser->createToken('student_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson('/api/v1/tpo/drives', [
                'name' => 'Unauthorized Drive Creation',
                'company_id' => $this->company->id,
                'job_id' => $this->job->id,
                'start_date' => '2026-12-25 10:00:00',
                'end_date' => '2026-12-25 12:00:00',
                'force' => true,
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test 15: Canonical Candidate Lifecycle and Round Results progression.
     */
    public function test_canonical_candidate_lifecycle_and_round_results(): void
    {
        $drive = PlacementDrive::create([
            'name' => 'Unicorn Startup Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-28 09:00:00',
            'end_date' => '2026-12-28 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        $candidate = DriveCandidate::create([
            'drive_id' => $drive->id,
            'student_id' => $this->student1->id,
            'status' => 'REGISTERED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // 1. Pass Round 1
        $resRound1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$drive->id}/rounds/1/candidate-result/{$candidate->id}", [
                'round_number' => 1,
                'result' => 'PASSED',
                'score' => 92.5,
                'notes' => 'Exceptional coding score in algorithmic section.',
            ]);

        $resRound1->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('candidate.status', 'INTERVIEWING')
            ->assertJsonPath('candidate.current_round_number', 1);

        $fresh = $candidate->fresh();
        $this->assertEquals('INTERVIEWING', $fresh->status);
        $this->assertEquals(92.5, $fresh->round_results['1']['score']);
        $this->assertEquals('PASSED', $fresh->round_results['1']['result']);

        // 2. Fail Round 2 -> Transitions canonical status to REJECTED
        $resRound2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$drive->id}/rounds/2/candidate-result/{$candidate->id}", [
                'round_number' => 2,
                'result' => 'FAILED',
                'score' => 45.0,
                'notes' => 'Did not meet minimum threshold for system design.',
            ]);

        $resRound2->assertStatus(200)
            ->assertJsonPath('candidate.status', 'REJECTED')
            ->assertJsonPath('candidate.current_round_number', 2);

        $fresh = $candidate->fresh();
        $this->assertEquals('REJECTED', $fresh->status);
        $this->assertEquals('FAILED', $fresh->round_results['2']['result']);

        // 3. Status History Immutability verified on round elimination
        $lastHistory = DriveCandidateStatusHistory::where('drive_candidate_id', $candidate->id)->latest('id')->first();
        $this->assertNotNull($lastHistory);
        $this->assertEquals('REJECTED', $lastHistory->to_status);
        $this->assertStringContainsString('Eliminated in selection round #2', $lastHistory->reason);
    }

    /**
     * Test 16: Virtual venue substitution requires explicit delivery mode confirmation.
     */
    public function test_virtual_venue_substitution_requires_explicit_confirmation(): void
    {
        $drive = PlacementDrive::create([
            'name' => 'Physical On-Campus Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-30 09:00:00',
            'end_date' => '2026-12-30 18:00:00',
            'drive_type' => 'ON_CAMPUS',
            'venue' => 'Mechanical Hall A',
            'status' => 'PUBLISHED',
            'lock_version' => 1,
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Attempting to change delivery mode to VIRTUAL without confirmation
        $failRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/tpo/drives/{$drive->id}", [
                'lock_version' => 1,
                'drive_type' => 'VIRTUAL',
            ]);

        $failRes->assertStatus(422)
            ->assertJsonPath('code', 'DELIVERY_MODE_CONFIRMATION_REQUIRED');

        // Confirming delivery mode change explicitly
        $successRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/v1/tpo/drives/{$drive->id}", [
                'lock_version' => 1,
                'drive_type' => 'VIRTUAL',
                'delivery_mode_confirmed' => true,
            ]);

        $successRes->assertStatus(200)
            ->assertJsonPath('drive.drive_type', 'VIRTUAL');
    }

    /**
     * Test 17: Pessimistic locking prevents venue race condition double-bookings.
     */
    public function test_pessimistic_concurrency_locking_prevents_double_booking(): void
    {
        $venue = Venue::create([
            'name' => 'Auditorium North',
            'building' => 'Admin Block',
            'capacity' => 300,
            'is_virtual' => false,
        ]);

        $drive1 = PlacementDrive::create([
            'name' => 'First Tech Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-31 09:00:00',
            'end_date' => '2026-12-31 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        $drive2 = PlacementDrive::create([
            'name' => 'Second Tech Drive',
            'company_id' => $this->company->id,
            'job_id' => $this->job->id,
            'start_date' => '2026-12-31 09:00:00',
            'end_date' => '2026-12-31 18:00:00',
            'status' => 'PUBLISHED',
        ]);

        $token = $this->tpoUser->createToken('tpo_token')->plainTextToken;

        // Round 1 booked successfully in Auditorium North
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$drive1->id}/rounds", [
                'round_number' => 1,
                'name' => 'Drive 1 Keynote',
                'round_type' => 'ASSESSMENT',
                'start_time' => '2026-12-31 10:00:00',
                'end_time' => '2026-12-31 12:00:00',
                'venue' => 'Auditorium North',
                'venue_id' => $venue->id,
            ]);

        $res1->assertStatus(201);

        // Competing Round for Drive 2 in same venue slot fails with SCHEDULE_CONFLICT
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/tpo/drives/{$drive2->id}/rounds", [
                'round_number' => 1,
                'name' => 'Drive 2 Presentation',
                'round_type' => 'ASSESSMENT',
                'start_time' => '2026-12-31 11:00:00',
                'end_time' => '2026-12-31 13:00:00',
                'venue' => 'Auditorium North',
                'venue_id' => $venue->id,
            ]);

        $res2->assertStatus(409)
            ->assertJsonPath('code', 'SCHEDULE_CONFLICT')
            ->assertJsonPath('conflicts.0.conflict_type', 'VENUE_COLLISION');
    }
}
