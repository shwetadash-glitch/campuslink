<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiInterviewScoreHistory extends Model
{
    public $timestamps = false;
    protected $table = 'ai_interview_score_histories';

    protected $fillable = [
        'session_id',
        'changed_by_user_id',
        'old_score',
        'new_score',
        'old_dimension_scores',
        'new_dimension_scores',
        'reason',
        'feedback',
        'created_at',
    ];

    protected $casts = [
        'old_score' => 'float',
        'new_score' => 'float',
        'old_dimension_scores' => 'array',
        'new_dimension_scores' => 'array',
        'created_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AiInterviewSession::class, 'session_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }

    protected static function booted()
    {
        static::updating(function () {
            throw new \RuntimeException("AiInterviewScoreHistory records are strictly append-only and immutable.");
        });

        static::deleting(function () {
            throw new \RuntimeException("AiInterviewScoreHistory records are strictly immutable and cannot be deleted.");
        });
    }
}
