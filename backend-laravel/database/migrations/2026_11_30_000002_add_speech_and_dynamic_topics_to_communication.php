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
        // 1. Add Dynamic Generation Columns to communication_scenarios
        Schema::table('communication_scenarios', function (Blueprint $table) {
            $table->boolean('is_dynamic')->default(false)->after('category');
            $table->foreignId('generated_by_student_id')->nullable()->after('is_dynamic')->constrained('students')->nullOnDelete();
            $table->json('prompt_generation_metadata')->nullable()->after('curated_factual_guidance');

            $table->index(['is_dynamic', 'category'], 'idx_comm_scenarios_dynamic');
        });

        // 2. Add Spoken Audio & Telemetry to communication_practice_sessions
        Schema::table('communication_practice_sessions', function (Blueprint $table) {
            $table->string('submission_mode', 20)->default('TEXT')->after('category'); // 'TEXT' or 'AUDIO'
            $table->string('audio_storage_path', 500)->nullable()->after('student_response');
            $table->decimal('audio_duration_seconds', 6, 2)->nullable()->after('audio_storage_path');
            $table->string('audio_mime_type', 100)->nullable()->after('audio_duration_seconds');
            $table->json('acoustic_telemetry')->nullable()->after('audio_mime_type');
        });

        // 3. Add Delivery Metrics & Tier Grade to communication_feedbacks
        Schema::table('communication_feedbacks', function (Blueprint $table) {
            $table->string('grade_tier', 10)->nullable()->after('overall_score'); // 'E', 'A', 'P', 'C', 'D'
            $table->string('grade_label', 50)->nullable()->after('grade_tier');   // 'Exemplary', 'Accomplished', etc.
            $table->json('delivery_scores')->nullable()->after('rubric_scores');
            $table->json('acoustic_analytics')->nullable()->after('delivery_scores');
            $table->json('structural_framework_critique')->nullable()->after('acoustic_analytics');

            $table->index('grade_tier', 'idx_comm_feedback_grade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('communication_feedbacks', function (Blueprint $table) {
            $table->dropIndex('idx_comm_feedback_grade');
            $table->dropColumn([
                'grade_tier',
                'grade_label',
                'delivery_scores',
                'acoustic_analytics',
                'structural_framework_critique',
            ]);
        });

        Schema::table('communication_practice_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'submission_mode',
                'audio_storage_path',
                'audio_duration_seconds',
                'audio_mime_type',
                'acoustic_telemetry',
            ]);
        });

        Schema::table('communication_scenarios', function (Blueprint $table) {
            $table->dropIndex('idx_comm_scenarios_dynamic');
            $table->dropConstrainedForeignId('generated_by_student_id');
            $table->dropColumn([
                'is_dynamic',
                'prompt_generation_metadata',
            ]);
        });
    }
};
