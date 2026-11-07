<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Scenarios Table
        Schema::create('communication_scenarios', function (Blueprint $table) {
            $table->id();
            $table->string('category', 50);
            $table->string('title', 255);
            $table->text('prompt_text');
            $table->text('context_scenario');
            $table->string('target_audience', 100);
            $table->string('difficulty', 20)->default('INTERMEDIATE');
            $table->integer('min_word_limit')->default(20);
            $table->integer('max_word_limit')->default(500);
            $table->integer('recommended_min_words')->default(50);
            $table->integer('recommended_max_words')->default(250);
            $table->json('key_focus_areas')->nullable();
            $table->text('curated_factual_guidance')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['category', 'is_active']);
        });

        // 2. Practice Sessions Table
        Schema::create('communication_practice_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('scenario_id')->constrained('communication_scenarios')->onDelete('restrict');
            $table->string('category', 50);
            $table->string('status', 30)->default('IN_PROGRESS'); // IN_PROGRESS, EVALUATION_IN_PROGRESS, EVALUATED, EVALUATION_FAILED, ABANDONED
            $table->text('student_response')->nullable();
            $table->integer('word_count')->nullable();
            $table->integer('attempt_number')->default(1);
            $table->integer('revision_number')->default(1);
            $table->foreignId('parent_session_id')->nullable()->constrained('communication_practice_sessions')->onDelete('set null');
            $table->boolean('is_follow_up')->default(false);

            // Lease and recovery
            $table->uuid('evaluation_claim_token')->nullable();
            $table->timestamp('evaluation_claimed_at')->nullable();

            // Early telemetry and error tracking
            $table->json('security_telemetry')->nullable();
            $table->string('error_type', 50)->nullable(); // PROVIDER_UNAVAILABLE, TIMEOUT, MALFORMED_OUTPUT
            $table->text('error_message')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'scenario_id', 'attempt_number', 'revision_number'], 'uq_student_scenario_attempt_rev');
            $table->index(['student_id', 'category', 'status'], 'idx_comm_sessions_student_lookup');
            $table->index(['status', 'evaluation_claimed_at'], 'idx_comm_sessions_lease');
        });

        // Enforce Linear Revision Progression: only one direct child revision per parent session
        // Uses raw statement for partial unique index support in PostgreSQL / SQLite
        $driver = DB::getDriverName();
        if ($driver === 'pgsql' || $driver === 'sqlite') {
            DB::statement("CREATE UNIQUE INDEX uq_comm_session_single_parent ON communication_practice_sessions(parent_session_id) WHERE parent_session_id IS NOT NULL");
        } else {
            Schema::table('communication_practice_sessions', function (Blueprint $table) {
                $table->unique('parent_session_id', 'uq_comm_session_single_parent');
            });
        }

        // 3. Feedbacks Table
        Schema::create('communication_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->unique()->constrained('communication_practice_sessions')->onDelete('cascade');
            $table->decimal('overall_score', 5, 2);
            $table->json('rubric_scores');
            $table->json('factual_technical_evaluation');
            $table->json('strengths')->nullable();
            $table->json('areas_to_improve')->nullable();
            $table->json('grounded_explanations')->nullable();
            $table->json('actionable_suggestions')->nullable();
            $table->text('improved_example_response');
            $table->json('recommended_next_exercise');
            $table->string('ai_model', 100);
            $table->boolean('is_simulated')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('communication_feedbacks');
        Schema::dropIfExists('communication_practice_sessions');
        Schema::dropIfExists('communication_scenarios');
    }
};
