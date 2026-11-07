<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class AssessmentQuestion extends Pivot
{
    protected $table = 'assessment_questions';

    protected $casts = [
        'order_index' => 'integer',
        'marks' => 'float',
        'negative_marks' => 'float',
    ];
}
