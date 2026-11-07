<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiInterviewMessage extends Model
{
    protected $table = 'ai_interview_messages';

    protected $fillable = [
        'session_id',
        'question_id',
        'sender',
        'message_type',
        'content',
        'is_follow_up',
        'provisional_feedback',
    ];

    protected $casts = [
        'is_follow_up' => 'boolean',
        'provisional_feedback' => 'array',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AiInterviewSession::class, 'session_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AiInterviewQuestion::class, 'question_id');
    }
}
