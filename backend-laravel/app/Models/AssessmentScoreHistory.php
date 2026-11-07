<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AssessmentScoreHistory extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'old_score' => 'float',
        'new_score' => 'float',
    ];

    public function session()
    {
        return $this->belongsTo(AssessmentSession::class, 'session_id');
    }

    public function changedByUser()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
