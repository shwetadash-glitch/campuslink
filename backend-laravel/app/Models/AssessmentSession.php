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
        'tab_switches' => 'integer',
        'is_disqualified' => 'boolean',
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

        if (in_array($eventType, ['TAB_SWITCH', 'WINDOW_BLUR'])) {
            $currentSwitches = $this->tab_switches + 1;
            if (isset($data['tab_switches']) && is_numeric($data['tab_switches'])) {
                $currentSwitches = max($currentSwitches, (int) $data['tab_switches']);
            }
            $isDisqualified = $this->is_disqualified || ($currentSwitches > 3);
            $this->update([
                'tab_switches' => $currentSwitches,
                'is_disqualified' => $isDisqualified,
                'disqualification_reason' => $isDisqualified
                    ? "Disqualified: Exceeded maximum allowed tab switches ({$currentSwitches} switches detected, maximum allowed is 3). Total score set to 0."
                    : $this->disqualification_reason,
            ]);
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
