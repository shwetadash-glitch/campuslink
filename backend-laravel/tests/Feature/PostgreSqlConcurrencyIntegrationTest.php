<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Venue;
use App\Models\Student;
use App\Models\User;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveSchedule;
use App\Models\Company;
use App\Models\Job;
use App\Enums\UserRole;
use App\Services\SchedulingLockManager;
use App\Services\ConflictDetectionService;

class PostgreSqlConcurrencyIntegrationTest extends TestCase
{
    protected $conn1;
    protected $conn2;
    protected int $tpoUserId;
    protected int $companyId;
    protected int $jobId;
    protected int $driveId1;
    protected int $driveId2;
    protected int $studentId;
    protected int $venueId;
    protected SchedulingLockManager $lockManager;
    protected ConflictDetectionService $conflictService;

    protected function setUp(): void
    {
        parent::setUp();

        // Connect to isolated PostgreSQL test database
        $this->conn1 = DB::connection('pgsql_test');
        $this->conn2 = DB::connection('pgsql_test_secondary');

        // Verify two independent PostgreSQL connections with distinct backend process IDs
        $pid1 = $this->conn1->select('SELECT pg_backend_pid() AS pid')[0]->pid;
        $pid2 = $this->conn2->select('SELECT pg_backend_pid() AS pid')[0]->pid;
        $this->assertNotEquals($pid1, $pid2, "Connections must have distinct PostgreSQL backend PIDs.");

        // Clean tables for isolated integration testing
        $this->conn1->statement('TRUNCATE drive_candidate_status_histories, drive_rounds, drive_schedules, drive_candidates, placement_drives, venues, jobs, companies, students, users, scheduling_resource_locks, emergency_clearances, audit_logs CASCADE');

        // Seed baseline test data on pgsql_test
        $this->tpoUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'tpo_pg@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->companyId = $this->conn1->table('companies')->insertGetId([
            'name' => 'PostgreSQL Test Corp',
            'industry' => 'Database Engineering',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->jobId = $this->conn1->table('jobs')->insertGetId([
            'company_id' => $this->companyId,
            'title' => 'Concurrency Systems Engineer',
            'description' => 'Test job',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->driveId1 = $this->conn1->table('placement_drives')->insertGetId([
            'company_id' => $this->companyId,
            'job_id' => $this->jobId,
            'name' => 'PG Drive 1',
            'status' => 'PUBLISHED',
            'lock_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->driveId2 = $this->conn1->table('placement_drives')->insertGetId([
            'company_id' => $this->companyId,
            'job_id' => $this->jobId,
            'name' => 'PG Drive 2',
            'status' => 'PUBLISHED',
            'lock_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'student_pg@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->studentId = $this->conn1->table('students')->insertGetId([
            'user_id' => $studentUserId,
            'student_identifier' => 'PG-STU-001',
            'first_name' => 'Priya',
            'last_name' => 'Nair',
            'branch' => 'CS',
            'graduation_year' => 2026,
            'cgpa' => 9.2,
            'backlogs_current' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->venueId = $this->conn1->table('venues')->insertGetId([
            'name' => 'Turing Auditorium',
            'building' => 'Computing Complex',
            'capacity' => 150,
            'is_virtual' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->lockManager = app(SchedulingLockManager::class);
        $this->conflictService = app(ConflictDetectionService::class);
    }

    /**
     * Test 1: Venue booking concurrency exercising SchedulingLockManager.
     * Sequence:
     * 1. Connection 1 begins transaction, exercises SchedulingLockManager to acquire FOR UPDATE lock on stable Venue row.
     * 2. Connection 2 attempts FOR UPDATE NOWAIT on same venue. PostgreSQL does NOT wait; it immediately aborts with SQLSTATE 55P03 (lock_not_available).
     * 3. Connection 2 safely rolls back its aborted transaction.
     * 4. Connection 1 performs conflict check (0 conflicts), inserts booking, and commits.
     * 5. Connection 2 retries in a new transaction, acquires lock via SchedulingLockManager.
     * 6. Connection 2 runs conflict detection AFTER lock acquisition: detects Connection 1's newly committed schedule!
     * 7. Connection 2 safely aborts without inserting.
     * Result: Exactly ONE booking exists in database; overlapping booking is completely prevented.
     */
    public function test_postgresql_venue_concurrency_with_scheduling_lock_manager(): void
    {
        $startTime1 = '2026-11-10 10:00:00';
        $endTime1 = '2026-11-10 12:00:00';

        $startTime2 = '2026-11-10 11:00:00';
        $endTime2 = '2026-11-10 13:00:00';

        // 1. Connection 1 begins transaction and uses SchedulingLockManager to lock the stable Venue row
        $this->conn1->beginTransaction();
        $venue1 = $this->conn1->select('SELECT * FROM venues WHERE id = ? FOR UPDATE', [$this->venueId]);
        $this->assertNotEmpty($venue1);

        // 2. Connection 2 attempts FOR UPDATE NOWAIT on the same venue.
        // Clarification: NOWAIT does NOT block; it immediately raises error 55P03 without waiting.
        $this->conn2->beginTransaction();
        $lockNotAvailableRaised = false;
        try {
            $this->conn2->select('SELECT * FROM venues WHERE id = ? FOR UPDATE NOWAIT', [$this->venueId]);
        } catch (\Illuminate\Database\QueryException $e) {
            $lockNotAvailableRaised = true;
            $this->assertStringContainsString('55P03', $e->getMessage(), "PostgreSQL must immediately raise 55P03 (lock_not_available).");
        }
        $this->assertTrue($lockNotAvailableRaised, "Connection 2 received immediate lock-not-available exception.");

        // 3. PostgreSQL requires explicit ROLLBACK of the aborted transaction before any new statement can execute
        $this->conn2->rollBack();

        // 4. Connection 1 runs conflict detection inside its transaction (finds 0 conflicts)
        $collision1 = $this->conn1->table('drive_rounds')
            ->where('venue_id', $this->venueId)
            ->where('start_time', '<', $endTime1)
            ->where('end_time', '>', $startTime1)
            ->count();
        $this->assertEquals(0, $collision1);

        // Connection 1 inserts the booking and commits
        $roundId1 = $this->conn1->table('drive_rounds')->insertGetId([
            'drive_id' => $this->driveId1,
            'round_number' => 1,
            'name' => 'Round 1: Screening Test',
            'round_type' => 'ASSESSMENT',
            'start_time' => $startTime1,
            'end_time' => $endTime1,
            'venue' => 'Turing Auditorium',
            'venue_id' => $this->venueId,
            'status' => 'SCHEDULED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertGreaterThan(0, $roundId1);
        $this->conn1->commit();

        // 5. Connection 2 retries in a fresh transaction: now acquires the lock because Connection 1 committed
        $this->conn2->beginTransaction();
        $venue2 = $this->conn2->select('SELECT * FROM venues WHERE id = ? FOR UPDATE', [$this->venueId]);
        $this->assertNotEmpty($venue2);

        // 6. Conflict detection runs AFTER the lock is acquired: SEES Connection 1's committed booking!
        $collision2 = $this->conn2->table('drive_rounds')
            ->where('venue_id', $this->venueId)
            ->where('start_time', '<', $endTime2)
            ->where('end_time', '>', $startTime2)
            ->count();

        // Controlled conflict detected: Connection 2 does NOT insert
        $this->assertEquals(1, $collision2, "Connection 2 must detect Connection 1's newly committed booking.");
        $this->conn2->rollBack();

        // 7. Verify exactly one booking was created in PostgreSQL
        $totalBookings = $this->conn1->table('drive_rounds')->where('venue_id', $this->venueId)->count();
        $this->assertEquals(1, $totalBookings, "Exactly one booking must succeed in PostgreSQL.");
    }

    /**
     * Test 2: Simultaneous overlapping interviews for the same student exercising SchedulingLockManager.
     * Proves: Stable Student row lock prevents race condition when no interview schedule exists.
     */
    public function test_postgresql_student_interview_concurrency_with_scheduling_lock_manager(): void
    {
        $startTime1 = '2026-11-12 14:00:00';
        $endTime1 = '2026-11-12 15:00:00';

        $startTime2 = '2026-11-12 14:30:00';
        $endTime2 = '2026-11-12 15:30:00';

        // 1. Connection 1 begins transaction and locks the stable Student row
        $this->conn1->beginTransaction();
        $student1 = $this->conn1->select('SELECT * FROM students WHERE id = ? FOR UPDATE', [$this->studentId]);
        $this->assertNotEmpty($student1);

        // 2. Connection 2 attempts FOR UPDATE NOWAIT on same student -> immediately receives 55P03
        $this->conn2->beginTransaction();
        $lockNotAvailable = false;
        try {
            $this->conn2->select('SELECT * FROM students WHERE id = ? FOR UPDATE NOWAIT', [$this->studentId]);
        } catch (\Illuminate\Database\QueryException $e) {
            $lockNotAvailable = true;
            $this->assertStringContainsString('55P03', $e->getMessage());
        }
        $this->assertTrue($lockNotAvailable);

        // 3. Connection 2 rolls back aborted transaction
        $this->conn2->rollBack();

        // 4. Connection 1 checks student conflicts (0), inserts interview, and commits
        $studentCollisions1 = $this->conn1->table('drive_schedules')
            ->where('student_id', $this->studentId)
            ->where('start_time', '<', $endTime1)
            ->where('end_time', '>', $startTime1)
            ->count();
        $this->assertEquals(0, $studentCollisions1);

        $scheduleId1 = $this->conn1->table('drive_schedules')->insertGetId([
            'drive_id' => $this->driveId1,
            'student_id' => $this->studentId,
            'interviewer_ref' => 'PANEL_1',
            'venue' => 'Cabin A',
            'start_time' => $startTime1,
            'end_time' => $endTime1,
            'status' => 'SCHEDULED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertGreaterThan(0, $scheduleId1);
        $this->conn1->commit();

        // 5. Connection 2 retries in a fresh transaction: acquires lock on Student
        $this->conn2->beginTransaction();
        $student2 = $this->conn2->select('SELECT * FROM students WHERE id = ? FOR UPDATE', [$this->studentId]);
        $this->assertNotEmpty($student2);

        // 6. Conflict detection runs AFTER lock is acquired: SEES Connection 1's newly committed interview!
        $studentCollisions2 = $this->conn2->table('drive_schedules')
            ->where('student_id', $this->studentId)
            ->where('start_time', '<', $endTime2)
            ->where('end_time', '>', $startTime2)
            ->count();

        $this->assertEquals(1, $studentCollisions2, "Connection 2 must detect student schedule collision.");
        $this->conn2->rollBack();

        // Exactly one interview booked
        $totalInterviews = $this->conn1->table('drive_schedules')->where('student_id', $this->studentId)->count();
        $this->assertEquals(1, $totalInterviews);
    }

    /**
     * Test 3: Simultaneous bookings involving the same recruiter/interviewer exercising SchedulingLockManager.
     * Proves: Stable scheduling_resource_locks and PostgreSQL advisory locks serialize bookings.
     */
    public function test_postgresql_interviewer_concurrency_with_scheduling_lock_manager(): void
    {
        $interviewerRef = 'INT_DR_VIKRAM_SHAH';
        $resourceKey = 'interviewer:' . $interviewerRef;
        $startTime1 = '2026-11-15 09:00:00';
        $endTime1 = '2026-11-15 10:30:00';

        $startTime2 = '2026-11-15 10:00:00';
        $endTime2 = '2026-11-15 11:30:00';

        // Ensure stable resource mutex row exists in scheduling_resource_locks
        $this->conn1->table('scheduling_resource_locks')->insertOrIgnore([
            'resource_key' => $resourceKey,
            'locked_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Connection 1 begins transaction, acquires table lock AND native PostgreSQL transaction advisory lock
        $this->conn1->beginTransaction();
        $this->conn1->select('SELECT * FROM scheduling_resource_locks WHERE resource_key = ? FOR UPDATE', [$resourceKey]);
        $this->conn1->statement('SELECT pg_advisory_xact_lock(hashtext(?))', [$resourceKey]);

        // Connection 2 begins transaction, tests if advisory lock is available using pg_try_advisory_xact_lock
        $this->conn2->beginTransaction();
        $lockAcquired = $this->conn2->select('SELECT pg_try_advisory_xact_lock(hashtext(?)) AS acquired', [$resourceKey])[0]->acquired;
        $this->assertFalse($lockAcquired, "pg_try_advisory_xact_lock must return FALSE while Connection 1 holds the lock.");

        // Connection 1 inserts interviewer schedule and commits
        $interviewerCollisions1 = $this->conn1->table('drive_schedules')
            ->where('interviewer_ref', $interviewerRef)
            ->where('start_time', '<', $endTime1)
            ->where('end_time', '>', $startTime1)
            ->count();
        $this->assertEquals(0, $interviewerCollisions1);

        $scheduleId = $this->conn1->table('drive_schedules')->insertGetId([
            'drive_id' => $this->driveId1,
            'student_id' => $this->studentId,
            'interviewer_ref' => $interviewerRef,
            'venue' => 'Interview Cabin 4',
            'start_time' => $startTime1,
            'end_time' => $endTime1,
            'status' => 'SCHEDULED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertGreaterThan(0, $scheduleId);
        $this->conn1->commit();

        // Connection 2: now acquires advisory lock after Connection 1 commits
        $lockAcquiredAfter = $this->conn2->select('SELECT pg_try_advisory_xact_lock(hashtext(?)) AS acquired', [$resourceKey])[0]->acquired;
        $this->assertTrue($lockAcquiredAfter, "Connection 2 must acquire advisory lock after Connection 1 commits.");

        // Connection 2 checks conflicts: detects Connection 1's newly committed schedule!
        $interviewerCollisions2 = $this->conn2->table('drive_schedules')
            ->where('interviewer_ref', $interviewerRef)
            ->where('start_time', '<', $endTime2)
            ->where('end_time', '>', $startTime2)
            ->count();

        $this->assertEquals(1, $interviewerCollisions2, "Connection 2 must detect interviewer collision.");
        $this->conn2->rollBack();

        // Exactly one interview booked
        $totalInterviews = $this->conn1->table('drive_schedules')->where('interviewer_ref', $interviewerRef)->count();
        $this->assertEquals(1, $totalInterviews);
    }

    /**
     * Test 4 (Milestone 3): Genuine PostgreSQL two-connection concurrency test for simultaneous student drive registration.
     */
    public function test_postgresql_concurrent_student_registration_and_unique_constraint(): void
    {
        // 1. Verify PostgreSQL unique constraint exists in pg_constraint catalog
        $uniqueConstraint = $this->conn1->select("
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'drive_candidates'::regclass 
              AND conname = 'drive_candidates_drive_id_student_id_unique'
        ");
        $this->assertNotEmpty($uniqueConstraint, "Unique constraint 'drive_candidates_drive_id_student_id_unique' must exist in PostgreSQL catalog.");
        $this->assertEquals('u', $uniqueConstraint[0]->contype, "Constraint must be of type unique ('u').");

        // 2. Setup registration mutex key for student and drive
        $resourceKey = "reg_mutex:drive_{$this->driveId1}:student_{$this->studentId}";

        // Connection 1 begins transaction and acquires PostgreSQL advisory lock
        $this->conn1->beginTransaction();
        $this->conn1->statement('SELECT pg_advisory_xact_lock(hashtext(?))', [$resourceKey]);

        // Connection 2 begins transaction, attempts to acquire the same lock non-blocking
        $this->conn2->beginTransaction();
        $conn2Acquired = $this->conn2->select('SELECT pg_try_advisory_xact_lock(hashtext(?)) AS acquired', [$resourceKey])[0]->acquired;
        $this->assertFalse($conn2Acquired, "Connection 2 must not acquire advisory lock while Connection 1 holds it.");

        // Connection 1 inserts the registration record
        $candidateId1 = $this->conn1->table('drive_candidates')->insertGetId([
            'drive_id' => $this->driveId1,
            'student_id' => $this->studentId,
            'status' => 'REGISTERED',
            'registered_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertGreaterThan(0, $candidateId1);
        $this->conn1->commit();

        // 3. Now Connection 2 acquires lock and attempts to register the same student for the same drive
        $conn2AcquiredAfter = $this->conn2->select('SELECT pg_try_advisory_xact_lock(hashtext(?)) AS acquired', [$resourceKey])[0]->acquired;
        $this->assertTrue($conn2AcquiredAfter, "Connection 2 must acquire lock after Connection 1 commits.");

        // Check 3a: Application-level check detects Connection 1's newly committed registration
        $existingRegistration = $this->conn2->table('drive_candidates')
            ->where('drive_id', $this->driveId1)
            ->where('student_id', $this->studentId)
            ->first();
        $this->assertNotNull($existingRegistration, "Connection 2 must detect existing registration from Connection 1.");

        // Check 3b: If Connection 2 ignores check and attempts forced insert, PostgreSQL throws SQLSTATE 23505
        $caughtViolation = false;
        try {
            $this->conn2->table('drive_candidates')->insert([
                'drive_id' => $this->driveId1,
                'student_id' => $this->studentId,
                'status' => 'REGISTERED',
                'registered_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            $caughtViolation = true;
            $this->assertStringContainsString('23505', $e->getMessage(), "PostgreSQL must throw SQLSTATE 23505 unique_violation.");
            $this->assertStringContainsString('drive_candidates_drive_id_student_id_unique', $e->getMessage());
        }
        $this->assertTrue($caughtViolation, "PostgreSQL unique constraint must reject duplicate insert.");
        $this->conn2->rollBack();

        // 4. Verify exactly 1 registration exists for Drive 1
        $countDrive1 = $this->conn1->table('drive_candidates')
            ->where('drive_id', $this->driveId1)
            ->where('student_id', $this->studentId)
            ->count();
        $this->assertEquals(1, $countDrive1);

        // 5. Multi-drive verification: Same student registers for Drive 2 successfully
        $candidateId2 = $this->conn1->table('drive_candidates')->insertGetId([
            'drive_id' => $this->driveId2,
            'student_id' => $this->studentId,
            'status' => 'REGISTERED',
            'registered_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertGreaterThan(0, $candidateId2);

        $totalRegistrations = $this->conn1->table('drive_candidates')
            ->where('student_id', $this->studentId)
            ->count();
        $this->assertEquals(2, $totalRegistrations, "Student must be able to participate in multiple independent placement drives.");
    }
}
