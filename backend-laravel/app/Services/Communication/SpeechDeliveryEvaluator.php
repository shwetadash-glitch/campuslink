<?php

namespace App\Services\Communication;

class SpeechDeliveryEvaluator
{
    public const FILLER_DICTIONARY = [
        'um',
        'uh',
        'like',
        'basically',
        'you know',
        'sort of',
        'kind of',
        'actually',
        'literally',
        'i mean',
        'right',
        'honestly',
    ];

    public const SIGNPOSTING_MARKERS = [
        'first',
        'firstly',
        'second',
        'secondly',
        'to begin with',
        'consequently',
        'furthermore',
        'in contrast',
        'specifically',
        'for example',
        'for instance',
        'in summary',
        'in conclusion',
        'to summarize',
        'as a result',
        'on the other hand',
        'the main reason',
    ];

    /**
     * Analyze transcript and audio telemetry to extract deterministic acoustic metrics.
     */
    public function analyzeAcoustics(string $transcript, float $durationSeconds, ?array $clientTelemetry = null): array
    {
        $durationSeconds = max(1.0, $durationSeconds);
        $durationMinutes = $durationSeconds / 60.0;

        // Split words
        $words = preg_split('/\s+/', trim($transcript), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $wordCount = count($words);

        // Words Per Minute (WPM)
        $wpm = $durationMinutes > 0 ? (int) round($wordCount / $durationMinutes) : 0;

        // Pacing Assessment
        $pacingAssessment = $this->assessPacing($wpm);

        // Analyze fillers
        $fillerData = $this->extractFillers($transcript, $durationSeconds, $words);

        // Silence duration
        $silenceDuration = $clientTelemetry['silence_duration_seconds'] ?? null;
        if ($silenceDuration === null) {
            // Estimate silence based on average speaking rate of 140 WPM
            $expectedDurationForWords = ($wordCount / 140.0) * 60.0;
            $silenceDuration = max(0.0, round($durationSeconds - $expectedDurationForWords, 1));
            // Cap silence to reasonable range (max 30% of total)
            $silenceDuration = min($durationSeconds * 0.35, $silenceDuration);
        } else {
            $silenceDuration = round((float) $silenceDuration, 1);
        }

        $fillerDensity = $wordCount > 0 ? round(($fillerData['total_count'] / $wordCount) * 100, 1) : 0.0;

        return [
            'words_per_minute' => $wpm,
            'pacing_assessment' => $pacingAssessment,
            'total_speaking_duration_seconds' => round($durationSeconds, 1),
            'silence_duration_seconds' => $silenceDuration,
            'filler_words_detected' => $fillerData['detected_groups'],
            'filler_density_percentage' => $fillerDensity,
            'total_word_count' => $wordCount,
        ];
    }

    /**
     * Categorize WPM against optimal executive coaching velocity band (130-155 WPM).
     */
    public function assessPacing(int $wpm): string
    {
        if ($wpm >= 130 && $wpm <= 155) {
            return 'OPTIMAL';
        }
        if ($wpm >= 115 && $wpm < 130) {
            return 'SLIGHTLY_SLOW';
        }
        if ($wpm > 155 && $wpm <= 170) {
            return 'SLIGHTLY_FAST';
        }
        if ($wpm < 115) {
            return 'TOO_SLOW';
        }
        return 'TOO_FAST';
    }

    /**
     * Calculate 5-pillar delivery scores from acoustics and transcript.
     */
    public function calculateDeliveryScores(array $acousticAnalytics, string $transcript, string $category): array
    {
        $wpm = $acousticAnalytics['words_per_minute'] ?? 140;
        $fillerDensity = $acousticAnalytics['filler_density_percentage'] ?? 0.0;
        $duration = $acousticAnalytics['total_speaking_duration_seconds'] ?? 60.0;
        $silence = $acousticAnalytics['silence_duration_seconds'] ?? 5.0;

        // 1. Pacing & Fluency Score (0-100)
        // Optimal: 130 - 155 WPM
        if ($wpm >= 130 && $wpm <= 155) {
            $pacingScore = 95 - abs($wpm - 142) * 0.5;
        } elseif ($wpm >= 115 && $wpm < 130) {
            $pacingScore = 80 + ($wpm - 115) * 1.0;
        } elseif ($wpm > 155 && $wpm <= 175) {
            $pacingScore = 85 - ($wpm - 155) * 0.8;
        } elseif ($wpm < 115) {
            $pacingScore = max(40, 50 + ($wpm - 70) * 0.7);
        } else {
            $pacingScore = max(40, 70 - ($wpm - 175) * 0.9);
        }

        // Deduct for excessive silence (> 25% of audio)
        $silenceRatio = $duration > 0 ? ($silence / $duration) : 0;
        if ($silenceRatio > 0.25) {
            $pacingScore -= min(20, ($silenceRatio - 0.25) * 60);
        }
        $pacingScore = round(max(35, min(98, $pacingScore)), 1);

        // 2. Filler Word Control Score (0-100)
        // <1% -> 92-98
        // 1-2% -> 82-91
        // 2-4% -> 70-81
        // 4-6% -> 55-69
        // >6% -> 35-54
        if ($fillerDensity < 1.0) {
            $fillerScore = 98 - ($fillerDensity * 6);
        } elseif ($fillerDensity < 2.0) {
            $fillerScore = 91 - (($fillerDensity - 1.0) * 9);
        } elseif ($fillerDensity < 4.0) {
            $fillerScore = 81 - (($fillerDensity - 2.0) * 5.5);
        } elseif ($fillerDensity < 6.0) {
            $fillerScore = 69 - (($fillerDensity - 4.0) * 7);
        } else {
            $fillerScore = max(35, 54 - (($fillerDensity - 6.0) * 4));
        }
        $fillerScore = round(max(30, min(99, $fillerScore)), 1);

        // 3. Structural Signposting (0-100)
        $lower = strtolower($transcript);
        $signpostsFound = 0;
        foreach (self::SIGNPOSTING_MARKERS as $marker) {
            if (str_contains($lower, $marker)) {
                $signpostsFound++;
            }
        }
        // Base signpost score
        if ($signpostsFound >= 4) {
            $signpostScore = 92;
        } elseif ($signpostsFound === 3) {
            $signpostScore = 85;
        } elseif ($signpostsFound === 2) {
            $signpostScore = 78;
        } elseif ($signpostsFound === 1) {
            $signpostScore = 70;
        } else {
            $signpostScore = 62;
        }

        // Category specific boost / tuning
        if ($category === 'STRUCTURED_SPEAKING' && $signpostsFound >= 2) {
            $signpostScore = min(96, $signpostScore + 4);
        }

        // 4. Vocal Confidence & Clarity (0-100)
        // Synthesized from fluency, low filler density, and proper word flow
        $confidenceScore = round(($pacingScore * 0.5) + ($fillerScore * 0.5), 1);
        if ($duration >= 45.0 && $duration <= 180.0) {
            $confidenceScore = min(98, $confidenceScore + 2);
        }

        // 5. Audience Adaptation (Delivery Dimension)
        $audienceAdaptationScore = round(($confidenceScore * 0.4) + ($signpostScore * 0.6), 1);

        return [
            'pacing_fluency' => $pacingScore,
            'filler_word_control' => $fillerScore,
            'structural_signposting' => $signpostScore,
            'vocal_confidence_clarity' => $confidenceScore,
            'audience_adaptation' => $audienceAdaptationScore,
        ];
    }

    /**
     * Map composite score to the 5-Tier E-to-D Executive Grading Scale.
     * E: Exemplary (90% - 100%)
     * A: Accomplished (80% - 89.9%)
     * P: Proficient (70% - 79.9%)
     * C: Developing (60% - 69.9%)
     * D: Deficient (Below 60%)
     */
    public function calculateGradeTier(float $compositeScore): array
    {
        if ($compositeScore >= 90.0) {
            return [
                'tier' => 'E',
                'label' => 'Exemplary',
                'description' => 'Exceptional flow, optimal pacing (130-155 WPM), minimal filler words, crisp articulation, and authoritative yet accessible tone.',
            ];
        }
        if ($compositeScore >= 80.0) {
            return [
                'tier' => 'A',
                'label' => 'Accomplished',
                'description' => 'Highly fluent and clear, well-paced (120-165 WPM), infrequent filler words, solid structure with smooth transitions.',
            ];
        }
        if ($compositeScore >= 70.0) {
            return [
                'tier' => 'P',
                'label' => 'Proficient',
                'description' => 'Understandable delivery, acceptable pacing, noticeable filler words, occasional hesitation, with room for tighter structure.',
            ];
        }
        if ($compositeScore >= 60.0) {
            return [
                'tier' => 'C',
                'label' => 'Developing',
                'description' => 'Inconsistent pacing, frequent filler words or awkward pauses, disorganized thought progression needing guided practice.',
            ];
        }
        return [
            'tier' => 'D',
            'label' => 'Deficient',
            'description' => 'Strained delivery, heavy hesitation (>6% filler words), excessive long silences, severe disorganization requiring foundational drills.',
        ];
    }

    /**
     * Detect structural framework usage (PREP or STAR) in spoken transcript.
     */
    public function detectStructuralFramework(string $transcript, string $category): array
    {
        $lower = strtolower($transcript);

        // Check PREP: Point, Reason, Example, Point
        $hasPoint = str_contains($lower, 'point') || str_contains($lower, 'believe') || str_contains($lower, 'recommend') || str_contains($lower, 'proposal');
        $hasReason = str_contains($lower, 'because') || str_contains($lower, 'reason') || str_contains($lower, 'due to') || str_contains($lower, 'since');
        $hasExample = str_contains($lower, 'example') || str_contains($lower, 'for instance') || str_contains($lower, 'case in point') || str_contains($lower, 'specifically');
        $hasPointRecap = str_contains($lower, 'therefore') || str_contains($lower, 'in conclusion') || str_contains($lower, 'summary') || str_contains($lower, 'thus');

        // Check STAR: Situation, Task, Action, Result
        $hasSituation = str_contains($lower, 'situation') || str_contains($lower, 'when i') || str_contains($lower, 'at the time') || str_contains($lower, 'context');
        $hasTask = str_contains($lower, 'task') || str_contains($lower, 'challenge') || str_contains($lower, 'needed to') || str_contains($lower, 'goal');
        $hasAction = str_contains($lower, 'action') || str_contains($lower, 'i decided to') || str_contains($lower, 'we implemented') || str_contains($lower, 'i initiated');
        $hasResult = str_contains($lower, 'result') || str_contains($lower, 'outcome') || str_contains($lower, 'impact') || str_contains($lower, 'achieved');

        $starScore = ($hasSituation ? 1 : 0) + ($hasTask ? 1 : 0) + ($hasAction ? 1 : 0) + ($hasResult ? 1 : 0);
        $prepScore = ($hasPoint ? 1 : 0) + ($hasReason ? 1 : 0) + ($hasExample ? 1 : 0) + ($hasPointRecap ? 1 : 0);

        if ($starScore > $prepScore && $starScore >= 2) {
            return [
                'framework_used' => 'STAR',
                'situation_clarity' => $hasSituation ? 'Context clearly framed.' : 'Situation could be more specifically situated.',
                'task_definition' => $hasTask ? 'Challenge and responsibilities were well delineated.' : 'Objective could be sharpened.',
                'action_execution' => $hasAction ? 'Concrete individual and team actions were articulated.' : 'Detail actionable steps more clearly.',
                'result_impact' => $hasResult ? 'Measured outcome or qualitative results highlighted.' : 'Reiterate business or technical impact in closing.',
            ];
        }

        return [
            'framework_used' => 'PREP',
            'point_clarity' => $hasPoint ? 'Opening thesis statement clearly established.' : 'Open directly with your core stance or architectural recommendation.',
            'reason_validity' => $hasReason ? 'Underlying rationale and drivers logically explained.' : 'Ground the recommendation with concrete trade-off rationale.',
            'example_effectiveness' => $hasExample ? 'Practical example or scenario grounded the explanation.' : 'Incorporate a brief real-world or production scenario analogy.',
            'point_recap' => $hasPointRecap ? 'Clean closing takeaway summarized.' : 'Reiterate your core takeaway in a decisive concluding sentence.',
        ];
    }

    /**
     * Generate grounded speech drills based on acoustic analytics and delivery scores.
     */
    public function generateSpeechDrills(array $acousticAnalytics, array $deliveryScores): array
    {
        $drills = [];

        $pacing = $acousticAnalytics['pacing_assessment'] ?? 'OPTIMAL';
        $wpm = $acousticAnalytics['words_per_minute'] ?? 140;
        $fillerDensity = $acousticAnalytics['filler_density_percentage'] ?? 0;

        if ($pacing === 'TOO_FAST' || $wpm > 165) {
            $drills[] = "Pacing Calibration: Practice deliberate 1-second cadence intervals after key technical terms to allow executive stakeholders to digest complex architecture.";
        } elseif ($pacing === 'TOO_SLOW' || $wpm < 115) {
            $drills[] = "Momentum Building: Rehearse speaking in continuous 3-sentence blocks without dropping vocal projection between ideas.";
        }

        if ($fillerDensity > 2.0) {
            $drills[] = "The 3-Second Breath Pause: Whenever you feel the urge to vocalize 'um' or 'basically', replace it with silent exhalation before resuming your point.";
        }

        if (($deliveryScores['structural_signposting'] ?? 80) < 75) {
            $drills[] = "Verbal Signposting Drill: Open each transition with overt navigation phrases (e.g. 'First, examining the bottleneck...', 'Consequently, our architecture requires...').";
        }

        if (empty($drills)) {
            $drills[] = "Executive Polish: Continue refining tone modulation to highlight key trade-offs with vocal inflection.";
            $drills[] = "Impromptu Drill: Practice explaining a core data structure to a non-technical peer in under 90 seconds.";
        }

        return array_slice($drills, 0, 3);
    }

    /**
     * Extract filler occurrences and estimate timestamps.
     */
    protected function extractFillers(string $transcript, float $durationSeconds, array $words): array
    {
        $lower = strtolower($transcript);
        $totalWords = max(1, count($words));
        $secondsPerWord = $durationSeconds / $totalWords;

        $detectedGroups = [];
        $totalCount = 0;

        foreach (self::FILLER_DICTIONARY as $filler) {
            // Count instances using word boundary regex
            $pattern = '/\b' . preg_quote($filler, '/') . '\b/i';
            preg_match_all($pattern, $transcript, $matches, PREG_OFFSET_CAPTURE);

            $count = count($matches[0] ?? []);
            if ($count > 0) {
                $totalCount += $count;
                $timestamps = [];

                foreach ($matches[0] as $match) {
                    $charOffset = $match[1];
                    // Approximate word position by character offset ratio
                    $ratio = strlen($transcript) > 0 ? ($charOffset / strlen($transcript)) : 0;
                    $approxSeconds = round($ratio * $durationSeconds);
                    $mins = (int) floor($approxSeconds / 60);
                    $secs = (int) ($approxSeconds % 60);
                    $timestamps[] = sprintf('%02d:%02d', $mins, $secs);
                }

                $detectedGroups[] = [
                    'word' => $filler,
                    'count' => $count,
                    'timestamp_instances' => array_slice($timestamps, 0, 5),
                ];
            }
        }

        // Sort by highest count
        usort($detectedGroups, fn($a, $b) => $b['count'] <=> $a['count']);

        return [
            'total_count' => $totalCount,
            'detected_groups' => $detectedGroups,
        ];
    }
}
