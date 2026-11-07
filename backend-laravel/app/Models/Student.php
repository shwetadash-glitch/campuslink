<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Student extends Model {
    use HasFactory;
    protected $guarded = ['id'];
    protected $casts = [
        'profile_metadata' => 'array',
        'dob' => 'date',
    ];

    protected static function booted()
    {
        static::updated(function ($student) {
            if ($student->wasChanged(['cgpa', 'branch', 'graduation_year'])) {
                // Invalidate approval on approved resumes when authoritative records change
                $student->resumes()->whereNotNull('approved_by_student_at')->each(function ($resume) {
                    $resume->update([
                        'approved_by_student_at' => null,
                        'pdf_path' => null,
                        'pdf_generated_at' => null,
                    ]);
                });
            }
        });
    }

    public function user() { return $this->belongsTo(User::class); }
    
    public function getResumeUrlAttribute($value) {
        if ($value) {
            return '/api/v1/students/' . $this->id . '/resume/download';
        }
        return null;
    }

    public function academicHistory() { return $this->hasMany(StudentAcademicHistory::class); }
    public function academicHistories() { return $this->hasMany(StudentAcademicHistory::class); }
    public function skills() { return $this->hasMany(StudentSkill::class); }
    public function projects() { return $this->hasMany(StudentProject::class); }
    public function certifications() { return $this->hasMany(StudentCertification::class); }
    public function assessments() { return $this->hasMany(StudentAssessment::class); }
    public function applications() { return $this->hasMany(Application::class); }
    public function scores() { return $this->hasMany(StudentScore::class); }
    public function offers() { return $this->hasMany(Offer::class); }
    public function driveCandidates() { return $this->hasMany(DriveCandidate::class); }
    public function schedules() { return $this->hasMany(DriveSchedule::class); }
    public function resumes() { return $this->hasMany(Resume::class); }
    public function assessmentSessions() { return $this->hasMany(AssessmentSession::class); }
    public function aiInterviewSessions() { return $this->hasMany(AiInterviewSession::class); }
    public function communicationPracticeSessions() { return $this->hasMany(CommunicationPracticeSession::class); }
}