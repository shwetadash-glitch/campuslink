<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Offer;
use App\Models\OfferDocument;
use App\Enums\UserRole;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\OfferDocumentStatus;
use App\Services\Offers\OfferVerificationService;
use App\Exceptions\ReviewClaimConflictException;
use App\Exceptions\ReviewClaimExpiredException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PostgreSqlOfferVerificationConcurrencyTest extends TestCase
{
    protected $conn1;
    protected $conn2;
    protected int $officerId1;
    protected int $officerId2;
    protected int $studentId;
    protected int $offerId;
    protected OfferVerificationService $verificationService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->conn1 = DB::connection('pgsql_test');
        $this->conn2 = DB::connection('pgsql_test_secondary');

        // Confirm independent PostgreSQL backend worker PIDs
        $pid1 = $this->conn1->select('SELECT pg_backend_pid() AS pid')[0]->pid;
        $pid2 = $this->conn2->select('SELECT pg_backend_pid() AS pid')[0]->pid;
        $this->assertNotEquals($pid1, $pid2, "PostgreSQL test connections must have distinct backend process IDs.");

        // Clean tables
        $this->conn1->statement('TRUNCATE offer_verification_histories, offer_documents, offers, students, users CASCADE');

        // Seed users
        $this->officerId1 = $this->conn1->table('users')->insertGetId([
            'email' => 'tpo_conc_1@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->officerId2 = $this->conn1->table('users')->insertGetId([
            'email' => 'tpo_conc_2@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentUserId = $this->conn1->table('users')->insertGetId([
            'email' => 'student_conc_m8@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->studentId = $this->conn1->table('students')->insertGetId([
            'user_id' => $studentUserId,
            'student_identifier' => 'STU-CONC-M8-01',
            'first_name' => 'Kunal',
            'last_name' => 'Shah',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 9.2,
            'backlogs_current' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->offerId = $this->conn1->table('offers')->insertGetId([
            'student_id' => $this->studentId,
            'recruiter_id' => null,
            'job_id' => null,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 22.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Stripe India',
            'designation' => 'Software Engineer',
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->verificationService = app(OfferVerificationService::class);
    }

    /**
     * 1. Competing review claims: Two independent PostgreSQL transactions attempt to claim simultaneously.
     */
    public function test_concurrent_competing_review_claims(): void
    {
        $officer1 = User::on('pgsql_test')->find($this->officerId1);
        $officer2 = User::on('pgsql_test')->find($this->officerId2);
        $offer = Offer::on('pgsql_test')->find($this->offerId);

        // Conn 1 acquires the claim
        $claimedOffer = $this->verificationService->claimReview($offer, $officer1);
        $this->assertEquals($officer1->id, $claimedOffer->review_claimed_by);
        $this->assertTrue($claimedOffer->isReviewClaimActive());

        // Conn 2 attempts to claim the same offer while Conn 1 lease is active
        $conflictThrown = false;
        try {
            $this->verificationService->claimReview($offer->fresh(), $officer2);
        } catch (ReviewClaimConflictException $e) {
            $conflictThrown = true;
            $this->assertEquals(409, $e->getCode());
        }

        $this->assertTrue($conflictThrown, "Concurrent claim attempt on active lease must throw ReviewClaimConflictException (409).");
    }

    /**
     * 2. Expired lease reassignment: Officer 2 successfully recovers expired claim held by Officer 1.
     */
    public function test_concurrent_expired_lease_reassignment(): void
    {
        $officer1 = User::on('pgsql_test')->find($this->officerId1);
        $officer2 = User::on('pgsql_test')->find($this->officerId2);
        $offer = Offer::on('pgsql_test')->find($this->offerId);

        // Conn 1 acquired a claim 20 minutes ago (expired 5 minutes ago)
        $expiredToken = (string) Str::uuid();
        $this->conn1->table('offers')->where('id', $this->offerId)->update([
            'review_claim_token' => $expiredToken,
            'review_claimed_at' => now()->subMinutes(20),
            'review_claimed_until' => now()->subMinutes(5),
            'review_claimed_by' => $officer1->id,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
        ]);

        // Conn 2 recovers the expired lease
        $recoveredOffer = $this->verificationService->claimReview($offer->fresh(), $officer2);

        $this->assertEquals($officer2->id, $recoveredOffer->review_claimed_by);
        $this->assertNotEquals($expiredToken, $recoveredOffer->review_claim_token);
        $this->assertTrue($recoveredOffer->isReviewClaimActive());
    }

    /**
     * 3. Stale token rejection: Old officer holding expired token cannot submit verification after reassignment.
     */
    public function test_stale_token_rejected_after_reassignment(): void
    {
        $officer1 = User::on('pgsql_test')->find($this->officerId1);
        $officer2 = User::on('pgsql_test')->find($this->officerId2);
        $offer = Offer::on('pgsql_test')->find($this->offerId);

        // 1. Officer 1 claims
        $claimedOffer1 = $this->verificationService->claimReview($offer, $officer1);
        $staleToken = $claimedOffer1->review_claim_token;

        // 2. Lease expires artificially
        $this->conn1->table('offers')->where('id', $this->offerId)->update([
            'review_claimed_until' => now()->subMinute(),
        ]);

        // 3. Officer 2 reclaims
        $claimedOffer2 = $this->verificationService->claimReview($offer->fresh(), $officer2);
        $newToken = $claimedOffer2->review_claim_token;
        $this->assertNotEquals($staleToken, $newToken);

        // 4. Create document
        $docId = $this->conn1->table('offer_documents')->insertGetId([
            'offer_id' => $this->offerId,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/stripe.pdf',
            'storage_key' => 'test/stripe.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 5. Officer 1 attempts to submit decision with staleToken -> MUST FAIL with 409
        $staleRejected = false;
        try {
            $this->verificationService->verifyOffer($offer->fresh(), $officer1, $staleToken, $docId);
        } catch (ReviewClaimExpiredException $e) {
            $staleRejected = true;
            $this->assertEquals(409, $e->getCode());
        }
        $this->assertTrue($staleRejected, "Submitting decision with stale token after reassignment must fail with HTTP 409.");

        // 6. Officer 2 submits decision with newToken -> SUCCEEDS
        $verifiedOffer = $this->verificationService->verifyOffer($offer->fresh(), $officer2, $newToken, $docId);
        $this->assertEquals(OfferVerificationStatus::VERIFIED, $verifiedOffer->verification_status);
        $this->assertEquals($officer2->id, $verifiedOffer->verified_by);
    }

    /**
     * 4. Concurrent version allocation: Two independent connections uploading same document type allocate distinct monotonic versions.
     */
    public function test_concurrent_document_version_monotonic_allocation(): void
    {
        $offer = Offer::on('pgsql_test')->find($this->offerId);
        $officer = User::on('pgsql_test')->find($this->officerId1);

        // Transaction 1 locks offer and inserts version 1
        $this->conn1->beginTransaction();
        $this->conn1->table('offers')->where('id', $this->offerId)->lockForUpdate()->first();
        $maxVer1 = (int) ($this->conn1->table('offer_documents')
            ->where('offer_id', $this->offerId)
            ->where('document_type', 'OFFER_LETTER')
            ->max('version_number') ?? 0);
        $ver1 = $maxVer1 + 1;
        $this->conn1->table('offer_documents')->insert([
            'offer_id' => $this->offerId,
            'document_type' => 'OFFER_LETTER',
            'version_number' => $ver1,
            'file_url' => 'v1.pdf',
            'storage_key' => 'v1.pdf',
            'document_status' => 'SUPERSEDED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->conn1->commit();

        // Transaction 2 locks offer and inserts version 2
        $this->conn2->beginTransaction();
        $this->conn2->table('offers')->where('id', $this->offerId)->lockForUpdate()->first();
        $maxVer2 = (int) ($this->conn2->table('offer_documents')
            ->where('offer_id', $this->offerId)
            ->where('document_type', 'OFFER_LETTER')
            ->max('version_number') ?? 0);
        $ver2 = $maxVer2 + 1;
        $this->conn2->table('offer_documents')->insert([
            'offer_id' => $this->offerId,
            'document_type' => 'OFFER_LETTER',
            'version_number' => $ver2,
            'file_url' => 'v2.pdf',
            'storage_key' => 'v2.pdf',
            'document_status' => 'PENDING_REVIEW',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->conn2->commit();

        $this->assertEquals(1, $ver1);
        $this->assertEquals(2, $ver2);

        $docCount = $this->conn1->table('offer_documents')->where('offer_id', $this->offerId)->count();
        $this->assertEquals(2, $docCount);
    }
}
