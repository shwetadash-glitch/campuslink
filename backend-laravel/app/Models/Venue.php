<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Venue extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'is_virtual' => 'boolean',
        'is_active' => 'boolean',
        'capacity' => 'integer',
    ];

    public function placementDrives()
    {
        return $this->hasMany(PlacementDrive::class, 'venue_id');
    }

    public function driveRounds()
    {
        return $this->hasMany(DriveRound::class, 'venue_id');
    }
}
