<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class InstitutionalEvent extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'affects_branches' => 'array',
        'is_hard_blackout' => 'boolean',
    ];

    /**
     * Scope to find events that overlap with a given time range.
     */
    public function scopeOverlapping($query, $startTime, $endTime)
    {
        return $query->where(function ($q) use ($startTime, $endTime) {
            $q->where('start_time', '<', $endTime)
              ->where('end_time', '>', $startTime);
        });
    }

    /**
     * Check if this event affects a specific student branch.
     */
    public function affectsBranch(?string $branch): bool
    {
        if (empty($this->affects_branches)) {
            return true; // Affects all branches by default
        }

        if (in_array('ALL', $this->affects_branches, true)) {
            return true;
        }

        if ($branch === null) {
            return true;
        }

        return in_array($branch, $this->affects_branches, true);
    }
}
