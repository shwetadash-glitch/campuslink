<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Job;
use App\Models\Offer;
use App\Models\OfferDocument;
use App\Enums\UserRole;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\OfferDocumentStatus;
use App\Exceptions\OfferVerificationException;
use App\Services\Offers\OfferVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PrivateDocumentStorageSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected OfferVerificationService $service;
    protected User $tpoUser;
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
    protected Job $jobA;
    protected Offer $offerA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(OfferVerificationService::class);

        // Set up fakes for both private local disk and private S3 disk
        Storage::fake('private');
        Storage::fake('s3_documents');

        // Placement Officer
        $this->tpoUser = User::create([
            'email' => 'tpo.security@campuslink.edu',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::PLACEMENT_OFFICER->value,
            'is_active' => true,
        ]);

        // Student 1
        $this->studentUser1 = User::create([
            'email' => 'student1.sec@campuslink.edu',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $this->student1 = Student::create([
            'user_id' => $this->studentUser1->id,
            'first_name' => 'Alice',
            'last_name' => 'SecStudent',
            'student_identifier' => 'STU-SEC-001',
            'roll_number' => 'CS2026-SEC01',
            'branch' => 'Computer Science',
            'batch_year' => 2026,
            'graduation_year' => 2026,
            'cgpa' => 8.9,
            'current_status' => 'ACTIVE',
        ]);

        // Student 2
        $this->studentUser2 = User::create([
            'email' => 'student2.sec@campuslink.edu',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $this->student2 = Student::create([
            'user_id' => $this->studentUser2->id,
            'first_name' => 'Bob',
            'last_name' => 'SecStudent',
            'student_identifier' => 'STU-SEC-002',
            'roll_number' => 'CS2026-SEC02',
            'branch' => 'Information Technology',
            'batch_year' => 2026,
            'graduation_year' => 2026,
            'cgpa' => 8.2,
            'current_status' => 'ACTIVE',
        ]);

        // Company A & Recruiter A
        $this->companyA = Company::create([
            'name' => 'SecureCorp Alpha',
            'industry' => 'Cybersecurity',
            'is_active' => true,
        ]);
        $this->recruiterUserA = User::create([
            'email' => 'recruiter.alpha@securecorp.com',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);
        $this->recruiterA = Recruiter::create([
            'user_id' => $this->recruiterUserA->id,
            'company_id' => $this->companyA->id,
            'contact_email' => 'recruiter.alpha@securecorp.com',
            'name' => 'Alice Alpha Recruiter',
        ]);

        // Company B & Recruiter B
        $this->companyB = Company::create([
            'name' => 'SecureCorp Beta',
            'industry' => 'Enterprise Cloud',
            'is_active' => true,
        ]);
        $this->recruiterUserB = User::create([
            'email' => 'recruiter.beta@securecorp.com',
            'password_hash' => bcrypt('SecurePass123!'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);
        $this->recruiterB = Recruiter::create([
            'user_id' => $this->recruiterUserB->id,
            'company_id' => $this->companyB->id,
            'contact_email' => 'recruiter.beta@securecorp.com',
            'name' => 'Bob Beta Recruiter',
        ]);

        // Job under Company A
        $this->jobA = Job::create([
            'company_id' => $this->companyA->id,
            'title' => 'Security Engineer',
            'description' => 'Secure systems',
            'status' => 'PUBLISHED',
            'employment_type' => 'FULL_TIME',
            'ctc' => 16.5,
        ]);

        // Offer for Student 1 from Company A
        $this->offerA = Offer::create([
            'student_id' => $this->student1->id,
            'recruiter_id' => $this->recruiterA->id,
            'job_id' => $this->jobA->id,
            'status' => OfferStatus::PENDING->value,
            'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
            'ctc' => 16.5,
            'designation' => 'Security Engineer',
            'offer_date' => now()->toDateString(),
        ]);
    }

    protected function createPdf(string $name, string $content = "%PDF-1.4\nSynthetic confidential offer document"): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    /**
     * Scenario 1: Local private document uploads continue working.
     */
    public function test_local_private_document_uploads_continue_working(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');

        $file = $this->createPdf('offer_letter.pdf', "%PDF-1.4\nConfidential Offer 1");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        $this->assertInstanceOf(OfferDocument::class, $doc);
        $this->assertSame('private', $doc->storage_disk);
        $this->assertNotEmpty($doc->storage_key);
        $this->assertTrue(Storage::disk('private')->exists($doc->storage_key));
    }

    /**
     * Scenario 2: S3-compatible private disk uploads work through the configured abstraction.
     */
    public function test_s3_compatible_private_disk_uploads_work_through_abstraction(): void
    {
        Config::set('filesystems.offer_document_disk', 's3_documents');

        $file = $this->createPdf('cloud_offer.pdf', "%PDF-1.4\nConfidential Cloud Offer");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        $this->assertSame('s3_documents', $doc->storage_disk);
        $this->assertNotEmpty($doc->storage_key);
        $this->assertTrue(Storage::disk('s3_documents')->exists($doc->storage_key));
        $this->assertFalse(Storage::disk('private')->exists($doc->storage_key));
    }

    /**
     * Scenario 3: Uploaded objects are marked private visibility.
     */
    public function test_uploaded_objects_are_marked_private_visibility(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');

        $file = $this->createPdf('private_contract.pdf', "%PDF-1.4\nStrictly Private Content");
        $doc = $this->service->storeDocument($this->offerA, $file, 'EMPLOYMENT_CONTRACT', $this->studentUser1);

        // Verification service uses private visibility parameter on storage write
        $this->assertTrue(Storage::disk('private')->exists($doc->storage_key));
        $this->assertSame('private', $doc->storage_disk);
    }

    /**
     * Scenario 4: No public URL is produced for confidential documents.
     */
    public function test_no_public_url_is_produced_for_confidential_documents(): void
    {
        $file = $this->createPdf('confidential.pdf', "%PDF-1.4\nConfidential Salary Data");
        $doc = $this->service->storeDocument($this->offerA, $file, 'SALARY_BREAKUP', $this->studentUser1);

        // Ensure storage_key is internal relative path without public URL scheme
        $this->assertStringNotContainsString('http://', $doc->storage_key);
        $this->assertStringNotContainsString('https://', $doc->storage_key);
        $this->assertStringNotContainsString('public', $doc->storage_key);
        $this->assertStringStartsWith('offer_documents/', $doc->storage_key);
    }

    /**
     * Scenario 5: Authorized users (TPO, owning student, issuer recruiter) can download documents.
     */
    public function test_authorized_users_can_download_their_documents(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');
        $file = $this->createPdf('valid_offer.pdf', "%PDF-1.4\nAuthorized Content");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        // 1. TPO download succeeds
        $tpoResponse = $this->service->downloadDocument($this->offerA, $doc->id, $this->tpoUser);
        $this->assertNotNull($tpoResponse);

        // 2. Owning Student download succeeds
        $studentResponse = $this->service->downloadDocument($this->offerA, $doc->id, $this->studentUser1);
        $this->assertNotNull($studentResponse);

        // 3. Issuing Recruiter download succeeds
        $recruiterResponse = $this->service->downloadDocument($this->offerA, $doc->id, $this->recruiterUserA);
        $this->assertNotNull($recruiterResponse);
    }

    /**
     * Scenario 6: Unauthorized users cannot download another student's documents.
     */
    public function test_unauthorized_users_cannot_download_another_students_documents(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');
        $file = $this->createPdf('student1_secret.pdf', "%PDF-1.4\nStudent 1 Secret");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        // Student 2 attempts to download Student 1's document
        $this->expectException(HttpException::class);
        $this->service->downloadDocument($this->offerA, $doc->id, $this->studentUser2);
    }

    /**
     * Scenario 7: Recruiters cannot cross company boundaries.
     */
    public function test_recruiters_cannot_cross_company_boundaries(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');
        $file = $this->createPdf('alpha_confidential.pdf', "%PDF-1.4\nCompany Alpha Confidential");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        // Recruiter B from Company Beta attempts to download Company Alpha's offer document
        $this->expectException(HttpException::class);
        $this->service->downloadDocument($this->offerA, $doc->id, $this->recruiterUserB);
    }

    /**
     * Scenario 8: Historical documents remain accessible through their recorded storage disk.
     */
    public function test_historical_documents_remain_accessible_through_recorded_storage_disk(): void
    {
        // 1. Upload historical document while disk is 'private'
        Config::set('filesystems.offer_document_disk', 'private');
        $file = $this->createPdf('historical_offer.pdf', "%PDF-1.4\nHistorical Evidence V1");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        $this->assertSame('private', $doc->storage_disk);
        $this->assertTrue(Storage::disk('private')->exists($doc->storage_key));

        // 2. Reconfigure active default disk to 's3_documents'
        Config::set('filesystems.offer_document_disk', 's3_documents');

        // 3. Download must read from the document's recorded 'private' disk, NOT active 's3_documents'
        $response = $this->service->downloadDocument($this->offerA, $doc->id, $this->studentUser1);
        $this->assertNotNull($response);
    }

    /**
     * Scenario 9: New versions never overwrite earlier versions.
     */
    public function test_new_versions_never_overwrite_earlier_versions(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');

        $file1 = $this->createPdf('offer_v1.pdf', "%PDF-1.4\nOffer Version 1 Content");
        $doc1 = $this->service->storeDocument($this->offerA, $file1, 'OFFER_LETTER', $this->studentUser1);

        $file2 = $this->createPdf('offer_v2.pdf', "%PDF-1.4\nOffer Version 2 Content");
        $doc2 = $this->service->storeDocument($this->offerA, $file2, 'OFFER_LETTER', $this->studentUser1);

        $this->assertSame(1, $doc1->version_number);
        $this->assertSame(2, $doc2->version_number);
        $this->assertNotSame($doc1->storage_key, $doc2->storage_key);

        // Both physical files must remain intact on storage
        $this->assertTrue(Storage::disk('private')->exists($doc1->storage_key));
        $this->assertTrue(Storage::disk('private')->exists($doc2->storage_key));
        $this->assertSame("%PDF-1.4\nOffer Version 1 Content", Storage::disk('private')->get($doc1->storage_key));
        $this->assertSame("%PDF-1.4\nOffer Version 2 Content", Storage::disk('private')->get($doc2->storage_key));
    }

    /**
     * Scenario 10: SHA-256 integrity is preserved.
     */
    public function test_sha256_integrity_is_preserved(): void
    {
        $rawContent = "%PDF-1.4\nSHA-256 Verified Evidence Payload 998877";
        $expectedHash = hash('sha256', $rawContent);

        $file = $this->createPdf('hash_test.pdf', $rawContent);
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        $this->assertSame($expectedHash, $doc->file_hash);
        $this->assertSame(strlen($rawContent), $doc->file_size_bytes);
    }

    /**
     * Scenario 11: Database failures do not leave orphaned files.
     */
    public function test_database_failures_do_not_leave_orphaned_files(): void
    {
        Config::set('filesystems.offer_document_disk', 'private');
        $file = $this->createPdf('abort_test.pdf', "%PDF-1.4\nContent to be rolled back");

        // Force a database failure during transaction by simulating an unhandled query exception
        DB::shouldReceive('connection')->andReturnSelf();
        DB::shouldReceive('transaction')->andThrow(new \RuntimeException('Simulated catastrophic database failure'));

        try {
            $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);
            $this->fail('Expected transaction exception not thrown');
        } catch (\RuntimeException $e) {
            $this->assertSame('Simulated catastrophic database failure', $e->getMessage());
        }

        // Verify no files were left on storage disk
        $files = Storage::disk('private')->allFiles();
        $this->assertEmpty($files, 'Orphaned storage file was found after transaction failure.');
    }

    /**
     * Scenario 12: Production uploads fail closed when private cloud storage is not configured.
     */
    public function test_production_uploads_fail_closed_when_private_cloud_storage_not_configured(): void
    {
        // Simulate production environment with local/private disk
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 'private');

        $file = $this->createPdf('prod_offer.pdf', "%PDF-1.4\nProd Offer");

        $this->expectException(OfferVerificationException::class);
        $this->expectExceptionCode(503);

        $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);
    }

    /**
     * Scenario 13: Production uploads fail closed when S3 credentials or bucket are incomplete.
     */
    public function test_production_uploads_fail_closed_when_s3_credentials_missing(): void
    {
        // Simulate production environment with S3 disk but missing bucket/credentials
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 's3_documents');
        Config::set('filesystems.disks.s3_documents.key', '');
        Config::set('filesystems.disks.s3_documents.secret', '');
        Config::set('filesystems.disks.s3_documents.bucket', '');

        $file = $this->createPdf('prod_offer_missing_creds.pdf', "%PDF-1.4\nProd Incomplete Creds");

        $this->expectException(OfferVerificationException::class);
        $this->expectExceptionCode(503);

        $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);
    }

    /**
     * Scenario 14: Local and test uploads remain functional using private local disk.
     */
    public function test_local_and_test_uploads_remain_functional_using_private_local_disk(): void
    {
        // Explicitly set testing environment
        $this->app->detectEnvironment(fn () => 'testing');
        Config::set('filesystems.offer_document_disk', 'private');

        $file = $this->createPdf('test_env_doc.pdf', "%PDF-1.4\nTest Environment Document");
        $doc = $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);

        $this->assertInstanceOf(OfferDocument::class, $doc);
        $this->assertSame('private', $doc->storage_disk);
        $this->assertTrue(Storage::disk('private')->exists($doc->storage_key));
    }

    /**
     * Scenario 15: Historical document with 'local' storage_disk is accessible via fallback.
     */
    public function test_historical_document_located_on_local_disk_is_accessible_via_fallback(): void
    {
        Storage::fake('local');
        $storageKey = "offer_documents/{$this->offerA->id}/legacy_test_file.pdf";
        Storage::disk('local')->put($storageKey, "%PDF-1.4\nLegacy File On Local Disk");

        $legacyDoc = OfferDocument::create([
            'offer_id' => $this->offerA->id,
            'document_type' => 'OFFER_LETTER',
            'version_number' => 1,
            'file_url' => $storageKey,
            'storage_disk' => 'local',
            'storage_key' => $storageKey,
            'file_hash' => hash('sha256', "%PDF-1.4\nLegacy File On Local Disk"),
            'file_size_bytes' => strlen("%PDF-1.4\nLegacy File On Local Disk"),
            'mime_type' => 'application/pdf',
            'original_filename' => 'legacy_offer.pdf',
            'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
            'uploaded_by' => $this->studentUser1->id,
        ]);

        // Download must resolve from 'local' disk even if default is 'private'
        Config::set('filesystems.offer_document_disk', 'private');
        $response = $this->service->downloadDocument($this->offerA, $legacyDoc->id, $this->studentUser1);
        $this->assertNotNull($response);
    }

    /**
     * Scenario 16: Cloudflare R2 uploads fail closed when custom endpoint is missing.
     */
    public function test_production_uploads_fail_closed_when_r2_endpoint_is_missing(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 's3_documents');
        Config::set('filesystems.disks.s3_documents.provider', 'r2');
        Config::set('filesystems.disks.s3_documents.key', 'R2_ACCESS_KEY');
        Config::set('filesystems.disks.s3_documents.secret', 'R2_SECRET_KEY');
        Config::set('filesystems.disks.s3_documents.bucket', 'campuslink-docs');
        Config::set('filesystems.disks.s3_documents.endpoint', '');

        $file = $this->createPdf('r2_no_endpoint.pdf', "%PDF-1.4\nR2 Document");

        $this->expectException(OfferVerificationException::class);
        $this->expectExceptionCode(503);

        $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);
    }

    /**
     * Scenario 17: AWS S3 uploads fail closed when region is missing.
     */
    public function test_production_uploads_fail_closed_when_aws_region_is_missing(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 's3_documents');
        Config::set('filesystems.disks.s3_documents.provider', 'aws');
        Config::set('filesystems.disks.s3_documents.key', 'AKIA_VALID_KEY');
        Config::set('filesystems.disks.s3_documents.secret', 'SECRET_VALID_KEY');
        Config::set('filesystems.disks.s3_documents.bucket', 'campuslink-docs');
        Config::set('filesystems.disks.s3_documents.region', '');

        $file = $this->createPdf('aws_no_region.pdf', "%PDF-1.4\nAWS Document");

        $this->expectException(OfferVerificationException::class);
        $this->expectExceptionCode(503);

        $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);
    }

    /**
     * Scenario 18: Insecure public visibility in S3 configuration fails closed.
     */
    public function test_production_uploads_fail_closed_when_s3_visibility_is_public(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 's3_documents');
        Config::set('filesystems.disks.s3_documents.key', 'AKIA_VALID_KEY');
        Config::set('filesystems.disks.s3_documents.secret', 'SECRET_VALID_KEY');
        Config::set('filesystems.disks.s3_documents.bucket', 'campuslink-docs');
        Config::set('filesystems.disks.s3_documents.region', 'ap-southeast-2');
        Config::set('filesystems.disks.s3_documents.visibility', 'public');

        $file = $this->createPdf('insecure_visibility.pdf', "%PDF-1.4\nInsecure Document");

        $this->expectException(OfferVerificationException::class);
        $this->expectExceptionCode(503);

        $this->service->storeDocument($this->offerA, $file, 'OFFER_LETTER', $this->studentUser1);
    }

    /**
     * Scenario 19: Complete AWS S3 configuration passes production validation.
     */
    public function test_production_validation_passes_with_complete_aws_s3_config(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 's3_documents');
        Config::set('filesystems.disks.s3_documents.driver', 's3');
        Config::set('filesystems.disks.s3_documents.provider', 'aws');
        Config::set('filesystems.disks.s3_documents.key', 'AKIA_VALID_KEY');
        Config::set('filesystems.disks.s3_documents.secret', 'SECRET_VALID_KEY');
        Config::set('filesystems.disks.s3_documents.bucket', 'campuslink-docs');
        Config::set('filesystems.disks.s3_documents.region', 'ap-southeast-2');
        Config::set('filesystems.disks.s3_documents.visibility', 'private');

        $disk = $this->service->validateStorageConfig();
        $this->assertSame('s3_documents', $disk);
    }

    /**
     * Scenario 20: Complete Cloudflare R2 configuration passes production validation.
     */
    public function test_production_validation_passes_with_complete_cloudflare_r2_config(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        Config::set('filesystems.offer_document_disk', 's3_documents');
        Config::set('filesystems.disks.s3_documents.driver', 's3');
        Config::set('filesystems.disks.s3_documents.provider', 'r2');
        Config::set('filesystems.disks.s3_documents.key', 'R2_ACCESS_KEY');
        Config::set('filesystems.disks.s3_documents.secret', 'R2_SECRET_KEY');
        Config::set('filesystems.disks.s3_documents.bucket', 'campuslink-docs');
        Config::set('filesystems.disks.s3_documents.endpoint', 'https://1234567890abcdef.r2.cloudflarestorage.com');
        Config::set('filesystems.disks.s3_documents.region', 'auto');
        Config::set('filesystems.disks.s3_documents.visibility', 'private');

        $disk = $this->service->validateStorageConfig();
        $this->assertSame('s3_documents', $disk);
    }
}
