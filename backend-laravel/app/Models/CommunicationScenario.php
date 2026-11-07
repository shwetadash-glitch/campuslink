<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunicationScenario extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'key_focus_areas' => 'array',
        'is_active' => 'boolean',
        'archived_at' => 'datetime',
        'min_word_limit' => 'integer',
        'max_word_limit' => 'integer',
        'recommended_min_words' => 'integer',
        'recommended_max_words' => 'integer',
    ];

    public function practiceSessions(): HasMany
    {
        return $this->hasMany(CommunicationPracticeSession::class, 'scenario_id');
    }

    /**
     * Scope for active scenarios only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->whereNull('archived_at');
    }

    /**
     * Convert to candidate/student safe array representation.
     */
    public function toStudentArray(): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'title' => $this->title,
            'prompt_text' => $this->prompt_text,
            'context_scenario' => $this->context_scenario,
            'target_audience' => $this->target_audience,
            'difficulty' => $this->difficulty,
            'min_word_limit' => $this->min_word_limit,
            'max_word_limit' => $this->max_word_limit,
            'recommended_min_words' => $this->recommended_min_words,
            'recommended_max_words' => $this->recommended_max_words,
            'key_focus_areas' => $this->key_focus_areas ?? [],
            // Note: curated_factual_guidance is reserved for evaluator prompts, not disclosed upfront to students
        ];
    }
}
