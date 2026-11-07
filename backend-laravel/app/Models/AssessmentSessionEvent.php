<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AssessmentSessionEvent extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'event_data' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function session()
    {
        return $this->belongsTo(AssessmentSession::class, 'session_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
