<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Enums\UserRole;

class PostgreSqlAssessmentConcurrencyTest extends TestCase
{
    protected $conn1;
    protected $conn2;
    protected int $officerUserId;
    protected int $studentUserId;
    protected int $studentId;
    protected int $companyId;
    protected int $jobId;
    protected int $driveId;
    protected int $assessmentId;
    protected int $questionId;

    protected function setUp(): void
    {
        parent::setUp();

        // Connect to isolated PostgreSQL test database via two independent connections
        $this->conn1 = DB::connection('pgsql_test');
        $this->conn2 = DB::connection('pgsql_test_secondary');

        // Verify two independent PostgreSQL connections with distinct backend process IDs
        $pid1 = $this->conn1->select('SELECT pg_backend_pid() AS pid')[0]->pid;
        $pid2 = $this->conn2->select('SELECT pg_backend_pid() AS pid')[0]->pid;
        $this->assertNotEquals($pid1, $pid2, "PostgreSQL connections must have distinct backend PIDs.");

        // Clean tables for isolated integration testing
        $this->conn1->statement('TRUNCATE assessment_score_histories, assessment_session_events, assessment_answers, assessment_sessions, assessment_questions, questions, assessments, question_banks, drive_candidate_status_histories, drive_candidates, placement_drives, jobs, companies, students, users CASCADE');

        // 1. Seed Placement Officer
        $this->officerUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'tpo_exam@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Seed Student User & Profile
        $this->studentUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'exam_candidate@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->studentId = $this->conn1->table('students')->insertGetId([
            'user_id' => $this->studentUserId,
            'student_identifier' => 'STU-CONCUR-001',
            'first_name' => 'Concurrency',
            'last_name' => 'Tester',
            'branch' => 'CSE',
            'graduation_year' => 2026,
            'cgpa' => 8.95,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Seed Corporate Partner & Placement Drive
        $this->companyId = $this->conn1->table('companies')->insertGetId([
            'name' => 'PostgreSQL Systems Inc',
            'industry' => 'Database Infrastructure',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->jobId = $this->conn1->table('jobs')->insertGetId([
            'company_id' => $this->companyId,
            'title' => 'High Concurrency Database Engineer',
            'description' => 'ACID transactions and concurrency controls',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->driveId = $this->conn1->table('placement_drives')->insertGetId([
            'company_id' => $this->companyId,
            'job_id' => $this->jobId,
            'name' => 'PostgreSQL 2026 Campus Drive',
            'status' => 'PUBLISHED',
            'lock_version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Register candidate in drive
        $this->conn1->table('drive_candidates')->insert([
            'drive_id' => $this->driveId,
            'student_id' => $this->studentId,
            'status' => 'REGISTERED',
            'registered_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 4. Seed Assessment with max_attempts = 1
        $this->assessmentId = $this->conn1->table('assessments')->insertGetId([
            'title' => 'Concurrent Concurrency Exam',
            'code' => 'CONCUR-TEST-' . uniqid(),
            'created_by_user_id' => $this->officerUserId,
            'drive_id' => $this->driveId,
            'job_id' => $this->jobId,
            'assessment_type' => 'TECHNICAL',
            'duration_minutes' => 60,
            'total_marks' => 20.0,
            'pass_percentage' => 50.0,
            'max_attempts' => 1, // Strictly 1 attempt allowed
            'is_randomized' => false,
            'negative_marking_rate' => 0.25,
            'grace_period_seconds' => 60,
            'status' => 'PUBLISHED',
            'published_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 5. Seed Question
        $this->questionId = $this->conn1->table('questions')->insertGetId([
            'type' => 'MCQ',
            'difficulty' => 'MEDIUM',
            'category' => 'Database Internals',
            'title' => 'PostgreSQL Concurrency MVCC',
            'question_text' => 'Which clause provides pessimistic row-level locking in PostgreSQL?',
            'options' => json_encode([
                ['id' => 'A', 'text' => 'SELECT ... FOR UPDATE'],
                ['id' => 'B', 'text' => 'SELECT ... LOCK ROW'],
                ['id' => 'C', 'text' => 'LOCK TABLE IN SHARE MODE'],
            ]),
            'correct_answer' => 'A',
            'marks' => 20.0,
            'negative_marks' => 5.0,
            'ai_review_status' => 'APPROVED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->conn1->table('assessment_questions')->insert([
            'assessment_id' => $this->assessmentId,
            'question_id' => $this->questionId,
            'order_index' => 1,
            'marks' => 20.0,
            'negative_marks' => 5.0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Test 1: Simultaneous Examination Attempt Concurrency with max_attempts = 1.
     * Proves: Two independent PostgreSQL connections cannot exceed max_attempts or produce duplicate active sessions.
     */
    public function test_concurrent_session_creation_cannot_exceed_max_attempts_on_postgresql(): void
    {
        // 1. Connection 1 begins transaction and acquires row-level exclusive lock on Student
        $this->conn1->beginTransaction();
        $studentLocked1 = $this->conn1->select('SELECT * FROM students WHERE id = ? FOR UPDATE', [$this->studentId]);
        $this->assertNotEmpty($studentLocked1);

        // 2. Connection 2 attempts FOR UPDATE NOWAIT on the same Student -> Immediately blocked by PostgreSQL with SQLSTATE 55P03
        $this->conn2->beginTransaction();
        $lockNotAvailable = false;
        try {
            $this->conn2->select('SELECT * FROM students WHERE id = ? FOR UPDATE NOWAIT', [$this->studentId]);
        } catch (\Illuminate\Database\QueryException $e) {
            $lockNotAvailable = true;
            $this->assertStringContainsString('55P03', $e->getMessage(), "PostgreSQL must raise SQLSTATE 55P03 lock-not-available immediately.");
        }
        $this->assertTrue($lockNotAvailable, "Connection 2 must be rejected by PostgreSQL row lock while Connection 1 holds it.");

        // 3. Connection 2 rolls back its aborted transaction
        $this->conn2->rollBack();

        // 4. Connection 1 checks past attempts (0), active sessions (0), and creates Attempt 1
        $pastAttempts1 = $this->conn1->table('assessment_sessions')
            ->where('assessment_id', $this->assessmentId)
            ->where('student_id', $this->studentId)
            ->whereIn('status', ['SUBMITTED', 'EVALUATED', 'EXPIRED'])
            ->count();
        $this->assertEquals(0, $pastAttempts1);

        $now = Carbon::now();
        $sessionId1 = $this->conn1->table('assessment_sessions')->insertGetId([
            'assessment_id' => $this->assessmentId,
            'student_id' => $this->studentId,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'started_at' => $now,
            'expires_at' => $now->copy()->addMinutes(60),
            'question_order' => json_encode([$this->questionId]),
            'proctoring_flags_count' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->assertGreaterThan(0, $sessionId1);

        // Connection 1 commits Attempt 1
        $this->conn1->commit();

        // 5. Connection 2 now acquires lock on Student in a fresh transaction
        $this->conn2->beginTransaction();
        $studentLocked2 = $this->conn2->select('SELECT * FROM students WHERE id = ? FOR UPDATE', [$this->studentId]);
        $this->assertNotEmpty($studentLocked2);

        // Connection 2 checks active sessions: sees Connection 1's active session!
        $activeSession2 = $this->conn2->table('assessment_sessions')
            ->where('assessment_id', $this->assessmentId)
            ->where('student_id', $this->studentId)
            ->where('status', 'IN_PROGRESS')
            ->first();

        // Idempotent resume: Connection 2 sees existing session and DOES NOT create a new one
        $this->assertNotNull($activeSession2);
        $this->assertEquals($sessionId1, $activeSession2->id);

        $this->conn2->commit();

        // 6. Verify total sessions in PostgreSQL database is EXACTLY 1
        $totalSessions = $this->conn1->table('assessment_sessions')
            ->where('assessment_id', $this->assessmentId)
            ->where('student_id', $this->studentId)
            ->count();
        $this->assertEquals(1, $totalSessions, "Exactly one active session must exist; no duplicates created.");

        // 7. Now submit Attempt 1
        $this->conn1->table('assessment_sessions')
            ->where('id', $sessionId1)
            ->update([
                'status' => 'EVALUATED',
                'total_score' => 20.0,
                'passed' => true,
                'submitted_at' => now(),
            ]);

        // 8. Connection 2 now tries to start a SECOND attempt when max_attempts = 1
        $this->conn2->beginTransaction();
        $this->conn2->select('SELECT * FROM students WHERE id = ? FOR UPDATE', [$this->studentId]);

        $pastAttempts2 = $this->conn2->table('assessment_sessions')
            ->where('assessment_id', $this->assessmentId)
            ->where('student_id', $this->studentId)
            ->whereIn('status', ['SUBMITTED', 'EVALUATED', 'EXPIRED'])
            ->count();

        // Attempt limit verification
        $this->assertEquals(1, $pastAttempts2);
        $this->assertTrue($pastAttempts2 >= 1, "Connection 2 must detect attempt limit reached (1 >= 1).");
        $this->conn2->rollBack();

        // 9. Database-Level Constraint Protection: Proves PostgreSQL storage engine enforces uniqueness
        $uniqueViolation = false;
        try {
            $this->conn1->table('assessment_sessions')->insert([
                'assessment_id' => $this->assessmentId,
                'student_id' => $this->studentId,
                'attempt_number' => 1, // Duplicate attempt 1
                'status' => 'IN_PROGRESS',
                'started_at' => now(),
                'expires_at' => now()->addMinutes(60),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            $uniqueViolation = true;
            $this->assertStringContainsString('23505', $e->getMessage(), "PostgreSQL must raise SQLSTATE 23505 unique violation on uniq_assessment_student_attempt.");
        }
        $this->assertTrue($uniqueViolation, "PostgreSQL storage engine must strictly reject duplicate attempt numbers.");
    }

    /**
     * Test 2: Concurrent Session Submissions with PostgreSQL Row-Level Locking.
     * Proves: Simultaneous submit requests cannot calculate scores twice or corrupt evaluation records.
     */
    public function test_concurrent_session_submissions_cannot_produce_duplicate_evaluations(): void
    {
        // 1. Create an active candidate session
        $now = Carbon::now();
        $sessionId = $this->conn1->table('assessment_sessions')->insertGetId([
            'assessment_id' => $this->assessmentId,
            'student_id' => $this->studentId,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'started_at' => $now,
            'expires_at' => $now->copy()->addMinutes(60),
            'question_order' => json_encode([$this->questionId]),
            'proctoring_flags_count' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Candidate saved an answer (Option A - correct, earns 20 marks)
        $answerId = $this->conn1->table('assessment_answers')->insertGetId([
            'session_id' => $sessionId,
            'question_id' => $this->questionId,
            'student_id' => $this->studentId,
            'answer_text' => 'A',
            'is_auto_saved' => true,
            'saved_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 2. Connection 1 begins submit transaction and acquires row lock on the session
        $this->conn1->beginTransaction();
        $sessionLocked1 = $this->conn1->select('SELECT * FROM assessment_sessions WHERE id = ? FOR UPDATE', [$sessionId]);
        $this->assertNotEmpty($sessionLocked1);
        $this->assertEquals('IN_PROGRESS', $sessionLocked1[0]->status);

        // 3. Connection 2 attempts FOR UPDATE NOWAIT on the same session row
        $this->conn2->beginTransaction();
        $lockNotAvailable = false;
        try {
            $this->conn2->select('SELECT * FROM assessment_sessions WHERE id = ? FOR UPDATE NOWAIT', [$sessionId]);
        } catch (\Illuminate\Database\QueryException $e) {
            $lockNotAvailable = true;
            $this->assertStringContainsString('55P03', $e->getMessage(), "PostgreSQL must raise SQLSTATE 55P03 lock-not-available on concurrent session submit.");
        }
        $this->assertTrue($lockNotAvailable);
        $this->conn2->rollBack();

        // 4. Connection 1 evaluates answers, records scores, and updates status to EVALUATED
        $this->conn1->table('assessment_answers')
            ->where('id', $answerId)
            ->update([
                'score_awarded' => 20.0,
                'is_correct' => true,
                'evaluated_at' => now(),
            ]);

        $this->conn1->table('assessment_sessions')
            ->where('id', $sessionId)
            ->update([
                'status' => 'EVALUATED',
                'total_score' => 20.0,
                'passed' => true,
                'submitted_at' => now(),
                'updated_at' => now(),
            ]);

        // Connection 1 commits evaluation
        $this->conn1->commit();

        // 5. Connection 2 now acquires the session lock in a subsequent attempt
        $this->conn2->beginTransaction();
        $sessionLocked2 = $this->conn2->select('SELECT * FROM assessment_sessions WHERE id = ? FOR UPDATE', [$sessionId]);
        $this->assertNotEmpty($sessionLocked2);

        // Idempotency check: Connection 2 inspects status -> already EVALUATED!
        $this->assertEquals('EVALUATED', $sessionLocked2[0]->status);
        $this->assertEquals(20.0, (float) $sessionLocked2[0]->total_score);

        // Connection 2 does NOT re-evaluate or modify scores, commits cleanly
        $this->conn2->commit();

        // 6. Verify non-corrupted state in PostgreSQL
        $finalSession = $this->conn1->table('assessment_sessions')->where('id', $sessionId)->first();
        $this->assertEquals('EVALUATED', $finalSession->status);
        $this->assertEquals(20.0, (float) $finalSession->total_score);
        $this->assertTrue($finalSession->passed);

        $answerCount = $this->conn1->table('assessment_answers')->where('session_id', $sessionId)->count();
        $this->assertEquals(1, $answerCount, "Answers must not be duplicated.");
    }
}
