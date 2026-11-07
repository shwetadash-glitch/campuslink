<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Enums\UserRole;
use App\Enums\CommunicationCategory;
use App\Services\Communication\CommunicationCoachService;
use App\Models\Student;
use App\Models\CommunicationPracticeSession;
use App\Models\CommunicationScenario;
use App\Exceptions\EvaluationClaimConflictException;
use App\Exceptions\RevisionConflictException;
use Illuminate\Support\Str;

class PostgreSqlCommunicationConcurrencyTest extends TestCase
{
    protected $conn1;
    protected $conn2;
    protected int $studentUserId;
    protected int $studentId;
    protected int $scenarioId;

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
        $this->conn1->statement('TRUNCATE communication_feedbacks, communication_practice_sessions, communication_scenarios, students, users CASCADE');

        // 1. Seed Student User & Profile
        $this->studentUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'comm_concurrency@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->studentId = $this->conn1->table('students')->insertGetId([
            'user_id' => $this->studentUserId,
            'student_identifier' => 'STU-COMM-CONC-001',
            'first_name' => 'Kavya',
            'last_name' => 'Iyer',
            'branch' => 'CSE',
            'graduation_year' => 2026,
            'cgpa' => 9.40,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Seed Scenario
        $this->scenarioId = $this->conn1->table('communication_scenarios')->insertGetId([
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'title' => 'Escalating an Unforeseen Sprint Blocker',
            'prompt_text' => 'Draft a concise email to your Engineering Lead explaining an API blocker.',
            'context_scenario' => 'External payment gateway is offline.',
            'target_audience' => 'Engineering Lead',
            'difficulty' => 'INTERMEDIATE',
            'min_word_limit' => 20,
            'max_word_limit' => 300,
            'recommended_min_words' => 50,
            'recommended_max_words' => 150,
            'key_focus_areas' => json_encode(['Executive summary', 'Mitigation steps']),
            'curated_factual_guidance' => 'State the issue, business impact, mitigation taken, and proposed timeline.',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * 1. Concurrency Test: Simultaneous new-attempt requests allocate sequential attempt numbers without collisions.
     */
    public function test_concurrent_new_attempt_requests_allocate_sequential_attempt_numbers(): void
    {
        $student = Student::on('pgsql_test')->findOrFail($this->studentId);
        $service1 = app(CommunicationCoachService::class);

        // Connection 1 begins transaction and acquires advisory lock
        $this->conn1->beginTransaction();
        $lockKey = crc32("comm_attempt_{$this->studentId}_{$this->scenarioId}");
        $this->conn1->statement("SELECT pg_advisory_xact_lock(?)", [$lockKey]);

        $maxAttempt1 = $this->conn1->table('communication_practice_sessions')
            ->where('student_id', $this->studentId)
            ->where('scenario_id', $this->scenarioId)
            ->whereNull('parent_session_id')
            ->max('attempt_number') ?? 0;

        $sess1Id = $this->conn1->table('communication_practice_sessions')->insertGetId([
            'student_id' => $this->studentId,
            'scenario_id' => $this->scenarioId,
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'status' => 'IN_PROGRESS',
            'attempt_number' => $maxAttempt1 + 1,
            'revision_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Connection 2 attempts to allocate attempt number concurrently
        // Because of the advisory lock on Conn 1, Conn 2 will wait or serialize
        $this->conn1->commit(); // Release lock on Conn 1

        // Now Connection 2 acquires lock and allocates
        $this->conn2->beginTransaction();
        $this->conn2->statement("SELECT pg_advisory_xact_lock(?)", [$lockKey]);

        $maxAttempt2 = $this->conn2->table('communication_practice_sessions')
            ->where('student_id', $this->studentId)
            ->where('scenario_id', $this->scenarioId)
            ->whereNull('parent_session_id')
            ->max('attempt_number') ?? 0;

        $sess2Id = $this->conn2->table('communication_practice_sessions')->insertGetId([
            'student_id' => $this->studentId,
            'scenario_id' => $this->scenarioId,
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'status' => 'IN_PROGRESS',
            'attempt_number' => $maxAttempt2 + 1,
            'revision_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->conn2->commit();

        // Verify sequential attempts allocated: 1 and 2
        $attempts = $this->conn1->table('communication_practice_sessions')
            ->where('student_id', $this->studentId)
            ->orderBy('id')
            ->pluck('attempt_number')
            ->all();

        $this->assertEquals([1, 2], $attempts);
        $this->assertNotEquals($sess1Id, $sess2Id);
    }

    /**
     * 2. Concurrency Test: Simultaneous submissions to the same session - only one acquires claim lease.
     */
    public function test_concurrent_submissions_to_same_session_only_one_acquires_claim_lease(): void
    {
        $sessionId = $this->conn1->table('communication_practice_sessions')->insertGetId([
            'student_id' => $this->studentId,
            'scenario_id' => $this->scenarioId,
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'status' => 'IN_PROGRESS',
            'attempt_number' => 1,
            'revision_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token1 = (string) Str::uuid();
        $token2 = (string) Str::uuid();
        $leaseCutoff = Carbon::now()->subSeconds(120);

        // Connection 1 claims the session
        $affected1 = $this->conn1->table('communication_practice_sessions')
            ->where('id', $sessionId)
            ->where('student_id', $this->studentId)
            ->where(function ($query) use ($leaseCutoff) {
                $query->whereIn('status', ['IN_PROGRESS', 'EVALUATION_FAILED'])
                    ->orWhere(function ($q) use ($leaseCutoff) {
                        $q->where('status', 'EVALUATION_IN_PROGRESS')
                          ->where('evaluation_claimed_at', '<', $leaseCutoff);
                    });
            })
            ->update([
                'status' => 'EVALUATION_IN_PROGRESS',
                'student_response' => 'Response from connection 1',
                'evaluation_claim_token' => $token1,
                'evaluation_claimed_at' => now(),
                'updated_at' => now(),
            ]);

        $this->assertEquals(1, $affected1, "Connection 1 must successfully acquire claim lease.");

        // Connection 2 attempts to claim the same session while lease is active
        $affected2 = $this->conn2->table('communication_practice_sessions')
            ->where('id', $sessionId)
            ->where('student_id', $this->studentId)
            ->where(function ($query) use ($leaseCutoff) {
                $query->whereIn('status', ['IN_PROGRESS', 'EVALUATION_FAILED'])
                    ->orWhere(function ($q) use ($leaseCutoff) {
                        $q->where('status', 'EVALUATION_IN_PROGRESS')
                          ->where('evaluation_claimed_at', '<', $leaseCutoff);
                    });
            })
            ->update([
                'status' => 'EVALUATION_IN_PROGRESS',
                'student_response' => 'Response from connection 2',
                'evaluation_claim_token' => $token2,
                'evaluation_claimed_at' => now(),
                'updated_at' => now(),
            ]);

        $this->assertEquals(0, $affected2, "Connection 2 must be rejected with 0 rows affected (claim conflict).");

        // Verify session remains leased to Connection 1
        $currentSession = $this->conn1->table('communication_practice_sessions')->where('id', $sessionId)->first();
        $this->assertEquals($token1, $currentSession->evaluation_claim_token);
        $this->assertEquals('EVALUATION_IN_PROGRESS', $currentSession->status);
    }

    /**
     * 3. Concurrency Test: Concurrent linear follow-up revisions reject duplicate branches.
     */
    public function test_concurrent_linear_follow_up_revisions_reject_duplicate_branch(): void
    {
        $parentId = $this->conn1->table('communication_practice_sessions')->insertGetId([
            'student_id' => $this->studentId,
            'scenario_id' => $this->scenarioId,
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'status' => 'EVALUATED',
            'attempt_number' => 1,
            'revision_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Connection 1 inserts first linear child
        $child1Id = $this->conn1->table('communication_practice_sessions')->insertGetId([
            'student_id' => $this->studentId,
            'scenario_id' => $this->scenarioId,
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'status' => 'IN_PROGRESS',
            'attempt_number' => 1,
            'revision_number' => 2,
            'parent_session_id' => $parentId,
            'is_follow_up' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertGreaterThan(0, $child1Id);

        // Connection 2 attempts to insert a second direct child on the same parent session
        // (even with a different revision_number = 3)
        // Blocked by PostgreSQL unique partial index uq_comm_session_single_parent
        $duplicateCaught = false;
        try {
            $this->conn2->table('communication_practice_sessions')->insert([
                'student_id' => $this->studentId,
                'scenario_id' => $this->scenarioId,
                'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
                'status' => 'IN_PROGRESS',
                'attempt_number' => 1,
                'revision_number' => 3, // Different revision number to specifically isolate uq_comm_session_single_parent
                'parent_session_id' => $parentId,
                'is_follow_up' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            $duplicateCaught = true;
            $this->assertStringContainsString('uq_comm_session_single_parent', $e->getMessage());
        }

        $this->assertTrue($duplicateCaught, "PostgreSQL unique partial index must block duplicate revision children.");
    }

    /**
     * 4. Concurrency Test: Expired lease is recovered, and stale delayed result is safely rejected.
     */
    public function test_expired_lease_is_recovered_and_stale_result_is_safely_rejected(): void
    {
        $oldToken = (string) Str::uuid();
        $expiredClaimTime = Carbon::now()->subSeconds(150); // Leased 150 seconds ago (>120s limit)

        $sessionId = $this->conn1->table('communication_practice_sessions')->insertGetId([
            'student_id' => $this->studentId,
            'scenario_id' => $this->scenarioId,
            'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
            'status' => 'EVALUATION_IN_PROGRESS',
            'student_response' => 'Initial response from crashed worker',
            'evaluation_claim_token' => $oldToken,
            'evaluation_claimed_at' => $expiredClaimTime,
            'attempt_number' => 1,
            'revision_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $newToken = (string) Str::uuid();
        $leaseCutoff = Carbon::now()->subSeconds(120);

        // Connection 2 (Retry request) detects expired lease and reclaims session
        $reclaimed = $this->conn2->table('communication_practice_sessions')
            ->where('id', $sessionId)
            ->where('student_id', $this->studentId)
            ->where(function ($query) use ($leaseCutoff) {
                $query->whereIn('status', ['IN_PROGRESS', 'EVALUATION_FAILED'])
                    ->orWhere(function ($q) use ($leaseCutoff) {
                        $q->where('status', 'EVALUATION_IN_PROGRESS')
                          ->where('evaluation_claimed_at', '<', $leaseCutoff);
                    });
            })
            ->update([
                'status' => 'EVALUATION_IN_PROGRESS',
                'evaluation_claim_token' => $newToken,
                'evaluation_claimed_at' => now(),
                'updated_at' => now(),
            ]);

        $this->assertEquals(1, $reclaimed, "Retry request must successfully reclaim expired evaluation lease.");

        // Now, Connection 1 (delayed zombie inference from first worker) returns and attempts Stage 3 persistence
        // It tries to update WHERE evaluation_claim_token = :oldToken
        $staleUpdateAffected = $this->conn1->table('communication_practice_sessions')
            ->where('id', $sessionId)
            ->where('evaluation_claim_token', $oldToken)
            ->update([
                'status' => 'EVALUATED',
                'evaluated_at' => now(),
                'evaluation_claim_token' => null,
                'updated_at' => now(),
            ]);

        $this->assertEquals(0, $staleUpdateAffected, "Stale inference with superseded claim token must touch 0 rows.");

        // Verify session remains active under new retry token
        $currentSession = $this->conn1->table('communication_practice_sessions')->where('id', $sessionId)->first();
        $this->assertEquals($newToken, $currentSession->evaluation_claim_token);
        $this->assertEquals('EVALUATION_IN_PROGRESS', $currentSession->status);
    }

    /**
     * 5. Concurrency Test: HTTP-level verification that concurrent revision request catches PostgreSQL unique constraint and returns HTTP 409.
     */
    public function test_concurrent_revision_requests_catch_unique_violation_and_produce_http_409(): void
    {
        $originalDefault = config('database.default');
        config(['database.default' => 'pgsql_test']);

        try {
            // Parent session on PostgreSQL test database
            $parentId = $this->conn1->table('communication_practice_sessions')->insertGetId([
                'student_id' => $this->studentId,
                'scenario_id' => $this->scenarioId,
                'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
                'status' => 'EVALUATED',
                'attempt_number' => 1,
                'revision_number' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Connection 1 inserts first linear child revision
            $child1Id = $this->conn1->table('communication_practice_sessions')->insertGetId([
                'student_id' => $this->studentId,
                'scenario_id' => $this->scenarioId,
                'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
                'status' => 'IN_PROGRESS',
                'attempt_number' => 1,
                'revision_number' => 2,
                'parent_session_id' => $parentId,
                'is_follow_up' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->assertGreaterThan(0, $child1Id);

            // Authenticate student on pgsql_test
            $user = \App\Models\User::on('pgsql_test')->find($this->studentUserId);
            $token = $user->createToken('test_pg_token')->plainTextToken;

            // Connection 2 (dispatched via HTTP endpoint) attempts to create competing revision on the same parent
            $res = $this->withHeader('Authorization', "Bearer {$token}")
                ->postJson("/api/v1/students/me/communication-coach/sessions/{$parentId}/revision");

            // Assert: The losing request receives HTTP 409 (not 500) and no unhandled database exception reaches the client
            $res->assertStatus(409)
                ->assertJson([
                    'error' => 'REVISION_ALREADY_EXISTS',
                    'existing_revision_id' => $child1Id,
                ]);

            // Assert exactly 1 child revision exists in PostgreSQL
            $childrenCount = $this->conn1->table('communication_practice_sessions')
                ->where('parent_session_id', $parentId)
                ->count();
            $this->assertEquals(1, $childrenCount, "Exactly one child revision must exist in PostgreSQL.");
        } finally {
            config(['database.default' => $originalDefault]);
        }
    }
}
