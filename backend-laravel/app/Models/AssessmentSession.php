<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class AssessmentSession extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'attempt_number' => 'integer',
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'submitted_at' => 'datetime',
        'total_score' => 'float',
        'passed' => 'boolean',
        'proctoring_flags_count' => 'integer',
        'question_order' => 'array',
        'evaluation_summary' => 'array',
    ];

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function answers()
    {
        return $this->hasMany(AssessmentAnswer::class, 'session_id');
    }

    public function events()
    {
        return $this->hasMany(AssessmentSessionEvent::class, 'session_id')->orderBy('id', 'asc');
    }

    public function scoreHistories()
    {
        return $this->hasMany(AssessmentScoreHistory::class, 'session_id')->orderBy('id', 'desc');
    }

    /**
     * Check if session has exceeded its server-side deadline.
     */
    public function isExpired(): bool
    {
        if ($this->status === 'SUBMITTED' || $this->status === 'EVALUATED') {
            return false;
        }

        return Carbon::now()->greaterThan($this->expires_at);
    }

    public function secondsRemaining(): int
    {
        if ($this->status === 'SUBMITTED' || $this->status === 'EVALUATED') {
            return 0;
        }

        $now = Carbon::now();
        if ($now->greaterThanOrEqualTo($this->expires_at)) {
            return 0;
        }

        return $now->diffInSeconds($this->expires_at, false);
    }

    /**
     * Record an examination telemetry or security event.
     */
    public function recordEvent(string $eventType, ?array $data = null): AssessmentSessionEvent
    {
        $isSuspicious = in_array($eventType, ['WINDOW_BLUR', 'FULLSCREEN_EXIT', 'TAB_SWITCH', 'PASTE_DETECTED']);
        if ($isSuspicious) {
            $this->increment('proctoring_flags_count');
        }

        return AssessmentSessionEvent::create([
            'session_id' => $this->id,
            'student_id' => $this->student_id,
            'event_type' => $eventType,
            'event_data' => $data,
            'occurred_at' => Carbon::now(),
        ]);
    }

    /**
     * Complete and submit session.
     */
    public function markSubmitted(): self
    {
        $this->update([
            'status' => 'SUBMITTED',
            'submitted_at' => Carbon::now(),
        ]);

        $this->recordEvent('SESSION_SUBMITTED', [
            'seconds_used' => Carbon::now()->diffInSeconds($this->started_at),
        ]);

        return $this;
    }
}
