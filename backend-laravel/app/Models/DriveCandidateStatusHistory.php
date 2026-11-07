<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DriveCandidateStatusHistory extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    public function driveCandidate()
    {
        return $this->belongsTo(DriveCandidate::class, 'drive_candidate_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function drive()
    {
        return $this->belongsTo(PlacementDrive::class, 'drive_id');
    }

    public function changedByUser()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }

    /**
     * Enforce append-only immutability at the Eloquent lifecycle level.
     */
    protected static function booted()
    {
        static::updating(function () {
            throw new \RuntimeException("DriveCandidateStatusHistory records are strictly append-only, immutable and cannot be updated.");
        });

        static::deleting(function () {
            throw new \RuntimeException("DriveCandidateStatusHistory records are strictly immutable and cannot be deleted.");
        });
    }
}
