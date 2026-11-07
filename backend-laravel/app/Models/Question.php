<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Question extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'options' => 'array',
        'test_cases' => 'array',
        'rubric' => 'array',
        'marks' => 'float',
        'negative_marks' => 'float',
        'ai_generated' => 'boolean',
    ];

    public function questionBank()
    {
        return $this->belongsTo(QuestionBank::class);
    }

    public function assessments()
    {
        return $this->belongsToMany(Assessment::class, 'assessment_questions')
            ->withPivot(['order_index', 'marks', 'negative_marks'])
            ->withTimestamps();
    }

    public function answers()
    {
        return $this->hasMany(AssessmentAnswer::class);
    }

    /**
     * Return candidate-safe sanitized array:
     * - Strips correct_answer
     * - Filters test_cases so only sample/visible test cases are shown
     * - Strips subjective scoring rubrics and solution explanations
     */
    public function toCandidateArray(float $marks = 1.0, float $negativeMarks = 0.0): array
    {
        $sanitizedTestCases = [];
        if (!empty($this->test_cases) && is_array($this->test_cases)) {
            foreach ($this->test_cases as $tc) {
                if (empty($tc['is_hidden'])) {
                    $sanitizedTestCases[] = [
                        'input' => $tc['input'] ?? '',
                        'expected_output' => $tc['expected_output'] ?? '',
                        'is_sample' => true,
                    ];
                }
            }
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'difficulty' => $this->difficulty,
            'category' => $this->category,
            'title' => $this->title,
            'question_text' => $this->question_text,
            'code_snippet' => $this->code_snippet,
            'programming_language' => $this->programming_language,
            'options' => $this->options, // Options text for MCQ (without correct indication)
            'sample_test_cases' => $sanitizedTestCases,
            'marks' => $marks,
            'negative_marks' => $negativeMarks,
        ];
    }
}
