<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiInterviewQuestion extends Model
{
    protected $table = 'ai_interview_questions';

    protected $fillable = [
        'ai_interview_id',
        'stage',
        'order_index',
        'question_text',
        'category',
        'expected_answer_points',
        'rubric',
        'weight',
        'ai_generated',
        'ai_review_status',
    ];

    protected $casts = [
        'order_index' => 'integer',
        'expected_answer_points' => 'array',
        'rubric' => 'array',
        'weight' => 'float',
        'ai_generated' => 'boolean',
    ];

    public function aiInterview(): BelongsTo
    {
        return $this->belongsTo(AiInterview::class, 'ai_interview_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AiInterviewMessage::class, 'question_id');
    }

    /**
     * Format question for candidate presentation.
     * CRITICAL SECURITY: Strips internal evaluation rubrics, scoring weights, and expected answer points.
     */
    public function toCandidateArray(): array
    {
        return [
            'id' => $this->id,
            'stage' => $this->stage,
            'order_index' => $this->order_index,
            'category' => $this->category,
            'question_text' => $this->question_text,
        ];
    }
}
