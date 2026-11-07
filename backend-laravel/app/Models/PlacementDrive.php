<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Enums\DriveStatus;

class PlacementDrive extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'registration_deadline' => 'datetime',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'status' => DriveStatus::class,
        'metadata_json' => 'array',
        'lock_version' => 'integer',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function candidates()
    {
        return $this->hasMany(DriveCandidate::class, 'drive_id');
    }

    public function rounds()
    {
        return $this->hasMany(DriveRound::class, 'drive_id')->orderBy('round_number', 'asc');
    }

    public function venue()
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }

    public function schedules()
    {
        return $this->hasMany(\App\Models\DriveSchedule::class, 'drive_id');
    }

    public function statusHistories()
    {
        return $this->hasMany(DriveCandidateStatusHistory::class, 'drive_id');
    }

    public function assessments()
    {
        return $this->hasMany(\App\Models\Assessment::class, 'drive_id');
    }

    public function aiInterviews()
    {
        return $this->hasMany(\App\Models\AiInterview::class, 'drive_id');
    }

    public function offers()
    {
        return $this->hasMany(Offer::class, 'placement_drive_id');
    }

    /**
     * Scope for finding drives overlapping a given time window.
     */
    public function scopeOverlapping($query, $startTime, $endTime)
    {
        return $query->where(function ($q) use ($startTime, $endTime) {
            $q->where('start_date', '<', $endTime)
              ->where('end_date', '>', $startTime);
        });
    }

    /**
     * Optimistically update attributes guarding against concurrent modifications.
     *
     * @throws \RuntimeException
     */
    public function updateWithOptimisticLock(array $attributes, int $expectedVersion): bool
    {
        if ($this->lock_version !== $expectedVersion) {
            throw new \RuntimeException("CONCURRENT_MODIFICATION_DETECTED: Stale lock version {$expectedVersion}. Current version is {$this->lock_version}.");
        }

        $attributes['lock_version'] = $this->lock_version + 1;

        $affected = static::where('id', $this->id)
            ->where('lock_version', $expectedVersion)
            ->update($attributes);

        if ($affected === 0) {
            throw new \RuntimeException("CONCURRENT_MODIFICATION_DETECTED: Placement drive was modified concurrently by another transaction.");
        }

        $this->refresh();
        return true;
    }
}
