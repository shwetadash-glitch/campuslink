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
        Schema::table('offers', function (Blueprint $table) {
            $table->foreignId('placement_drive_id')->nullable()->after('job_id')->constrained('placement_drives')->cascadeOnDelete();
            $table->foreignId('drive_candidate_id')->nullable()->after('placement_drive_id')->constrained('drive_candidates')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('deferral_info');
            $table->string('offer_letter_url')->nullable()->after('rejection_reason');
            $table->index(['student_id', 'status'], 'idx_offers_student_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->dropForeign(['placement_drive_id']);
            $table->dropForeign(['drive_candidate_id']);
            $table->dropIndex('idx_offers_student_status');
            $table->dropColumn([
                'placement_drive_id',
                'drive_candidate_id',
                'rejection_reason',
                'offer_letter_url',
            ]);
        });
    }
};
