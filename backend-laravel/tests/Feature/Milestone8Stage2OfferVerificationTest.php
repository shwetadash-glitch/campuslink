<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Job;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\Offer;
use App\Models\OfferDocument;
use App\Models\OfferVerificationHistory;
use App\Enums\UserRole;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\OfferDocumentStatus;
use App\Enums\DriveStatus;
use App\Enums\CandidateDriveStatus;
use App\Exceptions\OfferVerificationException;
use App\Exceptions\ReviewClaimConflictException;
use App\Exceptions\ReviewClaimExpiredException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;

class Milestone8Stage2OfferVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $tpoUser;
    protected User $secondTpoUser;
    protected User $studentUser1;
    protected Student $student1;
    protected User $studentUser2;
    protected Student $student2;
    protected Company $companyA;
    protected User $recruiterUserA;
    protected Recruiter $recruiterA;
    protected Company $companyB;
    protected User $recruiterUserB;
    protected Recruiter $recruiterB;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');

        // 1. Placement Officers
        $this->tpoUser = User::create([
            'email' => 'tpo.lead@campuslink.edu',
            'password_hash' => bcrypt('AdminPass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        $this->secondTpoUser = User::create([
            'email' => 'tpo.associate@campuslink.edu',
            'password_hash' => bcrypt('AdminPass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        // 2. Students
        $this->studentUser1 = User::create([
            'email' => 'kavya.iyer@campuslink.edu',
            'password_hash' => bcrypt('StudentPass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student1 = Student::create([
            'user_id' => $this->studentUser1->id,
            'student_identifier' => 'STU-2026-CS-001',
            'first_name' => 'Kavya',
            'last_name' => 'Iyer',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 9.40,
            'backlogs_current' => 0,
        ]);

        $this->studentUser2 = User::create([
            'email' => 'rohit.sharma@campuslink.edu',
            'password_hash' => bcrypt('StudentPass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        $this->student2 = Student::create([
            'user_id' => $this->studentUser2->id,
            'student_identifier' => 'STU-2026-CS-002',
            'first_name' => 'Rohit',
            'last_name' => 'Sharma',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.10,
            'backlogs_current' => 0,
        ]);

        // 3. Recruiters & Companies
        $this->companyA = Company::create([
            'name' => 'Stripe India',
            'industry' => 'Fintech',
            'website' => 'https://stripe.com',
        ]);

        $this->recruiterUserA = User::create([
            'email' => 'recruiter@stripe.com',
            'password_hash' => bcrypt('RecruiterPass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);

        $this->recruiterA = Recruiter::create([
            'user_id' => $this->recruiterUserA->id,
            'company_id' => $this->companyA->id,
            'contact_name' => 'Stripe HR',
            'contact_email' => 'recruiter@stripe.com',
        ]);

        $this->companyB = Company::create([
            'name' => 'Amazon India',
            'industry' => 'Cloud & E-Commerce',
            'website' => 'https://amazon.com',
        ]);

        $this->recruiterUserB = User::create([
            'email' => 'recruiter@amazon.com',
            'password_hash' => bcrypt('RecruiterPass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);

        $this->recruiterB = Recruiter::create([
            'user_id' => $this->recruiterUserB->id,
            'company_id' => $this->companyB->id,
            'contact_name' => 'Amazon HR',
            'contact_email' => 'recruiter@amazon.com',
        ]);
    }

    protected function createValidPdf(string $filename = 'offer_letter.pdf', int $sizeKb = 20): UploadedFile
    {
        $content = "%PDF-1.4\n% CampusLink Test Offer Letter PDF Content\n" . str_repeat("A", $sizeKb * 1024) . "\n%%EOF";
        return UploadedFile::fake()->createWithContent($filename, $content);
    }

    /**
     * Test 1: Officer can list offers with verification status and filters.
     */
    public function test_officer_can_list_offers_with_verification_status_and_filters(): void
    {
        Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Google India',
            'designation' => 'Software Engineer',
            'ctc' => 32.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'is_off_campus' => true,
            'offer_date' => now(),
        ]);

        Offer::create([
            'student_id' => $this->student2->id,
            'company_name' => 'Microsoft',
            'designation' => 'Support Engineer',
            'ctc' => 18.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'is_off_campus' => false,
            'offer_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        // List all
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/officer/offers');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page']);
        $this->assertCount(2, $response->json('data'));

        // Filter by verification_status
        $filtered = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/officer/offers?verification_status=PENDING_VERIFICATION');

        $filtered->assertStatus(200);
        $this->assertCount(1, $filtered->json('data'));
        $this->assertEquals('Google India', $filtered->json('data.0.company_name'));
    }

    /**
     * Test 2: Officer can view offer details with documents and audit history.
     */
    public function test_officer_can_view_offer_details_with_documents_and_history(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Oracle India',
            'designation' => 'Member of Technical Staff',
            'ctc' => 20.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'is_off_campus' => true,
            'offer_date' => now(),
        ]);

        OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'documents/oracle.pdf',
            'storage_key' => 'documents/oracle.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        OfferVerificationHistory::create([
            'offer_id' => $offer->id,
            'actor_user_id' => $this->tpoUser->id,
            'actor_name' => 'TPO Lead',
            'actor_email' => $this->tpoUser->email,
            'action' => 'MANUAL_ENTRY',
            'previous_status' => null,
            'new_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'notes' => 'Registered by officer.',
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/officer/offers/{$offer->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('offer.id', $offer->id)
            ->assertJsonPath('offer.company_name', 'Oracle India');

        $this->assertCount(1, $response->json('offer.documents'));
        $this->assertCount(1, $response->json('offer.verification_histories'));
    }

    /**
     * Test 3: Officer can manually register off-campus offer, strictly in PENDING_VERIFICATION.
     */
    public function test_officer_can_manually_register_off_campus_offer_in_pending_verification(): void
    {
        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        $payload = [
            'student_id' => $this->student1->id,
            'company_name' => 'Uber India',
            'designation' => 'Software Engineer II',
            'ctc' => 38.5,
            'offer_date' => now()->toDateString(),
            'notes' => 'Direct off-campus registration via TPO office.',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/officer/offers/manual', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::PENDING_VERIFICATION->value)
            ->assertJsonPath('offer.is_off_campus', true);

        $this->assertDatabaseHas('offers', [
            'student_id' => $this->student1->id,
            'company_name' => 'Uber India',
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
        ]);

        $this->assertDatabaseHas('offer_verification_histories', [
            'actor_user_id' => $this->tpoUser->id,
            'action' => 'TPO_MANUALLY_REGISTERED',
            'new_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
        ]);
    }

    /**
     * Test 4: Officer can claim review lease for 15 minutes.
     */
    public function test_officer_can_claim_review_lease_for_15_minutes(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Stripe',
            'designation' => 'SWE',
            'ctc' => 24.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::UNDER_REVIEW->value);

        $this->assertNotNull($response->json('review_claim_token'));
        $this->assertEquals($this->tpoUser->id, $response->json('offer.review_claimed_by'));

        $offer->refresh();
        $this->assertTrue($offer->isReviewClaimActive());
    }

    /**
     * Test 5: Competing officer cannot claim an active review lease (HTTP 409).
     */
    public function test_competing_officer_cannot_claim_active_review_lease_returns_409(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Atlassian',
            'designation' => 'SWE',
            'ctc' => 28.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => (string) Str::uuid(),
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $secondTpoToken = $this->secondTpoUser->createToken('tpo2')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $secondTpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review");

        $response->assertStatus(409)
            ->assertJsonPath('code', 'REVIEW_CLAIM_CONFLICT');
    }

    /**
     * Test 6: Officer can voluntarily release review lease, returning status to PENDING_VERIFICATION.
     */
    public function test_officer_can_voluntarily_release_review_lease(): void
    {
        $claimToken = (string) Str::uuid();
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Salesforce',
            'designation' => 'MTS',
            'ctc' => 22.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $claimToken,
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $token = $this->tpoUser->createToken('tpo')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/officer/offers/{$offer->id}/release-claim", [
                'review_claim_token' => $claimToken,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::PENDING_VERIFICATION->value);

        $offer->refresh();
        $this->assertNull($offer->review_claim_token);
        $this->assertNull($offer->review_claimed_by);
    }

    /**
     * Test 7: Expired review lease can be reassigned to a different officer.
     */
    public function test_expired_review_lease_can_be_reassigned_to_different_officer(): void
    {
        $expiredToken = (string) Str::uuid();
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Twilio',
            'designation' => 'SWE',
            'ctc' => 20.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $expiredToken,
            'review_claimed_at' => now()->subMinutes(20),
            'review_claimed_until' => now()->subMinutes(5), // Expired 5 min ago
            'review_claimed_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $secondTpoToken = $this->secondTpoUser->createToken('tpo2')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $secondTpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review");

        $response->assertStatus(200)
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::UNDER_REVIEW->value);

        $offer->refresh();
        $this->assertEquals($this->secondTpoUser->id, $offer->review_claimed_by);
        $this->assertNotEquals($expiredToken, $offer->review_claim_token);
        $this->assertTrue($offer->isReviewClaimActive());
    }

    /**
     * Test 8: Officer with stale review token cannot verify offer (HTTP 409).
     */
    public function test_officer_with_stale_token_cannot_verify_offer_returns_409(): void
    {
        $staleToken = (string) Str::uuid();
        $newToken = (string) Str::uuid();

        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Intuit',
            'designation' => 'SWE',
            'ctc' => 25.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $newToken,
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->secondTpoUser->id,
            'offer_date' => now(),
        ]);

        $doc = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/intuit.pdf',
            'storage_key' => 'test/intuit.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        // Officer 1 attempts to verify with stale token
        $response = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/verify", [
                'review_claim_token' => $staleToken,
                'reviewed_document_id' => $doc->id,
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('code', 'REVIEW_CLAIM_EXPIRED');
    }

    /**
     * Test 9: Officer can verify offer with valid document binding and audit trail.
     */
    public function test_officer_can_verify_offer_with_valid_document_binding(): void
    {
        $activeToken = (string) Str::uuid();
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Cisco Systems',
            'designation' => 'Software Engineer',
            'ctc' => 17.5,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $activeToken,
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $doc = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/cisco.pdf',
            'storage_key' => 'test/cisco.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/verify", [
                'review_claim_token' => $activeToken,
                'reviewed_document_id' => $doc->id,
                'notes' => 'Verified against official letterhead and digital signature.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::VERIFIED->value)
            ->assertJsonPath('offer.verified_by', $this->tpoUser->id);

        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::VERIFIED, $offer->verification_status);
        $this->assertNull($offer->review_claim_token);

        $doc->refresh();
        $this->assertEquals(OfferDocumentStatus::ACCEPTED_AS_VALID, $doc->document_status);

        $this->assertDatabaseHas('offer_verification_histories', [
            'offer_id' => $offer->id,
            'actor_user_id' => $this->tpoUser->id,
            'verified_by_user_id' => $this->tpoUser->id,
            'reviewed_document_id' => $doc->id,
            'action' => 'VERIFIED',
            'new_status' => OfferVerificationStatus::VERIFIED->value,
        ]);
    }

    /**
     * Test 10: Officer can reject offer with mandatory rejection reason.
     */
    public function test_officer_can_reject_offer_with_mandatory_reason(): void
    {
        $activeToken = (string) Str::uuid();
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Suspicious Tech',
            'designation' => 'Developer',
            'ctc' => 45.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $activeToken,
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/reject", [
                'review_claim_token' => $activeToken,
                'reason' => 'Domain registration and HR verification failed.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::REJECTED->value)
            ->assertJsonPath('offer.rejection_reason', 'Domain registration and HR verification failed.');

        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::REJECTED, $offer->verification_status);
        $this->assertEquals('Domain registration and HR verification failed.', $offer->rejection_reason);
    }

    /**
     * Test 11: Officer can request additional information from student.
     */
    public function test_officer_can_request_additional_information(): void
    {
        $activeToken = (string) Str::uuid();
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Incomplete Submission Corp',
            'designation' => 'Intern',
            'ctc' => 12.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'review_claim_token' => $activeToken,
            'review_claimed_at' => now(),
            'review_claimed_until' => now()->addMinutes(15),
            'review_claimed_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/request-info", [
                'review_claim_token' => $activeToken,
                'notes' => 'Please provide the Annexure specifying base pay vs bonuses.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value);

        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::NEEDS_ADDITIONAL_INFO, $offer->verification_status);
        $this->assertNull($offer->review_claim_token);
    }

    /**
     * Test 12: Student can submit off-campus offer, always in PENDING_VERIFICATION.
     */
    public function test_student_can_submit_off_campus_offer_always_in_pending_verification(): void
    {
        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        $payload = [
            'company_name' => 'Razorpay',
            'designation' => 'Product Engineer',
            'ctc' => 26.0,
            'offer_date' => now()->toDateString(),
            'location' => 'Bangalore',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson('/api/v1/students/me/offers/off-campus', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::PENDING_VERIFICATION->value)
            ->assertJsonPath('offer.is_off_campus', true);

        $this->assertDatabaseHas('offers', [
            'student_id' => $this->student1->id,
            'company_name' => 'Razorpay',
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'is_off_campus' => true,
        ]);
    }

    /**
     * Test 13: Student can upload document and receive monotonic version.
     */
    public function test_student_can_upload_document_creates_monotonic_version(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'PhonePe',
            'designation' => 'Software Engineer',
            'ctc' => 25.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'is_off_campus' => true,
            'offer_date' => now(),
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        // Upload version 1
        $file1 = $this->createValidPdf('phonepe_v1.pdf', 10);
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $file1,
                'document_type' => 'OFFER_LETTER',
            ]);

        $res1->assertStatus(201)
            ->assertJsonPath('document.version_number', 1)
            ->assertJsonPath('document.document_status', OfferDocumentStatus::PENDING_REVIEW->value);

        // Upload version 2 of same type
        $file2 = $this->createValidPdf('phonepe_v2.pdf', 15);
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $file2,
                'document_type' => 'OFFER_LETTER',
            ]);

        $res2->assertStatus(201)
            ->assertJsonPath('document.version_number', 2);

        // Verify version 1 was superseded
        $doc1 = OfferDocument::where('offer_id', $offer->id)->where('version_number', 1)->first();
        $this->assertEquals(OfferDocumentStatus::SUPERSEDED, $doc1->document_status);
    }

    /**
     * Test 14: Document upload exceeding 10 MB is rejected with 422 FILE_TOO_LARGE.
     */
    public function test_student_cannot_upload_document_exceeding_10mb(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'BigFile Corp',
            'designation' => 'SWE',
            'ctc' => 20.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        // 11 MB PDF
        $largeFile = $this->createValidPdf('huge.pdf', 11 * 1024);

        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $largeFile,
                'document_type' => 'OFFER_LETTER',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'FILE_TOO_LARGE');
    }

    /**
     * Test 15: Disallowed file MIME type is rejected with 422 INVALID_FILE_TYPE.
     */
    public function test_student_cannot_upload_disallowed_file_mime_type(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Script Corp',
            'designation' => 'SWE',
            'ctc' => 20.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        // Executable / shell script content
        $badFile = UploadedFile::fake()->createWithContent('malicious.sh', "#!/bin/bash\nrm -rf /");

        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $badFile,
                'document_type' => 'OFFER_LETTER',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'INVALID_FILE_TYPE');
    }

    /**
     * Test 16: New document upload resets NEEDS_ADDITIONAL_INFO to PENDING_VERIFICATION.
     */
    public function test_new_document_upload_resets_needs_additional_info_to_pending_verification(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Flipkart',
            'designation' => 'SDE-1',
            'ctc' => 28.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value,
            'offer_date' => now(),
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;
        $file = $this->createValidPdf('salary_breakup.pdf', 10);

        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $file,
                'document_type' => 'SALARY_BREAKUP',
            ]);

        $response->assertStatus(201);

        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::PENDING_VERIFICATION, $offer->verification_status);
    }

    /**
     * Test 17: Recruiter can issue drive offer, strictly in PENDING_VERIFICATION.
     */
    public function test_recruiter_can_issue_drive_offer_always_in_pending_verification(): void
    {
        $job = Job::create([
            'company_id' => $this->companyA->id,
            'title' => 'Software Development Engineer',
            'description' => 'Drive job',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
        ]);

        $drive = PlacementDrive::create([
            'name' => 'Stripe Campus Drive 2026',
            'company_id' => $this->companyA->id,
            'job_id' => $job->id,
            'start_date' => now()->addDays(1),
            'end_date' => now()->addDays(3),
            'registration_deadline' => now()->addHours(12),
            'status' => DriveStatus::PUBLISHED->value,
            'drive_type' => 'ON_CAMPUS',
        ]);

        $candidate = DriveCandidate::create([
            'drive_id' => $drive->id,
            'student_id' => $this->student1->id,
            'status' => CandidateDriveStatus::SHORTLISTED->value,
            'current_round_number' => 2,
            'registered_at' => now()->subDay(),
        ]);

        $recruiterToken = $this->recruiterUserA->createToken('recruiter')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $recruiterToken)
            ->postJson("/api/v1/recruiters/drives/{$drive->id}/candidates/{$candidate->id}/offer", [
                'ctc' => 30.0,
                'offer_date' => now()->toDateString(),
                'designation' => 'Software Engineer',
                'location' => 'Bangalore',
                'joining_date' => now()->addMonths(6)->toDateString(),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('offer.verification_status', OfferVerificationStatus::PENDING_VERIFICATION->value)
            ->assertJsonPath('offer.is_off_campus', false);

        $this->assertDatabaseHas('offers', [
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiterA->id,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
        ]);
    }

    /**
     * Test 18: Unverified offer cannot be confirmed as joined (HTTP 422 OFFER_NOT_VERIFIED).
     */
    public function test_unverified_offer_cannot_be_confirmed_as_joined_returns_422(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Unverified Offer Ltd',
            'designation' => 'SWE',
            'ctc' => 20.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        // Attempt joining via StudentPlacementJourneyController endpoint
        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/confirm-joining", [
                'notes' => 'I have reported for onboarding.',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'OFFER_NOT_VERIFIED');

        // Verify direct model guard throws OfferVerificationException
        $modelGuardThrown = false;
        try {
            $offer->confirmJoining();
        } catch (OfferVerificationException $e) {
            $modelGuardThrown = true;
            $this->assertEquals('OFFER_NOT_VERIFIED', $e->getErrorCode());
        }
        $this->assertTrue($modelGuardThrown, "Direct model confirmJoining must fail if not VERIFIED.");

        // Now verify the offer and confirm joining succeeds
        $offer->update(['verification_status' => OfferVerificationStatus::VERIFIED->value]);
        $offer->confirmJoining($this->studentUser1, null, 'Reporting complete.');
        $this->assertEquals(OfferStatus::JOINED, $offer->fresh()->status);
    }

    /**
     * Test 19: Cross-student document access is forbidden (HTTP 404).
     */
    public function test_cross_student_access_to_documents_is_forbidden_returns_404(): void
    {
        $offerStudent1 = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Private Student 1 Co',
            'designation' => 'SWE',
            'ctc' => 22.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        Storage::disk('private')->put("offer_documents/{$offerStudent1->id}/secret.pdf", "%PDF-1.4\nSecret Content");

        $doc = OfferDocument::create([
            'offer_id' => $offerStudent1->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => "offer_documents/{$offerStudent1->id}/secret.pdf",
            'storage_key' => "offer_documents/{$offerStudent1->id}/secret.pdf",
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        // Student 2 attempts to download Student 1's document
        $student2Token = $this->studentUser2->createToken('student2')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $student2Token)
            ->getJson("/api/v1/students/me/offers/{$offerStudent1->id}/documents/{$doc->id}/download");

        // Returns 404 to avoid leaking existence of another student's offer
        $response->assertStatus(404);
    }

    /**
     * Test 20: Cross-company recruiter document access is forbidden (HTTP 404).
     */
    public function test_cross_company_recruiter_access_to_documents_is_forbidden_returns_404(): void
    {
        $offerCompanyA = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiterA->id,
            'company_name' => 'Stripe India',
            'designation' => 'SWE',
            'ctc' => 30.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        Storage::disk('private')->put("offer_documents/{$offerCompanyA->id}/stripe.pdf", "%PDF-1.4\nStripe Secret");

        $doc = OfferDocument::create([
            'offer_id' => $offerCompanyA->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => "offer_documents/{$offerCompanyA->id}/stripe.pdf",
            'storage_key' => "offer_documents/{$offerCompanyA->id}/stripe.pdf",
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        // Recruiter B from Amazon attempts to download Stripe's offer document
        $recruiterBToken = $this->recruiterUserB->createToken('recruiterB')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $recruiterBToken)
            ->getJson("/api/v1/recruiters/offers/{$offerCompanyA->id}/documents/{$doc->id}/download");

        $response->assertStatus(404);
    }

    /**
     * Test 21: Replacing a document after an offer has already been VERIFIED invalidates approval and resets status.
     */
    public function test_replacing_document_on_verified_offer_invalidates_approval_and_resets_to_pending(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Intuit India',
            'designation' => 'Software Engineer',
            'ctc' => 28.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'verified_at' => now()->subDay(),
            'verified_by' => $this->tpoUser->id,
            'offer_date' => now()->subDays(5),
        ]);

        $docV1 = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/intuit_v1.pdf',
            'storage_key' => 'test/intuit_v1.pdf',
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'verified_at' => now()->subDay(),
            'verified_by' => $this->tpoUser->id,
        ]);

        OfferVerificationHistory::create([
            'offer_id' => $offer->id,
            'actor_id' => $this->tpoUser->id,
            'actor_user_id' => $this->tpoUser->id,
            'actor_name' => 'TPO Lead',
            'actor_email' => $this->tpoUser->email,
            'action' => 'VERIFIED',
            'previous_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'new_status' => OfferVerificationStatus::VERIFIED->value,
            'reviewed_document_id' => $docV1->id,
            'reviewed_document_type' => 'OFFER_LETTER',
            'reviewed_document_version' => 1,
        ]);

        // Student uploads version 2 of the same document type
        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;
        $fileV2 = $this->createValidPdf('intuit_revised_v2.pdf', 15);

        $response = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $fileV2,
                'document_type' => 'OFFER_LETTER',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('document.version_number', 2)
            ->assertJsonPath('document.document_status', OfferDocumentStatus::PENDING_REVIEW->value);

        // 1. Old document remains preserved with status SUPERSEDED
        $docV1->refresh();
        $this->assertEquals(OfferDocumentStatus::SUPERSEDED, $docV1->document_status);

        // 2. Offer returns to PENDING_VERIFICATION
        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::PENDING_VERIFICATION, $offer->verification_status);

        // 3. Previous verification approval fields are cleared
        $this->assertNull($offer->verified_at);
        $this->assertNull($offer->verified_by);
        $this->assertNull($offer->review_claim_token);

        // 4. Verification history reflects invalidation
        $this->assertDatabaseHas('offer_verification_histories', [
            'offer_id' => $offer->id,
            'action' => 'DOCUMENT_UPLOADED',
            'previous_status' => OfferVerificationStatus::VERIFIED->value,
            'new_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
        ]);
    }

    /**
     * Test 22: Joining is blocked after verified document replacement until re-verification.
     */
    public function test_joining_blocked_after_verified_document_replacement_until_re_verification(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Salesforce India',
            'designation' => 'Associate MTS',
            'ctc' => 25.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'verified_at' => now()->subDay(),
            'verified_by' => $this->tpoUser->id,
            'offer_date' => now()->subDays(5),
        ]);

        $docV1 = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/salesforce_v1.pdf',
            'storage_key' => 'test/salesforce_v1.pdf',
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'verified_at' => now()->subDay(),
            'verified_by' => $this->tpoUser->id,
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        // Student uploads revised version 2
        $fileV2 = $this->createValidPdf('salesforce_v2.pdf', 12);
        $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $fileV2,
                'document_type' => 'OFFER_LETTER',
            ])->assertStatus(201);

        // Attempting to confirm joining must now fail with 422 OFFER_NOT_VERIFIED
        $joiningRes = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/confirm-joining", [
                'notes' => 'Attempting to join with pending revised offer.',
            ]);

        $joiningRes->assertStatus(422)
            ->assertJsonPath('code', 'OFFER_NOT_VERIFIED');

        // Officer re-reviews and formally verifies the offer with version 2
        $docV2 = OfferDocument::where('offer_id', $offer->id)->where('version_number', 2)->firstOrFail();
        $this->flushHeaders();
        auth()->forgetGuards();
        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        $claimRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review");
        $claimRes->assertStatus(200);

        $claimToken = $claimRes->json('review_claim_token');

        $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/verify", [
                'review_claim_token' => $claimToken,
                'reviewed_document_id' => $docV2->id,
                'notes' => 'Re-verified with revised version 2.',
            ])->assertStatus(200);

        // Now joining succeeds
        $this->flushHeaders();
        auth()->forgetGuards();
        $joiningRes2 = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/confirm-joining", [
                'notes' => 'Joining successfully confirmed following re-verification.',
            ]);

        $joiningRes2->assertStatus(200)
            ->assertJsonPath('offer.status', OfferStatus::JOINED->value);
    }

    /**
     * Test 23: Formal verification marks exact reviewed document ACCEPTED_AS_VALID and matches audit history.
     */
    public function test_formal_verification_accepts_exact_reviewed_document_version(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Atlassian India',
            'designation' => 'Software Engineer',
            'ctc' => 30.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $doc1 = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/atlassian_v1.pdf',
            'storage_key' => 'test/atlassian_v1.pdf',
            'document_status' => OfferDocumentStatus::SUPERSEDED->value,
        ]);

        $doc2 = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 2,
            'file_url' => 'test/atlassian_v2.pdf',
            'storage_key' => 'test/atlassian_v2.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        $claimRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review");
        $claimRes->assertStatus(200);

        $claimToken = $claimRes->json('review_claim_token');

        $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/verify", [
                'review_claim_token' => $claimToken,
                'reviewed_document_id' => $doc2->id,
                'notes' => 'Verified against version 2 of offer letter.',
            ])->assertStatus(200);

        $doc2->refresh();
        $this->assertEquals(OfferDocumentStatus::ACCEPTED_AS_VALID, $doc2->document_status);
        $this->assertEquals($this->tpoUser->id, $doc2->verified_by);

        // Audit history explicitly records reviewed document ID, type, and version
        $this->assertDatabaseHas('offer_verification_histories', [
            'offer_id' => $offer->id,
            'actor_user_id' => $this->tpoUser->id,
            'verified_by_user_id' => $this->tpoUser->id,
            'reviewed_document_id' => $doc2->id,
            'reviewed_document_type' => 'OFFER_LETTER',
            'reviewed_document_version' => 2,
            'action' => 'VERIFIED',
        ]);
    }

    /**
     * Test 24: Formal rejection marks reviewed document REJECTED_DEFECTIVE and rejects cross-offer document.
     */
    public function test_formal_rejection_marks_reviewed_document_defective_and_rejects_cross_offer_document(): void
    {
        $offer1 = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Target Co',
            'designation' => 'Developer',
            'ctc' => 15.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $offer2 = Offer::create([
            'student_id' => $this->student2->id,
            'company_name' => 'Other Co',
            'designation' => 'Developer',
            'ctc' => 16.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $doc1 = OfferDocument::create([
            'offer_id' => $offer1->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/target.pdf',
            'storage_key' => 'test/target.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        $docCross = OfferDocument::create([
            'offer_id' => $offer2->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/other.pdf',
            'storage_key' => 'test/other.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        $claimRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer1->id}/claim-review")
            ->assertStatus(200);

        $claimToken = $claimRes->json('review_claim_token');

        // Cross-offer document ID rejection must return 404
        $crossRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer1->id}/reject", [
                'review_claim_token' => $claimToken,
                'reason' => 'Discrepancy detected in compensation annexure.',
                'reviewed_document_id' => $docCross->id,
            ]);
        $crossRes->assertStatus(404);

        // Valid document rejection marks document REJECTED_DEFECTIVE
        $rejectRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer1->id}/reject", [
                'review_claim_token' => $claimToken,
                'reason' => 'Digital seal verification failed.',
                'reviewed_document_id' => $doc1->id,
            ]);
        $rejectRes->assertStatus(200);

        $doc1->refresh();
        $this->assertEquals(OfferDocumentStatus::REJECTED_DEFECTIVE, $doc1->document_status);
        $this->assertEquals('Digital seal verification failed.', $doc1->rejection_reason);
    }

    /**
     * Test 25: Actor snapshots are populated across all lifecycle events using authenticated user record.
     */
    public function test_actor_snapshots_consistently_populated_across_lifecycle_events(): void
    {
        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        // 1. Manual register
        $regRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson('/api/v1/officer/offers/manual', [
                'student_id' => $this->student1->id,
                'company_name' => 'Snap Inc',
                'designation' => 'Software Engineer',
                'ctc' => 35.0,
                'offer_date' => now()->toDateString(),
            ])->assertStatus(201);

        $offerId = $regRes->json('offer.id');

        // 2. Claim review
        $claimRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offerId}/claim-review")
            ->assertStatus(200);
        $claimToken = $claimRes->json('review_claim_token');

        // 3. Request info
        $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offerId}/request-info", [
                'review_claim_token' => $claimToken,
                'notes' => 'Please provide joining bonus annexure.',
            ])->assertStatus(200);

        // Verify all created histories contain actor_id, actor_user_id, actor_name, actor_email
        $histories = OfferVerificationHistory::where('offer_id', $offerId)->get();
        $this->assertGreaterThanOrEqual(3, $histories->count());

        foreach ($histories as $history) {
            $this->assertNotNull($history->actor_id, "History action [{$history->action}] missing actor_id.");
            $this->assertNotNull($history->actor_user_id, "History action [{$history->action}] missing actor_user_id.");
            $this->assertNotNull($history->actor_name, "History action [{$history->action}] missing actor_name.");
            $this->assertEquals($this->tpoUser->email, $history->actor_email);
        }
    }

    /**
     * Test 26: Claim renewal extends expiration and records CLAIM_RENEWED history.
     */
    public function test_claim_renewal_records_audit_history(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Renewal Corp',
            'designation' => 'SWE',
            'ctc' => 20.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'offer_date' => now(),
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        // 1. Initial claim
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review")
            ->assertStatus(200);
        $initialToken = $res1->json('review_claim_token');

        // 2. Same officer renews claim
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review")
            ->assertStatus(200);

        $this->assertEquals($initialToken, $res2->json('review_claim_token'));

        $this->assertDatabaseHas('offer_verification_histories', [
            'offer_id' => $offer->id,
            'action' => 'CLAIM_RENEWED',
            'actor_user_id' => $this->tpoUser->id,
            'previous_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            'new_status' => OfferVerificationStatus::UNDER_REVIEW->value,
        ]);
    }

    /**
     * Test 27: Releasing a claim on an offer originally in NEEDS_ADDITIONAL_INFO restores NEEDS_ADDITIONAL_INFO.
     */
    public function test_claim_release_restores_needs_additional_info_prior_state(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Restoration Corp',
            'designation' => 'SWE',
            'ctc' => 19.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value,
            'offer_date' => now(),
        ]);

        $tpoToken = $this->tpoUser->createToken('tpo')->plainTextToken;

        // Officer claims offer from NEEDS_ADDITIONAL_INFO
        $claimRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/claim-review");
        $claimRes->assertStatus(200);
        $claimToken = $claimRes->json('review_claim_token');

        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::UNDER_REVIEW, $offer->verification_status);

        // Officer voluntarily releases claim
        $releaseRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/release-claim", [
                'review_claim_token' => $claimToken,
            ])->assertStatus(200);

        // Assert restored status is NEEDS_ADDITIONAL_INFO (not silently reset to PENDING_VERIFICATION)
        $this->assertEquals(OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value, $releaseRes->json('offer.verification_status'));

        $offer->refresh();
        $this->assertEquals(OfferVerificationStatus::NEEDS_ADDITIONAL_INFO, $offer->verification_status);
        $this->assertNull($offer->review_claim_token);
        $this->assertNull($offer->review_claimed_by);

        // Stale or invalid token cannot release
        $staleRes = $this->withHeader('Authorization', 'Bearer ' . $tpoToken)
            ->postJson("/api/v1/officer/offers/{$offer->id}/release-claim", [
                'review_claim_token' => (string) Str::uuid(),
            ]);
        $this->assertEquals(OfferVerificationStatus::NEEDS_ADDITIONAL_INFO, $offer->fresh()->verification_status);
    }

    /**
     * Test 28: Different document types remain independent without collateral superseding.
     */
    public function test_different_document_types_remain_independent_without_collateral_superseding(): void
    {
        $offer = Offer::create([
            'student_id' => $this->student1->id,
            'company_name' => 'Independent Docs Corp',
            'designation' => 'SWE',
            'ctc' => 22.0,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'verified_at' => now(),
            'verified_by' => $this->tpoUser->id,
            'offer_date' => now(),
        ]);

        $offerLetter = OfferDocument::create([
            'offer_id' => $offer->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => 'test/offer_letter.pdf',
            'storage_key' => 'test/offer_letter.pdf',
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'verified_at' => now(),
            'verified_by' => $this->tpoUser->id,
        ]);

        $studentToken = $this->studentUser1->createToken('student')->plainTextToken;

        // Student uploads a supplemental document type (SALARY_BREAKUP)
        $salaryDoc = $this->createValidPdf('salary_breakup.pdf', 10);
        $res = $this->withHeader('Authorization', 'Bearer ' . $studentToken)
            ->postJson("/api/v1/students/me/offers/{$offer->id}/documents", [
                'document' => $salaryDoc,
                'document_type' => 'SALARY_BREAKUP',
            ]);
        $res->assertStatus(201);

        // Assert OFFER_LETTER was NOT superseded
        $offerLetter->refresh();
        $this->assertEquals(OfferDocumentStatus::ACCEPTED_AS_VALID, $offerLetter->document_status);

        // Assert SALARY_BREAKUP is version 1 and PENDING_REVIEW
        $salaryBreakup = OfferDocument::where('offer_id', $offer->id)->where('document_type', 'SALARY_BREAKUP')->firstOrFail();
        $this->assertEquals(1, $salaryBreakup->version_number);
        $this->assertEquals(OfferDocumentStatus::PENDING_REVIEW, $salaryBreakup->document_status);
    }
}
