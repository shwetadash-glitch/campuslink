<?php
namespace App\Services;

use App\Models\Student;
use App\Models\StudentScore;
use App\Enums\ReadinessLevel;

class ReadinessScoringService
{
    private const WEIGHTS = [
        'academic' => 0.20,
        'technical' => 0.30,
        'projects' => 0.15,
        'certifications' => 0.10,
        'assessments' => 0.10,
        'communication' => 0.10,
        'interview' => 0.05
    ];

    private const PROFICIENCY_SCORES = [
        'BEGINNER' => 25.0,
        'INTERMEDIATE' => 50.0,
        'ADVANCED' => 75.0,
        'EXPERT' => 100.0,
    ];

    public function calculateReadiness(Student $student)
    {
        $student->loadMissing(['skills.skill', 'projects', 'certifications', 'assessments']);
        
        $academic = $this->normalizeAcademic($student);
        $technical = $this->normalizeTechnicalSkills($student);
        $projects = $this->normalizeProjects($student);
        $certs = $this->normalizeCertifications($student);
        $assessments = $this->normalizeAssessments($student);
        
        // Use defaults for missing optional metrics to maintain denominator, or re-weight.
        // The python implementation handles missing ones by falling back to averages or 0 depending.
        // Assuming simple sum for parity, treating missing communication/interview as 0 or skipped.
        $comm = $this->normalizeCommunication($student);
        $interview = $this->normalizeInterview($student);

        $totalScore = 0.0;
        $activeWeights = 0.0;

        $metrics = [
            'academic' => $academic,
            'technical' => $technical,
            'projects' => $projects,
            'certifications' => $certs,
            'assessments' => $assessments,
            'communication' => $comm,
            'interview' => $interview
        ];

        foreach ($metrics as $key => $result) {
            if ($result['score'] !== null) {
                $totalScore += $result['score'] * self::WEIGHTS[$key];
                $activeWeights += self::WEIGHTS[$key];
            }
        }

        $finalScore = $activeWeights > 0 ? ($totalScore / $activeWeights) : 0.0;
        $level = $this->determineLevel($finalScore);

        $final_components = [];
        $effective_weights = [];
        $available_dimensions = [];
        $missing_dimensions = [];
        $all_strengths = [];
        $all_weaknesses = [];

        foreach ($metrics as $key => $result) {
            $all_strengths = array_merge($all_strengths, $result['strengths']);
            $all_weaknesses = array_merge($all_weaknesses, $result['weaknesses']);
            
            if ($result['score'] !== null) {
                $available_dimensions[] = $key;
                $final_components[$key] = round($result['score'], 1);
                $effective_weights[$key] = round(self::WEIGHTS[$key] / $activeWeights, 4);
            } else {
                $missing_dimensions[] = $key;
                $final_components[$key] = 0.0;
            }
        }

        if (count($missing_dimensions) > 0) {
            $all_weaknesses[] = "Unassessed institutional components (" . implode(', ', $missing_dimensions) . "). Completing institutional tests will provide further verification.";
        }

        // Ensure we always provide at least a couple of growth areas for high achievers
        if (count($all_weaknesses) < 2) {
            $sorted_components = $final_components;
            asort($sorted_components);
            
            foreach ($sorted_components as $dim => $score) {
                if (count($all_weaknesses) >= 2) break;
                if ($score >= 95.0) continue; // Don't recommend growth for near-perfect scores unless necessary
                
                $dimNames = [
                    'academic' => 'Academic Foundation',
                    'technical' => 'Technical Skills',
                    'projects' => 'Applied Projects',
                    'certifications' => 'Industry Certifications',
                    'assessments' => 'Standardized Assessments',
                    'communication' => 'Communication & Soft Skills',
                    'interview' => 'Mock Interviews & Aptitude'
                ];
                $name = $dimNames[$dim] ?? ucfirst($dim);
                
                if ($dim === 'technical') {
                    $all_weaknesses[] = "Technical Skills Mastery can be elevated by acquiring more Expert-level proficiencies.";
                } elseif ($dim === 'communication') {
                    $all_weaknesses[] = "Communication & Soft Skills can be further polished through advanced leadership or speaking roles.";
                } else {
                    $all_weaknesses[] = "Opportunity to further optimize {$name} to reach the top-tier 100% benchmark.";
                }
            }
        }

        $explanation = [
            'overall_score' => round($finalScore, 1),
            'readiness_level' => $level->value,
            'components' => $final_components,
            'configured_weights' => self::WEIGHTS,
            'effective_weights' => $effective_weights,
            'strengths' => $all_strengths,
            'weaknesses' => $all_weaknesses,
            'data_quality' => [
                'completeness_ratio' => round(count($available_dimensions) / count($metrics), 2),
                'available_dimensions' => $available_dimensions,
                'missing_dimensions' => $missing_dimensions,
                'weights_redistributed' => count($missing_dimensions) > 0
            ],
            'model_version' => 'v1.0',
            'calculated_at' => now()->toIso8601String()
        ];

        StudentScore::updateOrCreate(
            ['student_id' => $student->id, 'score_type' => 'READINESS_V1'],
            [
                'score_value' => $finalScore,
                'model_version' => 'v1.0',
                'explanation_data' => $explanation
            ]
        );

        return $explanation;
    }

    private function determineLevel(float $score): ReadinessLevel
    {
        if ($score >= 80.0) return ReadinessLevel::HIGHLY_EMPLOYABLE;
        if ($score >= 60.0) return ReadinessLevel::READY;
        if ($score >= 40.0) return ReadinessLevel::DEVELOPING;
        return ReadinessLevel::NOT_READY;
    }

    private function normalizeAcademic(Student $student): array
    {
        $strengths = []; $weaknesses = [];
        if ($student->cgpa === null) {
            $weaknesses[] = "Academic CGPA record is missing.";
            return ['score' => 0.0, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        $base = min(100.0, max(0.0, ($student->cgpa / 10.0) * 100.0));
        
        $active_backlogs = $student->backlogs_current ?? 0;
        $hist_backlogs = $student->backlogs_history ?? 0;
        
        $metadata = $student->profile_metadata ?? [];
        $active_backlogs = $metadata['active_backlogs'] ?? $active_backlogs;
        $hist_backlogs = $metadata['backlogs_history'] ?? $hist_backlogs;

        $penalty = ($active_backlogs * 15.0) + ($hist_backlogs * 5.0);
        $final = max(0.0, min(100.0, $base - $penalty));

        if ($student->cgpa >= 8.5 && $active_backlogs == 0) {
            $strengths[] = sprintf("Outstanding academic record (CGPA %.2f) with zero backlogs.", $student->cgpa);
        } elseif ($student->cgpa >= 7.5 && $active_backlogs == 0) {
            $strengths[] = sprintf("Consistent academic performance (CGPA %.2f) with clear record.", $student->cgpa);
        }

        if ($active_backlogs > 0) {
            $weaknesses[] = "{$active_backlogs} active backlog(s) negatively impact placement eligibility.";
        }
        if ($student->cgpa < 6.5) {
            $weaknesses[] = sprintf("CGPA %.2f is below standard competitive placement thresholds.", $student->cgpa);
        }

        return ['score' => $final, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }

    private function normalizeTechnicalSkills(Student $student): array
    {
        $strengths = []; $weaknesses = [];
        $techSkills = $student->skills->filter(function($s) {
            return !$s->skill || $s->skill->category !== 'Soft Skill';
        });

        if ($techSkills->isEmpty()) {
            $weaknesses[] = "No technical skills registered on profile.";
            return ['score' => 0.0, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        $scores = [];
        foreach ($techSkills as $ss) {
            $score = self::PROFICIENCY_SCORES[$ss->proficiency_level->value] ?? 25.0;
            if ($ss->source && in_array($ss->source->value, ['ASSESSMENT', 'CERTIFICATION', 'VERIFIED'])) {
                $score = min(100.0, $score + 10.0);
            }
            $scores[] = $score;
        }

        $avg = array_sum($scores) / count($scores);
        $breadth = min(1.0, 0.45 + (0.15 * count($techSkills)));
        $final = max(0.0, min(100.0, $avg * $breadth));

        $advancedSkills = [];
        foreach ($techSkills as $ss) {
            if ($ss->skill && in_array($ss->proficiency_level->value, ['ADVANCED', 'EXPERT'])) {
                $advancedSkills[] = $ss->skill->name;
            }
        }

        if (!empty($advancedSkills)) {
            $strengths[] = "Advanced proficiency demonstrated in: " . implode(', ', array_slice($advancedSkills, 0, 3)) . ".";
        }

        if (count($techSkills) >= 4) {
            $strengths[] = "Solid technical skill breadth with " . count($techSkills) . " skills registered.";
        } elseif (count($techSkills) <= 2) {
            $weaknesses[] = "Limited technical skill breadth (only " . count($techSkills) . " registered). Adding more skills will improve readiness.";
        }

        // Additional weakness if score is particularly low
        if ($final < 65.0) {
            $weaknesses[] = "Overall technical mastery is below target thresholds. Focus on advancing beginner/intermediate skills.";
        }

        return ['score' => $final, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }

    private function normalizeProjects(Student $student): array
    {
        $strengths = []; $weaknesses = [];
        $count = $student->projects->count();
        
        if ($count === 0) {
            $weaknesses[] = "No applied projects registered.";
            return ['score' => 0.0, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        $base = min(100.0, 40.0 + ($count * 20.0));
        
        if ($count >= 3) {
            $strengths[] = "Excellent portfolio with multiple applied projects.";
        } else {
            $weaknesses[] = "Limited project portfolio. Adding more projects increases readiness.";
        }

        return ['score' => $base, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }

    private function normalizeCertifications(Student $student): array
    {
        $strengths = []; $weaknesses = [];
        $count = $student->certifications->count();
        
        if ($count === 0) {
            $weaknesses[] = "No industry certifications.";
            return ['score' => 0.0, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        $base = min(100.0, 50.0 + ($count * 25.0));
        $strengths[] = "Verified industry certifications enhance employability.";
        
        return ['score' => $base, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }

    private function normalizeAssessments(Student $student): array
    {
        $strengths = []; $weaknesses = [];
        
        $validAssessments = $student->assessments->filter(function($a) {
            $type = strtolower($a->assessment_type);
            return \Str::contains($type, ['coding', 'technical', 'aptitude', 'cognitive', 'quant']);
        });

        if ($validAssessments->isEmpty()) {
            return ['score' => null, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        $scores = [];
        foreach ($validAssessments as $a) {
            if ($a->max_score > 0) {
                $scores[] = ($a->score / $a->max_score) * 100.0;
            }
        }

        if (empty($scores)) {
            return ['score' => null, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        $avg = array_sum($scores) / count($scores);
        if ($avg >= 75.0) {
            $strengths[] = "Strong performance in standardized technical/aptitude assessments (" . round($avg, 1) . "%).";
        } elseif ($avg < 50.0) {
            $weaknesses[] = "Assessment average (" . round($avg, 1) . "%) is below expected placement benchmarks.";
        }

        return ['score' => $avg, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }

    private function normalizeCommunication(Student $student): array
    {
        $strengths = []; $weaknesses = [];

        // 1. Check assessments
        $commAssessments = $student->assessments->filter(function($a) {
            $type = strtolower($a->assessment_type);
            return \Str::contains($type, ['communication', 'soft skill', 'verbal', 'english']);
        });

        if ($commAssessments->isNotEmpty()) {
            $scores = [];
            foreach ($commAssessments as $a) {
                if ($a->max_score > 0) {
                    $scores[] = ($a->score / $a->max_score) * 100.0;
                }
            }
            if (!empty($scores)) {
                $avg = array_sum($scores) / count($scores);
                if ($avg >= 75.0) {
                    $strengths[] = "High verbal and communication assessment scores.";
                } elseif ($avg < 60.0) {
                    $weaknesses[] = "Communication and verbal assessment scores are below expected placement benchmarks.";
                }
                return ['score' => $avg, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
            }
        }

        // 2. Check student soft skills
        $commSkills = $student->skills->filter(function($s) {
            return $s->skill && ($s->skill->category === 'Soft Skill' || \Str::contains(strtolower($s->skill->name), 'communication'));
        });
        
        if ($commSkills->isEmpty()) {
            return ['score' => null, 'strengths' => [], 'weaknesses' => []];
        }
        
        $scores = [];
        foreach ($commSkills as $ss) {
            $scores[] = self::PROFICIENCY_SCORES[$ss->proficiency_level->value] ?? 50.0;
        }
        
        $avg = max(0.0, min(100.0, array_sum($scores) / count($scores)));
        if ($avg >= 75.0) {
            $strengths[] = "Strong verified soft skills.";
        }
        
        return ['score' => $avg, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }

    private function normalizeInterview(Student $student): array
    {
        $strengths = []; $weaknesses = [];
        
        $interviewAssessments = $student->assessments->filter(function($a) {
            $type = strtolower($a->assessment_type);
            return \Str::contains($type, ['interview', 'mock']);
        });

        if ($interviewAssessments->isNotEmpty()) {
            $scores = [];
            foreach ($interviewAssessments as $a) {
                if ($a->max_score > 0) {
                    $scores[] = ($a->score / $a->max_score) * 100.0;
                }
            }
            if (!empty($scores)) {
                $avg = array_sum($scores) / count($scores);
                if ($avg >= 75.0) {
                    $strengths[] = "Strong mock interview performance (" . round($avg, 1) . "%).";
                } elseif ($avg < 60.0) {
                    $weaknesses[] = "Mock interview scores indicate room for communication and problem-solving polish.";
                }
                return ['score' => $avg, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
            }
        }

        if (is_array($student->profile_metadata) && isset($student->profile_metadata['mock_interview_score'])) {
            $score = floatval($student->profile_metadata['mock_interview_score']);
            $score = max(0.0, min(100.0, $score));
            return ['score' => $score, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
        }

        return ['score' => null, 'strengths' => $strengths, 'weaknesses' => $weaknesses];
    }
}
