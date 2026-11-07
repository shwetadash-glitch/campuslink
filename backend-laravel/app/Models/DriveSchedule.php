<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DriveSchedule extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function drive()
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
