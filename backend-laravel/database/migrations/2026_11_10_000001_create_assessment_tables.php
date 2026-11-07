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
        // 1. Question Banks
        Schema::create('question_banks', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Questions
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_bank_id')->nullable()->constrained('question_banks')->nullOnDelete();
            $table->string('type', 50)->default('MCQ'); // MCQ, DESCRIPTIVE, PROGRAMMING, APTITUDE
            $table->string('difficulty', 50)->default('MEDIUM'); // EASY, MEDIUM, HARD
            $table->string('category', 100)->default('General');
            $table->string('title', 255);
            $table->text('question_text');
            $table->text('code_snippet')->nullable();
            $table->string('programming_language', 50)->nullable();
            $table->json('options')->nullable(); // For MCQ: [{"id": "A", "text": "Option A"}, ...]
            $table->text('correct_answer')->nullable(); // SECRET: Answer key (A, or model text)
            $table->json('test_cases')->nullable(); // For Coding: [{"input": "...", "expected_output": "...", "is_hidden": false}]
            $table->json('rubric')->nullable(); // For Subjective: scoring criteria
            $table->float('marks')->default(1.0);
            $table->float('negative_marks')->default(0.0);
            $table->boolean('ai_generated')->default(false);
            $table->string('ai_review_status', 50)->default('APPROVED'); // PENDING_REVIEW, APPROVED, REJECTED
            $table->text('explanation')->nullable();
            $table->timestamps();

            $table->index(['type', 'difficulty', 'category']);
        });

        // 3. Assessments
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->foreignId('drive_id')->nullable()->constrained('placement_drives')->nullOnDelete();
            $table->foreignId('job_id')->nullable()->constrained('jobs')->nullOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('assessment_type', 50)->default('TECHNICAL'); // TECHNICAL, APTITUDE, CODING, MIXED
            $table->integer('duration_minutes')->default(60);
            $table->float('total_marks')->default(100.0);
            $table->float('pass_percentage')->default(60.0);
            $table->integer('max_attempts')->default(1);
            $table->boolean('is_randomized')->default(false);
            $table->float('negative_marking_rate')->default(0.0);
            $table->integer('grace_period_seconds')->default(60);
            $table->timestamp('published_at')->nullable();
            $table->string('status', 50)->default('DRAFT'); // DRAFT, PUBLISHED, ARCHIVED
            $table->text('instructions')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['status', 'drive_id', 'job_id']);
        });

        // 4. Assessment Questions Pivot
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->integer('order_index')->default(0);
            $table->float('marks')->default(1.0);
            $table->float('negative_marks')->default(0.0);
            $table->timestamps();

            $table->unique(['assessment_id', 'question_id']);
            $table->index(['assessment_id', 'order_index']);
        });

        // 5. Assessment Sessions (Authoritative candidate exam sitting)
        Schema::create('assessment_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->integer('attempt_number')->default(1);
            $table->string('status', 50)->default('IN_PROGRESS'); // IN_PROGRESS, SUBMITTED, EXPIRED, EVALUATED
            $table->timestamp('started_at');
            $table->timestamp('expires_at'); // Authoritative server-side expiration cutoff
            $table->timestamp('submitted_at')->nullable();
            $table->float('total_score')->nullable();
            $table->boolean('passed')->nullable();
            $table->integer('proctoring_flags_count')->default(0);
            $table->json('question_order')->nullable(); // Saved randomized question ID sequence
            $table->json('evaluation_summary')->nullable(); // Category breakdown & score items
            $table->timestamps();

            $table->index(['student_id', 'assessment_id', 'status']);
            $table->index('expires_at');
            $table->unique(['assessment_id', 'student_id', 'attempt_number'], 'uniq_assessment_student_attempt');
        });

        // 6. Assessment Answers (Candidate responses & auto-saves)
        Schema::create('assessment_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('assessment_sessions')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->text('answer_text')->nullable(); // MCQ option, descriptive text, or code
            $table->string('code_language', 50)->nullable();
            $table->boolean('is_auto_saved')->default(true);
            $table->timestamp('saved_at');
            $table->float('score_awarded')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->json('execution_result')->nullable(); // Sandbox execution test case passes
            $table->text('evaluator_feedback')->nullable();
            $table->foreignId('evaluated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->unique(['session_id', 'question_id']);
        });

        // 7. Assessment Session Events (Integrity & telemetry log)
        Schema::create('assessment_session_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('assessment_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('event_type', 50); // WINDOW_BLUR, FULLSCREEN_EXIT, PASTE_DETECTED, etc.
            $table->json('event_data')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['session_id', 'event_type']);
        });

        // 8. Assessment Score Histories (Audit trail for grade adjustments)
        Schema::create('assessment_score_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('assessment_sessions')->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->float('old_score');
            $table->float('new_score');
            $table->text('reason');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_score_histories');
        Schema::dropIfExists('assessment_session_events');
        Schema::dropIfExists('assessment_answers');
        Schema::dropIfExists('assessment_sessions');
        Schema::dropIfExists('assessment_questions');
        Schema::dropIfExists('assessments');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('question_banks');
    }
};
