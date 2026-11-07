<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ResumeVersion extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'content' => 'array',
        'version_number' => 'integer',
        'quality_score' => 'integer',
        'ats_score' => 'integer',
    ];

    public function resume()
    {
        return $this->belongsTo(Resume::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
