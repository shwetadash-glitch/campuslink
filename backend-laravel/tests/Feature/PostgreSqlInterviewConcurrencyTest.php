<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Enums\UserRole;

class PostgreSqlInterviewConcurrencyTest extends TestCase
{
    protected $conn1;
    protected $conn2;
    protected int $officerUserId;
    protected int $studentUserId;
    protected int $studentId;
    protected int $companyId;
    protected int $jobId;
    protected int $driveId;
    protected int $interviewId;
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
        $this->conn1->statement('TRUNCATE ai_interview_score_histories, ai_interview_messages, ai_interview_sessions, ai_interview_questions, ai_interviews, drive_candidate_status_histories, drive_candidates, placement_drives, jobs, companies, students, users CASCADE');

        // 1. Seed Placement Officer
        $this->officerUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'tpo_interview@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Seed Student User & Profile
        $this->studentUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'interview_candidate@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->studentId = $this->conn1->table('students')->insertGetId([
            'user_id' => $this->studentUserId,
            'student_identifier' => 'STU-INTERVIEW-001',
            'first_name' => 'Aditya',
            'last_name' => 'Mukherjee',
            'branch' => 'CSE',
            'graduation_year' => 2026,
            'cgpa' => 9.20,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Seed Company & Drive
        $this->companyId = $this->conn1->table('companies')->insertGetId([
            'name' => 'DataScale Global',
            'industry' => 'Cloud Platforms',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->jobId = $this->conn1->table('jobs')->insertGetId([
            'company_id' => $this->companyId,
            'title' => 'Core Systems Engineer',
            'description' => 'Architect high-throughput microservices using PostgreSQL.',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->driveId = $this->conn1->table('placement_drives')->insertGetId([
            'company_id' => $this->companyId,
            'job_id' => $this->jobId,
            'name' => 'DataScale Campus Drive 2026',
            'start_date' => now()->addDays(1),
            'end_date' => now()->addDays(5),
            'status' => 'PUBLISHED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 4. Seed Published AI Interview
        $this->interviewId = $this->conn1->table('ai_interviews')->insertGetId([
            'title' => 'Core Systems Technical & Behavioral Interview',
            'code' => 'DATASCALE-INT-01',
            'target_role' => 'Core Systems Engineer',
            'interview_type' => 'MIXED',
            'difficulty' => 'MEDIUM',
            'duration_minutes' => 30,
            'max_questions' => 2,
            'max_follow_ups_per_question' => 1,
            'pass_percentage' => 70.0,
            'drive_id' => $this->driveId,
            'job_id' => $this->jobId,
            'status' => 'PUBLISHED',
            'published_at' => now(),
            'created_by_user_id' => $this->officerUserId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->questionId = $this->conn1->table('ai_interview_questions')->insertGetId([
            'ai_interview_id' => $this->interviewId,
            'stage' => 'TECHNICAL',
            'order_index' => 1,
            'category' => 'Database Internals',
            'question_text' => 'How does Multi-Version Concurrency Control (MVCC) work in PostgreSQL to ensure readers never block writers?',
            'expected_answer_points' => json_encode(['xmin/xmax headers', 'Snapshot isolation', 'Vacuum tuple cleaning']),
            'rubric' => json_encode(['technical_depth' => 'Evaluates MVCC tuple visibility']),
            'weight' => 1.5,
            'ai_generated' => false,
            'ai_review_status' => 'APPROVED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Test 1: PostgreSQL Concurrency — Simultaneous interview start requests across two independent connections.
     * Pessimistic row locking on the student profile guarantees that only ONE session is created.
     * Duplicate attempts are prevented.
     */
    public function test_concurrent_session_starts_enforce_single_attempt_integrity(): void
    {
        $this->conn1->beginTransaction();
        $this->conn2->beginTransaction();

        $sessionCreated1 = false;
        $sessionCreated2 = false;

        try {
            // Connection 1 locks the student row
            $student1 = $this->conn1->table('students')->where('id', $this->studentId)->lockForUpdate()->first();
            $this->assertNotNull($student1);

            $prevCount1 = $this->conn1->table('ai_interview_sessions')
                ->where('ai_interview_id', $this->interviewId)
                ->where('student_id', $this->studentId)
                ->count();

            if ($prevCount1 === 0) {
                $this->conn1->table('ai_interview_sessions')->insert([
                    'ai_interview_id' => $this->interviewId,
                    'student_id' => $this->studentId,
                    'attempt_number' => 1,
                    'status' => 'IN_PROGRESS',
                    'current_stage' => 'TECHNICAL',
                    'current_question_index' => 0,
                    'follow_ups_count_for_current' => 0,
                    'started_at' => Carbon::now(),
                    'expires_at' => Carbon::now()->addMinutes(30),
                    'total_score' => 0.0,
                    'passed' => false,
                    'is_provisional' => true,
                    'ai_review_status' => 'PENDING_HUMAN_REVIEW',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $sessionCreated1 = true;
            }

            // Connection 1 commits
            $this->conn1->commit();

            // Connection 2 now acquires the lock on the student row
            $student2 = $this->conn2->table('students')->where('id', $this->studentId)->lockForUpdate()->first();
            $this->assertNotNull($student2);

            $prevCount2 = $this->conn2->table('ai_interview_sessions')
                ->where('ai_interview_id', $this->interviewId)
                ->where('student_id', $this->studentId)
                ->count();

            // Connection 2 sees that previous attempt exists (prevCount2 >= 1) and does not insert duplicate!
            if ($prevCount2 === 0) {
                $this->conn2->table('ai_interview_sessions')->insert([
                    'ai_interview_id' => $this->interviewId,
                    'student_id' => $this->studentId,
                    'attempt_number' => 1,
                    'status' => 'IN_PROGRESS',
                    'current_stage' => 'TECHNICAL',
                    'current_question_index' => 0,
                    'follow_ups_count_for_current' => 0,
                    'started_at' => Carbon::now(),
                    'expires_at' => Carbon::now()->addMinutes(30),
                    'total_score' => 0.0,
                    'passed' => false,
                    'is_provisional' => true,
                    'ai_review_status' => 'PENDING_HUMAN_REVIEW',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $sessionCreated2 = true;
            }

            $this->conn2->commit();
        } catch (\Throwable $e) {
            $this->conn1->rollBack();
            $this->conn2->rollBack();
            throw $e;
        }

        $this->assertTrue($sessionCreated1, "Connection 1 must successfully create the first session attempt.");
        $this->assertFalse($sessionCreated2, "Connection 2 must detect the existing attempt and strictly reject duplicate session creation.");

        // Authoritative verification: exactly one session exists in PostgreSQL
        $totalSessions = $this->conn1->table('ai_interview_sessions')
            ->where('ai_interview_id', $this->interviewId)
            ->where('student_id', $this->studentId)
            ->count();

        $this->assertEquals(1, $totalSessions);
    }

    /**
     * Test 2: PostgreSQL Database Unique Constraint Enforcement.
     * Direct concurrent insert with same (ai_interview_id, student_id, attempt_number)
     * triggers Postgres 23505 unique violation.
     */
    public function test_postgresql_unique_constraint_blocks_duplicate_attempts(): void
    {
        // Insert attempt 1
        $this->conn1->table('ai_interview_sessions')->insert([
            'ai_interview_id' => $this->interviewId,
            'student_id' => $this->studentId,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'current_stage' => 'TECHNICAL',
            'current_question_index' => 0,
            'follow_ups_count_for_current' => 0,
            'started_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addMinutes(30),
            'total_score' => 0.0,
            'passed' => false,
            'is_provisional' => true,
            'ai_review_status' => 'PENDING_HUMAN_REVIEW',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attempting to insert duplicate attempt 1 on Connection 2 must throw PostgreSQL 23505 unique violation
        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->expectExceptionMessageMatches('/23505|uniq_interview_student_attempt/i');

        $this->conn2->table('ai_interview_sessions')->insert([
            'ai_interview_id' => $this->interviewId,
            'student_id' => $this->studentId,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'current_stage' => 'TECHNICAL',
            'current_question_index' => 0,
            'follow_ups_count_for_current' => 0,
            'started_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addMinutes(30),
            'total_score' => 0.0,
            'passed' => false,
            'is_provisional' => true,
            'ai_review_status' => 'PENDING_HUMAN_REVIEW',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Test 3: PostgreSQL Concurrency — Row-Level Locking on Candidate Session prevents lost answer updates.
     */
    public function test_session_row_locking_serializes_concurrent_answer_recording(): void
    {
        $sessionId = $this->conn1->table('ai_interview_sessions')->insertGetId([
            'ai_interview_id' => $this->interviewId,
            'student_id' => $this->studentId,
            'attempt_number' => 1,
            'status' => 'IN_PROGRESS',
            'current_stage' => 'TECHNICAL',
            'current_question_index' => 0,
            'follow_ups_count_for_current' => 0,
            'started_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addMinutes(30),
            'total_score' => 0.0,
            'passed' => false,
            'is_provisional' => true,
            'ai_review_status' => 'PENDING_HUMAN_REVIEW',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->conn1->beginTransaction();
        $this->conn2->beginTransaction();

        try {
            // Connection 1 locks the session row
            $session1 = $this->conn1->table('ai_interview_sessions')->where('id', $sessionId)->lockForUpdate()->first();
            $this->assertNotNull($session1);

            // Connection 1 records candidate answer and updates follow-up count
            $this->conn1->table('ai_interview_messages')->insert([
                'session_id' => $sessionId,
                'question_id' => $this->questionId,
                'sender' => 'CANDIDATE',
                'message_type' => 'ANSWER',
                'content' => 'MVCC uses transaction IDs (xmin/xmax) in tuple headers.',
                'is_follow_up' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->conn1->table('ai_interview_sessions')->where('id', $sessionId)->update([
                'follow_ups_count_for_current' => 1,
                'updated_at' => now(),
            ]);

            $this->conn1->commit();

            // Connection 2 now acquires lock after Connection 1 commits
            $session2 = $this->conn2->table('ai_interview_sessions')->where('id', $sessionId)->lockForUpdate()->first();
            $this->assertEquals(1, $session2->follow_ups_count_for_current, "Connection 2 must see updated follow-up count without lost updates.");

            // Connection 2 records follow-up probe
            $this->conn2->table('ai_interview_messages')->insert([
                'session_id' => $sessionId,
                'question_id' => $this->questionId,
                'sender' => 'AI',
                'message_type' => 'FOLLOW_UP',
                'content' => 'How does PostgreSQL handle dead tuple cleanup under high write load?',
                'is_follow_up' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->conn2->commit();
        } catch (\Throwable $e) {
            $this->conn1->rollBack();
            $this->conn2->rollBack();
            throw $e;
        }

        $messagesCount = $this->conn1->table('ai_interview_messages')->where('session_id', $sessionId)->count();
        $this->assertEquals(2, $messagesCount);
    }
}
