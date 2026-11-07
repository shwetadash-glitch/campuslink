<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Alter offers table for off-campus intake, verification tracking, and review claims
        Schema::table('offers', function (Blueprint $table) {
            $table->unsignedBigInteger('recruiter_id')->nullable()->change();
            $table->unsignedBigInteger('job_id')->nullable()->change();

            $table->boolean('is_off_campus')->default(false)->after('status');
            $table->string('company_name', 255)->nullable()->after('is_off_campus');
            $table->string('designation', 255)->nullable()->after('company_name');
            $table->string('verification_status', 50)->default('PENDING_VERIFICATION')->after('designation');
            $table->timestamp('verified_at')->nullable()->after('verification_status');
            $table->foreignId('verified_by')->nullable()->after('verified_at')->constrained('users')->nullOnDelete();

            // Recoverable 15-minute review claim lease fields
            $table->uuid('review_claim_token')->nullable()->after('verified_by');
            $table->timestamp('review_claimed_at')->nullable()->after('review_claim_token');
            $table->timestamp('review_claimed_until')->nullable()->after('review_claimed_at');
            $table->foreignId('review_claimed_by')->nullable()->after('review_claimed_until')->constrained('users')->nullOnDelete();

            $table->index(['verification_status', 'status'], 'idx_offers_verif_status');
            $table->index(['is_off_campus'], 'idx_offers_is_off_campus');
            $table->index(['review_claimed_until', 'review_claimed_by'], 'idx_offers_review_claim');
        });

        // 2. Alter offer_documents table for versioning, private storage disk/key, SHA-256 hash, and document status
        Schema::table('offer_documents', function (Blueprint $table) {
            $table->unsignedInteger('version_number')->default(1)->after('document_type');
            $table->string('storage_disk', 50)->default('private')->after('file_url');
            $table->string('storage_key', 500)->nullable()->after('storage_disk');
            $table->string('file_hash', 64)->nullable()->after('storage_key');
            $table->unsignedBigInteger('file_size_bytes')->nullable()->after('file_hash');
            $table->string('mime_type', 100)->nullable()->after('file_size_bytes');
            $table->string('original_filename', 255)->nullable()->after('mime_type');
            $table->string('document_status', 50)->default('PENDING_REVIEW')->after('original_filename');
            $table->foreignId('verified_by')->nullable()->after('verified_at')->constrained('users')->nullOnDelete();
            $table->foreignId('uploaded_by')->nullable()->after('verified_by')->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('uploaded_by');
            $table->json('extracted_metadata')->nullable()->after('rejection_reason');

            $table->unique(['offer_id', 'document_type', 'version_number'], 'uq_offer_docs_type_version');
            $table->index(['document_status'], 'idx_offer_docs_status');
        });

        // 3. Create append-only offer_verification_histories table with ON DELETE RESTRICT
        Schema::create('offer_verification_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_id')->constrained('offers')->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('action', 50);
            $table->string('previous_status', 50)->nullable();
            $table->string('new_status', 50);
            $table->unsignedInteger('document_version_reviewed')->nullable();
            $table->uuid('review_claim_token')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['offer_id', 'created_at'], 'idx_verif_hist_offer_created');
            $table->index(['actor_id', 'created_at'], 'idx_verif_hist_actor_created');
            $table->index(['action'], 'idx_verif_hist_action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offer_verification_histories');

        Schema::table('offer_documents', function (Blueprint $table) {
            $table->dropUnique('uq_offer_docs_type_version');
            $table->dropIndex('idx_offer_docs_status');
            $table->dropForeign(['verified_by']);
            $table->dropForeign(['uploaded_by']);
            $table->dropColumn([
                'version_number',
                'storage_disk',
                'storage_key',
                'file_hash',
                'file_size_bytes',
                'mime_type',
                'original_filename',
                'document_status',
                'verified_by',
                'uploaded_by',
                'rejection_reason',
                'extracted_metadata',
            ]);
        });

        Schema::table('offers', function (Blueprint $table) {
            $table->dropIndex('idx_offers_verif_status');
            $table->dropIndex('idx_offers_is_off_campus');
            $table->dropIndex('idx_offers_review_claim');
            $table->dropForeign(['verified_by']);
            $table->dropForeign(['review_claimed_by']);
            $table->dropColumn([
                'is_off_campus',
                'company_name',
                'designation',
                'verification_status',
                'verified_at',
                'verified_by',
                'review_claim_token',
                'review_claimed_at',
                'review_claimed_until',
                'review_claimed_by',
            ]);
        });
    }
};
