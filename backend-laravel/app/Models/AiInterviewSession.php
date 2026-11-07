<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class AiInterviewSession extends Model
{
    protected $table = 'ai_interview_sessions';

    protected $fillable = [
        'ai_interview_id',
        'student_id',
        'attempt_number',
        'status',
        'current_stage',
        'current_question_index',
        'follow_ups_count_for_current',
        'started_at',
        'expires_at',
        'completed_at',
        'total_score',
        'passed',
        'dimension_scores',
        'ai_evaluation_summary',
        'is_provisional',
        'ai_review_status',
        'reviewed_by_user_id',
        'reviewed_at',
    ];

    protected $casts = [
        'attempt_number' => 'integer',
        'current_question_index' => 'integer',
        'follow_ups_count_for_current' => 'integer',
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'total_score' => 'float',
        'passed' => 'boolean',
        'is_provisional' => 'boolean',
        'dimension_scores' => 'array',
        'ai_evaluation_summary' => 'array',
    ];

    public function aiInterview(): BelongsTo
    {
        return $this->belongsTo(AiInterview::class, 'ai_interview_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiInterviewMessage::class, 'session_id')->orderBy('id');
    }

    public function scoreHistories(): HasMany
    {
        return $this->hasMany(AiInterviewScoreHistory::class, 'session_id')->orderBy('created_at', 'desc');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    /**
     * Check if session has passed its authoritative server-side deadline.
     */
    public function isExpired(): bool
    {
        if ($this->status === 'COMPLETED' || $this->status === 'EVALUATED') {
            return false;
        }

        return Carbon::now()->greaterThan($this->expires_at);
    }

    /**
     * Remaining seconds before deadline.
     */
    public function secondsRemaining(): int
    {
        if ($this->isExpired()) {
            return 0;
        }

        return max(0, Carbon::now()->diffInSeconds($this->expires_at, false));
    }

    /**
     * Append a message to the multi-turn session transcript.
     */
    public function recordMessage(
        string $sender,
        string $messageType,
        string $content,
        ?int $questionId = null,
        bool $isFollowUp = false,
        ?array $provisionalFeedback = null
    ): AiInterviewMessage {
        return $this->messages()->create([
            'question_id' => $questionId,
            'sender' => $sender,
            'message_type' => $messageType,
            'content' => $content,
            'is_follow_up' => $isFollowUp,
            'provisional_feedback' => $provisionalFeedback,
        ]);
    }
}
