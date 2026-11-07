<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AssessmentAnswer extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'is_auto_saved' => 'boolean',
        'saved_at' => 'datetime',
        'score_awarded' => 'float',
        'is_correct' => 'boolean',
        'execution_result' => 'array',
        'evaluated_at' => 'datetime',
    ];

    public function session()
    {
        return $this->belongsTo(AssessmentSession::class, 'session_id');
    }

    public function question()
    {
        return $this->belongsTo(Question::class, 'question_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluated_by_user_id');
    }
}
