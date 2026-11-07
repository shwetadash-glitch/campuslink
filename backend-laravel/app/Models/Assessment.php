<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Assessment extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'duration_minutes' => 'integer',
        'total_marks' => 'float',
        'pass_percentage' => 'float',
        'max_attempts' => 'integer',
        'is_randomized' => 'boolean',
        'negative_marking_rate' => 'float',
        'grace_period_seconds' => 'integer',
        'published_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function drive()
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function job()
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function questions()
    {
        return $this->belongsToMany(Question::class, 'assessment_questions')
            ->withPivot(['order_index', 'marks', 'negative_marks'])
            ->withTimestamps()
            ->orderBy('assessment_questions.order_index');
    }

    public function sessions()
    {
        return $this->hasMany(AssessmentSession::class);
    }

    public function isPublished(): bool
    {
        return $this->status === 'PUBLISHED' && $this->published_at !== null;
    }

    public function publish(): self
    {
        $this->update([
            'status' => 'PUBLISHED',
            'published_at' => Carbon::now(),
        ]);
        return $this;
    }
}
