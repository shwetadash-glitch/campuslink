<?php
namespace App\Services;

use App\Models\Student;
use App\Models\Job;
use App\Models\SkillGap;
use App\Enums\GapSeverity;

class SkillGapService
{
    private const PROFICIENCY_LEVELS = [
        'BEGINNER' => 1,
        'INTERMEDIATE' => 2,
        'ADVANCED' => 3,
        'EXPERT' => 4,
    ];

    public function analyzeSkillGaps(Student $student, Job $job)
    {
        $student->load('skills.skill');
        $job->load(['requirements.skill', 'company']);

        $studentSkills = $student->skills->keyBy('skill_id');
        
        $matched_skills = [];
        $partial_skills = [];
        $missing_skills = [];
        $gap_records = [];

        $total_mandatory_weight = 0;
        $earned_mandatory_weight = 0;
        $total_preferred_weight = 0;
        $earned_preferred_weight = 0;

        foreach ($job->requirements as $req) {
            $reqLevel = self::PROFICIENCY_LEVELS[$req->required_proficiency->value];
            $studentSkill = $studentSkills->get($req->skill_id);
            $studentLevel = $studentSkill ? self::PROFICIENCY_LEVELS[$studentSkill->proficiency_level->value] : 0;
            
            $weight = $req->weight ?? 1.0;

            if ($req->is_mandatory) {
                $total_mandatory_weight += $weight;
            } else {
                $total_preferred_weight += $weight;
            }

            $diff = $reqLevel - $studentLevel;
            $severity = GapSeverity::NONE;
            $status = 'MATCHED';

            if ($diff > 0) {
                if ($studentLevel === 0) {
                    $severity = $req->is_mandatory ? GapSeverity::CRITICAL : GapSeverity::HIGH;
                    $status = 'MISSING';
                } else {
                    $severity = $diff >= 2 ? GapSeverity::HIGH : GapSeverity::MEDIUM;
                    $status = 'PARTIAL';
                }
            }

            $recommendation = $severity !== GapSeverity::NONE ? 
                $this->generateRecommendation($req->skill->name, $req->required_proficiency->value, $severity) : 
                "Proficiency meets or exceeds requirements.";

            $item = [
                'skill_id' => $req->skill_id,
                'skill_name' => $req->skill->name,
                'required_proficiency' => $req->required_proficiency->value,
                'student_proficiency' => $studentSkill ? $studentSkill->proficiency_level->value : null,
                'severity' => $severity->value,
                'is_mandatory' => $req->is_mandatory,
                'recommendation' => $recommendation
            ];

            if ($status === 'MATCHED') {
                $matched_skills[] = $item;
                $earned = $weight;
            } elseif ($status === 'PARTIAL') {
                $partial_skills[] = $item;
                $earned = $weight * ($studentLevel / $reqLevel);
            } else {
                $missing_skills[] = $item;
                $earned = 0;
            }

            if ($req->is_mandatory) {
                $earned_mandatory_weight += $earned;
            } else {
                $earned_preferred_weight += $earned;
            }

            if ($severity !== GapSeverity::NONE) {
                $gap_records[] = [
                    'skill_id' => $req->skill_id,
                    'skill_name' => $req->skill->name,
                    'required_level' => $reqLevel,
                    'current_level' => $studentLevel > 0 ? $studentLevel : null,
                    'required_proficiency' => $req->required_proficiency->value,
                    'student_proficiency' => $studentSkill ? $studentSkill->proficiency_level->value : null,
                    'gap_severity' => $severity->value,
                    'is_mandatory' => $req->is_mandatory,
                    'status' => $status,
                    'recommendation' => $recommendation
                ];
            }
        }

        $mandatory_score = $total_mandatory_weight > 0 ? ($earned_mandatory_weight / $total_mandatory_weight * 100.0) : 100.0;
        $preferred_score = $total_preferred_weight > 0 ? ($earned_preferred_weight / $total_preferred_weight * 100.0) : 100.0;
        
        $readinessService = app(\App\Services\ReadinessScoringService::class);
        $global = $readinessService->calculateReadiness($student);
        $global_score = $global['overall_score'];

        $job_readiness_score = round(($mandatory_score * 0.60) + ($preferred_score * 0.20) + ($global_score * 0.20), 1);

        // Persist gaps
        SkillGap::where('student_id', $student->id)->where('job_id', $job->id)->delete();
        foreach ($gap_records as $g) {
            SkillGap::create([
                'student_id' => $student->id,
                'job_id' => $job->id,
                'skill_id' => $g['skill_id'],
                'gap_severity' => $g['gap_severity'],
                'current_level' => $g['current_level'],
                'required_level' => $g['required_level'],
                'is_mandatory' => $g['is_mandatory'],
                'recommendation' => $g['recommendation'],
            ]);
        }

        return [
            'job_id' => $job->id,
            'job_title' => $job->title,
            'company_id' => $job->company_id,
            'company_name' => $job->company ? $job->company->name : null,
            'job_readiness_score' => $job_readiness_score,
            'global_readiness_score' => $global_score,
            'mandatory_skills_score' => round($mandatory_score, 1),
            'preferred_skills_score' => round($preferred_score, 1),
            'total_requirements' => count($job->requirements),
            'matched_count' => count($matched_skills),
            'partial_count' => count($partial_skills),
            'missing_count' => count($missing_skills),
            'matched_skills' => $matched_skills,
            'partial_skills' => $partial_skills,
            'missing_skills' => $missing_skills,
            'gaps' => $gap_records,
            'analysis_version' => 'v1.0',
            'analyzed_at' => now()->toIso8601String()
        ];
    }

    private function generateRecommendation($skillName, $reqProf, $severity)
    {
        if ($severity === GapSeverity::CRITICAL) {
            return "Critical missing skill: {$skillName}. Requires immediate foundational learning.";
        } elseif ($severity === GapSeverity::HIGH) {
            return "High gap in {$skillName}. Significant upskilling required to reach {$reqProf}.";
        }
        return "Moderate gap in {$skillName}. Needs practical experience to improve proficiency.";
    }
}
