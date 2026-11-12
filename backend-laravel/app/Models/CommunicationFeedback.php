<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunicationFeedback extends Model
{
    use HasFactory;

    protected $table = 'communication_feedbacks';
    protected $guarded = ['id'];

    protected $casts = [
        'overall_score' => 'float',
        'rubric_scores' => 'array',
        'delivery_scores' => 'array',
        'acoustic_analytics' => 'array',
        'structural_framework_critique' => 'array',
        'factual_technical_evaluation' => 'array',
        'strengths' => 'array',
        'areas_to_improve' => 'array',
        'grounded_explanations' => 'array',
        'actionable_suggestions' => 'array',
        'recommended_next_exercise' => 'array',
        'is_simulated' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CommunicationPracticeSession::class, 'session_id');
    }
}
