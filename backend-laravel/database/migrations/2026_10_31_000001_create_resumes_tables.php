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
        Schema::create('resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('job_id')->nullable()->constrained('jobs')->nullOnDelete();
            $table->string('title');
            $table->string('target_role')->nullable();
            $table->string('target_company')->nullable();
            $table->string('template')->default('modern');
            $table->boolean('is_primary')->default(false);
            $table->json('content');
            $table->integer('quality_score')->nullable();
            $table->integer('ats_score')->nullable();
            $table->json('analysis_summary')->nullable();
            $table->integer('job_match_score')->nullable();
            $table->text('job_description_raw')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamp('pdf_generated_at')->nullable();
            $table->timestamp('approved_by_student_at')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'is_primary']);
            $table->index(['student_id', 'created_at']);
        });

        Schema::create('resume_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_id')->constrained('resumes')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->integer('version_number');
            $table->string('change_summary')->nullable();
            $table->json('content');
            $table->integer('quality_score')->nullable();
            $table->integer('ats_score')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->unique(['resume_id', 'version_number']);
            $table->index(['resume_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resume_versions');
        Schema::dropIfExists('resumes');
    }
};
