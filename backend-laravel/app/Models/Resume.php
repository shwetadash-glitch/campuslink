<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Resume extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'content' => 'array',
        'analysis_summary' => 'array',
        'is_primary' => 'boolean',
        'quality_score' => 'integer',
        'ats_score' => 'integer',
        'job_match_score' => 'integer',
        'pdf_generated_at' => 'datetime',
        'approved_by_student_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function versions()
    {
        return $this->hasMany(ResumeVersion::class)->orderBy('version_number', 'desc');
    }

    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function isApproved(): bool
    {
        return $this->approved_by_student_at !== null;
    }

    public function approve(): self
    {
        $this->update(['approved_by_student_at' => Carbon::now()]);
        return $this;
    }

    /**
     * Create an immutable version snapshot of the current resume content.
     */
    public function createSnapshot(?string $changeSummary = null): ResumeVersion
    {
        $latestVersion = $this->versions()->max('version_number') ?? 0;
        $nextVersion = $latestVersion + 1;

        return ResumeVersion::create([
            'resume_id' => $this->id,
            'student_id' => $this->student_id,
            'version_number' => $nextVersion,
            'change_summary' => $changeSummary ?: "Version {$nextVersion} Snapshot",
            'content' => $this->content,
            'quality_score' => $this->quality_score,
            'ats_score' => $this->ats_score,
            'pdf_path' => $this->pdf_path,
        ]);
    }
}
