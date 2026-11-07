<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Offer;
use App\Models\OfferDocument;
use App\Models\OfferVerificationHistory;
use App\Enums\UserRole;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\OfferDocumentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class Milestone8Stage1FoundationTest extends TestCase
{
    use RefreshDatabase;

    protected User $tpoUser;
    protected User $otherTpoUser;
    protected User $studentUser;
    protected Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tpoUser = User::create([
            'email' => 'tpo.verif@campuslink.edu',
            'password_hash' => bcrypt('AdminPass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        $this->otherTpoUser = User::create([
            'email' => 'other.tpo@campuslink.edu',
            'password_hash' => bcrypt('AdminPass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        $this->studentUser = User::create([
            'email' => 'student.m8@campuslink.edu',
            'password_hash' => bcrypt('StudentPass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'student_identifier' => 'STU-M8-2026-001',
            'first_name' => 'Kavya',
            'last_name' => 'Iyer',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.75,
            'backlogs_current' => 0,
        ]);
    }

    /**
     * 1. Test OfferVerificationStatus enum values, state checks, and transition rules.
     */
    public function test_offer_verification_status_enum_values_and_helpers(): void
    {
        $this->assertEquals('PENDING_VERIFICATION', OfferVerificationStatus::PENDING_VERIFICATION->value);
        $this->assertEquals('UNDER_REVIEW', OfferVerificationStatus::UNDER_REVIEW->value);
        $this->assertEquals('NEEDS_ADDITIONAL_INFO', OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value);
        $this->assertEquals('VERIFIED', OfferVerificationStatus::VERIFIED->value);
        $this->assertEquals('REJECTED', OfferVerificationStatus::REJECTED->value);

        $this->assertTrue(OfferVerificationStatus::VERIFIED->isVerified());
        $this->assertFalse(OfferVerificationStatus::PENDING_VERIFICATION->isVerified());

        $this->assertTrue(OfferVerificationStatus::VERIFIED->isTerminal());
        $this->assertTrue(OfferVerificationStatus::REJECTED->isTerminal());
        $this->assertFalse(OfferVerificationStatus::UNDER_REVIEW->isTerminal());
        $this->assertFalse(OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->isTerminal());

        $this->assertTrue(OfferVerificationStatus::PENDING_VERIFICATION->canBeClaimed());
        $this->assertTrue(OfferVerificationStatus::UNDER_REVIEW->canBeClaimed());
        $this->assertTrue(OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->canBeClaimed());
        $this->assertFalse(OfferVerificationStatus::VERIFIED->canBeClaimed());
    }

    /**
     * 2. Test OfferDocumentStatus enum values and helper methods.
     */
    public function test_offer_document_status_enum_values_and_helpers(): void
    {
        $this->assertEquals('PENDING_REVIEW', OfferDocumentStatus::PENDING_REVIEW->value);
        $this->assertEquals('ACCEPTED_AS_VALID', OfferDocumentStatus::ACCEPTED_AS_VALID->value);
        $this->assertEquals('REJECTED_DEFECTIVE', OfferDocumentStatus::REJECTED_DEFECTIVE->value);
        $this->assertEquals('SUPERSEDED', OfferDocumentStatus::SUPERSEDED->value);

        $this->assertTrue(OfferDocumentStatus::ACCEPTED_AS_VALID->isValid());
        $this->assertTrue(OfferDocumentStatus::ACCEPTED_AS_VALID->isReviewed());
        $this->assertTrue(OfferDocumentStatus::REJECTED_DEFECTIVE->isReviewed());
        $this->assertTrue(OfferDocumentStatus::SUPERSEDED->isReviewed());
        $this->assertFalse(OfferDocumentStatus::PENDING_REVIEW->isReviewed());
    }

    /**
     * 3. Test Offer model casts, default verification status, and relationships.
     */
    public function test_offer_model_casts_and_defaults(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 12.5,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Tata Consultancy Services',
            'designation' => 'Systems Engineer',
        ]);

        $this->assertNotNull($offer->id);
        $this->assertEquals(OfferVerificationStatus::PENDING_VERIFICATION, $offer->verification_status);
        $this->assertFalse($offer->isVerified());
        $this->assertTrue($offer->is_off_campus);
        $this->assertEquals('Tata Consultancy Services', $offer->company_name);
        $this->assertEquals('Systems Engineer', $offer->designation);
        $this->assertNull($offer->recruiter_id);
        $this->assertNull($offer->job_id);
    }

    /**
     * 4. Test off-campus offers with nullable recruiter_id and job_id.
     */
    public function test_off_campus_offer_intake_without_recruiter_and_job(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'recruiter_id' => null,
            'job_id' => null,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 18.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Microsoft India',
            'designation' => 'Software Engineer',
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
        ]);

        $this->assertDatabaseHas('offers', [
            'id' => $offer->id,
            'student_id' => $this->student->id,
            'recruiter_id' => null,
            'job_id' => null,
            'is_off_campus' => true,
            'company_name' => 'Microsoft India',
            'verification_status' => 'PENDING_VERIFICATION',
        ]);
    }

    /**
     * 5. Test review claim lease helpers and 15-minute lease expiration logic.
     */
    public function test_offer_review_claim_lease_helpers(): void
    {
        $token = (string) Str::uuid();
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 10.0,
            'offer_date' => now(),
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $token,
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->tpoUser->id,
        ]);

        // Active lease checks
        $this->assertTrue($offer->isReviewClaimActive());
        $this->assertTrue($offer->isClaimedBy($this->tpoUser));
        $this->assertFalse($offer->isClaimedBy($this->otherTpoUser));
        $this->assertFalse($offer->canBeClaimedBy($this->otherTpoUser));
        $this->assertTrue($offer->canBeClaimedBy($this->tpoUser));

        // Expire lease
        $offer->update([
            'review_claimed_until' => now()->subMinute(),
        ]);
        $offer->refresh();

        $this->assertFalse($offer->isReviewClaimActive());
        $this->assertFalse($offer->isClaimedBy($this->tpoUser));
        $this->assertTrue($offer->canBeClaimedBy($this->otherTpoUser));
    }

    /**
     * 6. Test Offer scopes (verified, pendingVerification, underReview, needsAdditionalInfo, verifiedPlacement, offCampus).
     */
    public function test_offer_scopes_filtering(): void
    {
        // 1. Off-campus verified and accepted
        $offer1 = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::ACCEPTED->value,
            'ctc' => 15.0,
            'offer_date' => now(),
            'acceptance_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Google',
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'verified_at' => now(),
            'verified_by' => $this->tpoUser->id,
        ]);

        // 2. Off-campus pending verification
        $offer2 = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 12.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Amazon',
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
        ]);

        // 3. Under review
        $offer3 = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 11.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Flipkart',
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
        ]);

        // 4. Needs additional info
        $offer4 = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 9.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Swiggy',
            'verification_status' => OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value,
        ]);

        $this->assertCount(1, Offer::verified()->get());
        $this->assertCount(1, Offer::pendingVerification()->get());
        $this->assertCount(1, Offer::underReview()->get());
        $this->assertCount(1, Offer::needsAdditionalInfo()->get());
        $this->assertCount(1, Offer::verifiedPlacement()->get());
        $this->assertEquals($offer1->id, Offer::verifiedPlacement()->first()->id);
        $this->assertCount(4, Offer::offCampus()->get());
    }

    /**
     * 7. Test OfferDocument model versioning, storage disk, file hash, and casts.
     */
    public function test_offer_document_model_versioning_and_casts(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 14.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Oracle',
        ]);

        $doc = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'legacy/placeholder.pdf',
            'storage_disk' => 'private',
            'storage_key' => 'offer_documents/' . $offer->id . '/v1_letter.pdf',
            'file_hash' => hash('sha256', 'sample offer content v1'),
            'file_size_bytes' => 10240,
            'mime_type' => 'application/pdf',
            'original_filename' => 'Oracle_Offer_Letter.pdf',
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'uploaded_by' => $this->studentUser->id,
            'verified_by' => $this->tpoUser->id,
            'extracted_metadata' => ['company' => 'Oracle', 'ctc' => 14.0],
        ]);

        $this->assertNotNull($doc->id);
        $this->assertEquals(1, $doc->version_number);
        $this->assertEquals(OfferDocumentStatus::ACCEPTED_AS_VALID, $doc->document_status);
        $this->assertTrue($doc->isValid());
        $this->assertEquals(10240, $doc->file_size_bytes);
        $this->assertEquals('Oracle', $doc->extracted_metadata['company']);
        $this->assertEquals($offer->id, $doc->offer->id);
        $this->assertEquals($this->studentUser->id, $doc->uploadedBy->id);
        $this->assertEquals($this->tpoUser->id, $doc->verifiedBy->id);
    }

    /**
     * 8. Test comprehensive OfferDocument immutability across all 8 evidence columns.
     */
    public function test_offer_document_immutability_prevents_in_place_overwrite(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 14.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Oracle',
        ]);

        $doc = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'legacy/placeholder.pdf',
            'storage_disk' => 'private',
            'storage_key' => 'offer_documents/' . $offer->id . '/v1_letter.pdf',
            'file_hash' => hash('sha256', 'sample content'),
            'mime_type' => 'application/pdf',
            'file_size_bytes' => 2048,
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        // 1. Attempting to update storage_key in place must fail
        try {
            $doc->update(['storage_key' => 'offer_documents/' . $offer->id . '/tampered.pdf']);
            $this->fail('Should not allow storage_key mutation');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $doc->refresh();

        // 2. Attempting to update file_hash in place must fail
        try {
            $doc->update(['file_hash' => hash('sha256', 'tampered')]);
            $this->fail('Should not allow file_hash mutation');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $doc->refresh();

        // 3. Attempting to update version_number in place must fail
        try {
            $doc->update(['version_number' => 2]);
            $this->fail('Should not allow version_number mutation');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $doc->refresh();

        // 4. Attempting to update document_type in place must fail
        try {
            $doc->update(['document_type' => 'OTHER_TYPE']);
            $this->fail('Should not allow document_type mutation');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $doc->refresh();

        // 5. Attempting to update mime_type in place must fail
        try {
            $doc->update(['mime_type' => 'image/png']);
            $this->fail('Should not allow mime_type mutation');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $doc->refresh();

        // 6. Attempting to update file_size_bytes in place must fail
        try {
            $doc->update(['file_size_bytes' => 9999]);
            $this->fail('Should not allow file_size_bytes mutation');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable', $e->getMessage());
        }
        $doc->refresh();

        // Updating review status and notes is ALLOWED
        $doc->update([
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'verified_by' => $this->tpoUser->id,
            'verified_at' => now(),
        ]);
        $doc->refresh();
        $this->assertEquals(OfferDocumentStatus::ACCEPTED_AS_VALID, $doc->document_status);
        $this->assertEquals($this->tpoUser->id, $doc->verified_by);
    }

    /**
     * 9. Test legacy OfferDocument compatibility where only file_url is present.
     */
    public function test_offer_document_legacy_mode_compatibility(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 14.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Legacy Corp',
        ]);

        $legacyDoc = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'https://storage.legacy.edu/offers/sample.pdf',
            'verification_status' => 'PENDING',
            'storage_disk' => 'private',
            'storage_key' => null,
            'file_hash' => null,
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        $this->assertTrue($legacyDoc->isLegacy());
        $this->assertEquals('https://storage.legacy.edu/offers/sample.pdf', $legacyDoc->file_url);
        $this->assertEquals(OfferDocumentStatus::PENDING_REVIEW, $legacyDoc->document_status);
        $this->assertFalse($legacyDoc->isVerified());
    }

    /**
     * 10. Test unique constraint UNIQUE(offer_id, document_type, version_number).
     */
    public function test_unique_constraint_on_offer_documents_version_scope(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 11.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Cisco',
        ]);

        OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'offer_documents/v1.pdf',
            'storage_key' => 'v1.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        // Same offer and document_type, version 2 is allowed
        $doc2 = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 2,
            'file_url' => 'offer_documents/v2.pdf',
            'storage_key' => 'v2.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);
        $this->assertEquals(2, $doc2->version_number);

        // Different document_type, version 1 is allowed
        $docEmail = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'CONFIRMATION_EMAIL',
            'version_number' => 1,
            'file_url' => 'offer_documents/email_v1.pdf',
            'storage_key' => 'email_v1.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);
        $this->assertEquals(1, $docEmail->version_number);

        // Duplicate (offer_id, document_type, version_number) must fail unique constraint
        $this->expectException(\Illuminate\Database\QueryException::class);
        OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'offer_documents/duplicate.pdf',
            'storage_key' => 'duplicate.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);
    }

    /**
     * 11. Test OfferVerificationHistory requires actor_user_id and auto-snapshots actor identity.
     */
    public function test_offer_verification_history_requires_actor_and_snapshots_identity(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 10.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Wipro',
        ]);

        // 1. Missing actor_user_id must throw InvalidArgumentException
        try {
            OfferVerificationHistory::create([
                'offer_id' => $offer->id,
                'action' => 'CLAIMED',
                'new_status' => 'UNDER_REVIEW',
            ]);
            $this->fail('Should require actor_user_id');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('actor_user_id is required', $e->getMessage());
        }

        // 2. Creating with actor_user_id auto-snapshots name and email
        $history = OfferVerificationHistory::create([
            'offer_id' => $offer->id,
            'actor_user_id' => $this->tpoUser->id,
            'action' => 'CLAIMED',
            'previous_status' => 'PENDING_VERIFICATION',
            'new_status' => 'UNDER_REVIEW',
            'review_claim_token' => (string) Str::uuid(),
            'notes' => 'Claim acquired by TPO',
        ]);

        $this->assertNotNull($history->id);
        $this->assertEquals($this->tpoUser->email, $history->actor_email);
        $this->assertNotEmpty($history->actor_name);
        $this->assertEquals($this->tpoUser->id, $history->actor->id);
    }

    /**
     * 12. Test OfferVerificationHistory is append-only and cannot be updated or deleted.
     */
    public function test_offer_verification_history_is_append_only_and_immutable(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 10.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Wipro',
        ]);

        $history = OfferVerificationHistory::create([
            'offer_id' => $offer->id,
            'actor_user_id' => $this->tpoUser->id,
            'action' => 'CLAIMED',
            'previous_status' => 'PENDING_VERIFICATION',
            'new_status' => 'UNDER_REVIEW',
        ]);

        // Updates must fail
        try {
            $history->update(['notes' => 'Tampered notes']);
            $this->fail('History update should fail');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('append-only and cannot be modified', $e->getMessage());
        }

        // Deletions must fail
        try {
            $history->delete();
            $this->fail('History delete should fail');
        } catch (\LogicException $e) {
            $this->assertStringContainsString('immutable and cannot be deleted', $e->getMessage());
        }
    }

    /**
     * 13. Test model relationships with explicit foreign keys.
     */
    public function test_model_relationships_with_explicit_foreign_keys(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student->id,
            'status' => OfferStatus::PENDING->value,
            'ctc' => 16.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Adobe',
            'verified_by' => $this->tpoUser->id,
            'review_claimed_by' => $this->otherTpoUser->id,
            'review_claimed_until' => now()->addMinutes(15),
        ]);

        $doc = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'docs/adobe_v1.pdf',
            'storage_key' => 'adobe_v1.pdf',
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'uploaded_by' => $this->studentUser->id,
            'verified_by' => $this->tpoUser->id,
        ]);

        $history = OfferVerificationHistory::create([
            'offer_id' => $offer->id,
            'actor_user_id' => $this->otherTpoUser->id,
            'verified_by_user_id' => $this->tpoUser->id,
            'reviewed_document_id' => $doc->id,
            'reviewed_document_type' => 'OFFER_LETTER',
            'reviewed_document_version' => 1,
            'action' => 'VERIFIED',
            'previous_status' => 'UNDER_REVIEW',
            'new_status' => 'VERIFIED',
            'notes' => 'Offer letter verified by committee.',
            'metadata' => ['channel' => 'PORTAL'],
        ]);

        // Explicit foreign key relationship verifications
        $this->assertEquals($this->tpoUser->id, $offer->verifiedBy->id);
        $this->assertEquals($this->otherTpoUser->id, $offer->reviewClaimedBy->id);
        $this->assertEquals($this->studentUser->id, $doc->uploadedBy->id);
        $this->assertEquals($this->tpoUser->id, $doc->verifiedBy->id);
        $this->assertEquals($offer->id, $doc->offer->id);
        $this->assertEquals($this->otherTpoUser->id, $history->actor->id);
        $this->assertEquals($this->tpoUser->id, $history->verifiedBy->id);
        $this->assertEquals($doc->id, $history->reviewedDocument->id);
        $this->assertEquals('OFFER_LETTER', $history->reviewed_document_type);
        $this->assertEquals(1, $history->reviewed_document_version);
    }

    /**
     * 14. Test PostgreSQL foreign key ON DELETE RESTRICT enforcement on offer_verification_histories.
     */
    public function test_postgresql_on_delete_restrict_on_offer_verification_history(): void
    {
        $conn = DB::connection('pgsql_test');

        // Clean tables in pgsql_test
        $conn->statement('TRUNCATE offer_verification_histories, offer_documents, offers, students, users CASCADE');

        // Create users
        $userId = $conn->table('users')->insertGetId([
            'email' => 'pg_test_m8@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $tpoId = $conn->table('users')->insertGetId([
            'email' => 'pg_tpo_m8@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = $conn->table('students')->insertGetId([
            'user_id' => $userId,
            'student_identifier' => 'STU-PG-M8-001',
            'first_name' => 'Rohan',
            'last_name' => 'Verma',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.5,
            'backlogs_current' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $offerId = $conn->table('offers')->insertGetId([
            'student_id' => $studentId,
            'recruiter_id' => null,
            'job_id' => null,
            'status' => 'PENDING',
            'ctc' => 15.0,
            'offer_date' => now(),
            'is_off_campus' => true,
            'company_name' => 'Goldman Sachs',
            'verification_status' => 'PENDING_VERIFICATION',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $docId = $conn->table('offer_documents')->insertGetId([
            'offer_id' => $offerId,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'pg_test/doc.pdf',
            'storage_disk' => 'private',
            'storage_key' => 'pg_test/doc.pdf',
            'document_status' => 'ACCEPTED_AS_VALID',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $conn->table('offer_verification_histories')->insert([
            'offer_id' => $offerId,
            'actor_user_id' => $tpoId,
            'actor_name' => 'Placement Officer',
            'actor_email' => 'pg_tpo_m8@campuslink.edu',
            'reviewed_document_id' => $docId,
            'reviewed_document_type' => 'OFFER_LETTER',
            'reviewed_document_version' => 1,
            'action' => 'VERIFIED',
            'previous_status' => 'UNDER_REVIEW',
            'new_status' => 'VERIFIED',
            'created_at' => now(),
        ]);

        // 1. Attempting to delete the offer MUST fail with ON DELETE RESTRICT
        $restrictOfferTriggered = false;
        try {
            $conn->table('offers')->where('id', $offerId)->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            $restrictOfferTriggered = true;
            $this->assertTrue(
                str_contains($e->getMessage(), 'violates RESTRICT') || str_contains($e->getMessage(), 'foreign key constraint'),
                'Expected RESTRICT violation on offers: ' . $e->getMessage()
            );
        }
        $this->assertTrue($restrictOfferTriggered, 'PostgreSQL must reject deleting offer when verification history exists (ON DELETE RESTRICT).');

        // 2. Attempting to delete the actor MUST fail with ON DELETE RESTRICT
        $restrictActorTriggered = false;
        try {
            $conn->table('users')->where('id', $tpoId)->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            $restrictActorTriggered = true;
            $this->assertTrue(
                str_contains($e->getMessage(), 'violates RESTRICT') || str_contains($e->getMessage(), 'foreign key constraint'),
                'Expected RESTRICT violation on actor: ' . $e->getMessage()
            );
        }
        $this->assertTrue($restrictActorTriggered, 'PostgreSQL must reject deleting actor when verification history exists (ON DELETE RESTRICT).');

        // 3. Attempting to delete the reviewed document MUST fail with ON DELETE RESTRICT
        $restrictDocTriggered = false;
        try {
            $conn->table('offer_documents')->where('id', $docId)->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            $restrictDocTriggered = true;
            $this->assertTrue(
                str_contains($e->getMessage(), 'violates RESTRICT') || str_contains($e->getMessage(), 'foreign key constraint'),
                'Expected RESTRICT violation on document: ' . $e->getMessage()
            );
        }
        $this->assertTrue($restrictDocTriggered, 'PostgreSQL must reject deleting reviewed document when verification history exists (ON DELETE RESTRICT).');
    }
}
