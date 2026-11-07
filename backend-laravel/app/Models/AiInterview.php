<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiInterview extends Model
{
    protected $table = 'ai_interviews';

    protected $fillable = [
        'title',
        'code',
        'description',
        'target_role',
        'interview_type',
        'difficulty',
        'duration_minutes',
        'max_questions',
        'max_follow_ups_per_question',
        'drive_id',
        'job_id',
        'created_by_user_id',
        'rubric_template',
        'pass_percentage',
        'status',
        'published_at',
    ];

    protected $casts = [
        'rubric_template' => 'array',
        'duration_minutes' => 'integer',
        'max_questions' => 'integer',
        'max_follow_ups_per_question' => 'integer',
        'pass_percentage' => 'float',
        'published_at' => 'datetime',
    ];

    public function questions(): HasMany
    {
        return $this->hasMany(AiInterviewQuestion::class, 'ai_interview_id')->orderBy('order_index');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AiInterviewSession::class, 'ai_interview_id');
    }

    public function drive(): BelongsTo
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function placementDrive(): BelongsTo
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function isPublished(): bool
    {
        return $this->status === 'PUBLISHED';
    }

    public function publish(): self
    {
        $this->update([
            'status' => 'PUBLISHED',
            'published_at' => now(),
        ]);

        return $this;
    }
}
