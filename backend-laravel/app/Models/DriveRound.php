<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DriveRound extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'round_number' => 'integer',
        'capacity' => 'integer',
    ];

    public function drive()
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function venueModel()
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }

    /**
     * Scope for finding overlapping rounds.
     */
    public function scopeOverlapping($query, $startTime, $endTime)
    {
        return $query->where(function ($q) use ($startTime, $endTime) {
            $q->where('start_time', '<', $endTime)
              ->where('end_time', '>', $startTime);
        });
    }
}
