<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Milestone 6: AI-Powered Structured Interview Mode and Rubric-Based Evaluation.
     */
    public function up(): void
    {
        // 1. AI Interview Templates / Configurations
        Schema::create('ai_interviews', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->string('target_role', 100)->default('Software Engineer');
            $table->string('interview_type', 50)->default('TECHNICAL'); // TECHNICAL, BEHAVIORAL, SYSTEM_DESIGN, MIXED
            $table->string('difficulty', 20)->default('MEDIUM'); // EASY, MEDIUM, HARD
            $table->integer('duration_minutes')->default(45);
            $table->integer('max_questions')->default(5);
            $table->integer('max_follow_ups_per_question')->default(1);
            $table->foreignId('drive_id')->nullable()->constrained('placement_drives')->nullOnDelete();
            $table->foreignId('job_id')->nullable()->constrained('jobs')->nullOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->json('rubric_template')->nullable();
            $table->float('pass_percentage')->default(60.0);
            $table->string('status', 50)->default('DRAFT'); // DRAFT, PUBLISHED, ARCHIVED
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'drive_id', 'job_id']);
        });

        // 2. Structured Questions per Interview Stage
        Schema::create('ai_interview_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_interview_id')->constrained('ai_interviews')->cascadeOnDelete();
            $table->string('stage', 50)->default('TECHNICAL'); // INTRODUCTION, TECHNICAL, BEHAVIORAL, SYSTEM_DESIGN, WRAP_UP
            $table->integer('order_index')->default(1);
            $table->text('question_text');
            $table->string('category', 100)->default('Core Competencies');
            $table->json('expected_answer_points')->nullable();
            $table->json('rubric')->nullable();
            $table->float('weight')->default(1.0);
            $table->boolean('ai_generated')->default(false);
            $table->string('ai_review_status', 50)->default('APPROVED'); // PENDING_REVIEW, APPROVED
            $table->timestamps();

            $table->index(['ai_interview_id', 'order_index']);
        });

        // 3. AI Interview Candidate Sessions (Authoritative Sitting)
        Schema::create('ai_interview_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_interview_id')->constrained('ai_interviews')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->integer('attempt_number')->default(1);
            $table->string('status', 50)->default('IN_PROGRESS'); // IN_PROGRESS, COMPLETED, EVALUATED, EXPIRED, ABANDONED
            $table->string('current_stage', 50)->default('TECHNICAL');
            $table->integer('current_question_index')->default(0);
            $table->integer('follow_ups_count_for_current')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('expires_at');
            $table->timestamp('completed_at')->nullable();
            $table->float('total_score')->nullable();
            $table->boolean('passed')->nullable();
            $table->json('dimension_scores')->nullable(); // Technical Depth, Problem Solving, Communication, etc.
            $table->json('ai_evaluation_summary')->nullable(); // Strengths, weaknesses, quote evidence, recommendation
            $table->boolean('is_provisional')->default(true);
            $table->string('ai_review_status', 50)->default('PENDING_HUMAN_REVIEW'); // PENDING_HUMAN_REVIEW, APPROVED, OVERRIDDEN
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['ai_interview_id', 'student_id', 'attempt_number'], 'uniq_interview_student_attempt');
            $table->index(['student_id', 'ai_interview_id', 'status']);
            $table->index('expires_at');
        });

        // 4. Multi-Turn Conversation Messages & Follow-Up Probes
        Schema::create('ai_interview_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('ai_interview_sessions')->cascadeOnDelete();
            $table->foreignId('question_id')->nullable()->constrained('ai_interview_questions')->nullOnDelete();
            $table->string('sender', 20); // AI, CANDIDATE, SYSTEM
            $table->string('message_type', 50); // PRIMARY_QUESTION, CANDIDATE_ANSWER, FOLLOW_UP_QUESTION, FOLLOW_UP_ANSWER, SYSTEM_NOTICE
            $table->text('content');
            $table->boolean('is_follow_up')->default(false);
            $table->json('provisional_feedback')->nullable();
            $table->timestamps();

            $table->index(['session_id', 'id']);
        });

        // 5. Score Adjustments & Human Review Audit Trail
        Schema::create('ai_interview_score_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('ai_interview_sessions')->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->float('old_score')->nullable();
            $table->float('new_score');
            $table->json('old_dimension_scores')->nullable();
            $table->json('new_dimension_scores')->nullable();
            $table->string('reason', 255);
            $table->text('feedback')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['session_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_interview_score_histories');
        Schema::dropIfExists('ai_interview_messages');
        Schema::dropIfExists('ai_interview_sessions');
        Schema::dropIfExists('ai_interview_questions');
        Schema::dropIfExists('ai_interviews');
    }
};
