<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AuditLog extends Model {
    use HasFactory;
    public $timestamps = false;
    protected $guarded = ['id'];
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'request_metadata' => 'array',
        'timestamp' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class); }

    protected static function booted()
    {
        static::updating(function () {
            throw new \RuntimeException("Audit records are immutable and cannot be updated.");
        });

        static::deleting(function () {
            throw new \RuntimeException("Audit records are immutable and cannot be deleted.");
        });
    }
}