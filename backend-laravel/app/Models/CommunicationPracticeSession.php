<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CommunicationPracticeSession extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'is_follow_up' => 'boolean',
        'security_telemetry' => 'array',
        'acoustic_telemetry' => 'array',
        'audio_duration_seconds' => 'float',
        'submitted_at' => 'datetime',
        'evaluated_at' => 'datetime',
        'evaluation_claimed_at' => 'datetime',
        'attempt_number' => 'integer',
        'revision_number' => 'integer',
        'word_count' => 'integer',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(CommunicationScenario::class, 'scenario_id');
    }

    public function feedback(): HasOne
    {
        return $this->hasOne(CommunicationFeedback::class, 'session_id');
    }

    public function parentSession(): BelongsTo
    {
        return $this->belongsTo(CommunicationPracticeSession::class, 'parent_session_id');
    }

    public function revisionChild(): HasOne
    {
        return $this->hasOne(CommunicationPracticeSession::class, 'parent_session_id');
    }

    /**
     * Check if the evaluation lease has expired (>120 seconds).
     */
    public function isLeaseExpired(int $leaseSeconds = 120): bool
    {
        if ($this->status !== 'EVALUATION_IN_PROGRESS' || !$this->evaluation_claimed_at) {
            return false;
        }

        return $this->evaluation_claimed_at->addSeconds($leaseSeconds)->isPast();
    }
}
