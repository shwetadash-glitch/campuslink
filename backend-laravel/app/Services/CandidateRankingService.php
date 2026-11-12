<?php

namespace App\Services;

use App\Models\Student;
use App\Models\Job;
use App\Enums\ProficiencyLevel;

class CandidateRankingService
{
    private const PROFICIENCY_LEVELS = [
        'BEGINNER' => 1,
        'INTERMEDIATE' => 2,
        'ADVANCED' => 3,
        'EXPERT' => 4,
    ];

    /**
     * Map proficiency enum or string to integer 1..4
     */
    public static function getProficiencyLevel(mixed $level): int
    {
        if ($level instanceof ProficiencyLevel) {
            $level = $level->value;
        }
        if (is_string($level)) {
            return self::PROFICIENCY_LEVELS[strtoupper(trim($level))] ?? 0;
        }
        if (is_numeric($level)) {
            return (int) $level;
        }
        return 0;
    }

    /**
     * Calculate Recruiter-Centric Radar Fit & Overlap Index
     *
     * JFS = (sum(Wi * Covi) / sum(Wi)) * 100%
     * FitScore = 0.70 * JFS + 0.20 * MandatoryRatio + 0.10 * GlobalReadiness
     */
    public function calculateRadarFit(Student $student, Job $job, float $globalReadiness = 0.0): array
    {
        $studentSkills = $student->relationLoaded('skills') ? $student->skills : $student->skills()->with('skill')->get();
        $studentSkillsBySkillId = [];
        $studentSkillsByName = [];

        foreach ($studentSkills as $ss) {
            if ($ss->skill_id) {
                $studentSkillsBySkillId[$ss->skill_id] = $ss;
            }
            if ($ss->skill && $ss->skill->name) {
                $studentSkillsByName[strtolower(trim($ss->skill->name))] = $ss;
            }
        }

        $requirements = $job->relationLoaded('requirements') ? $job->requirements : $job->requirements()->with('skill')->get();

        $radarData = [];
        $totalWeightedCov = 0.0;
        $totalWeight = 0.0;
        $mandatoryCount = 0;
        $mandatoryMetCount = 0;

        foreach ($requirements as $req) {
            $skillName = $req->skill ? $req->skill->name : "Skill #{$req->skill_id}";
            $rLevel = max(1, min(4, self::getProficiencyLevel($req->required_proficiency)));

            $studentSkill = $studentSkillsBySkillId[$req->skill_id] 
                ?? ($studentSkillsByName[strtolower(trim($skillName))] ?? null);

            $cLevel = $studentSkill ? self::getProficiencyLevel($studentSkill->proficiency_level) : 0;
            $cLevel = max(0, min(4, $cLevel));

            $isMandatory = (bool) $req->is_mandatory;
            $weight = $isMandatory ? 1.0 : 0.5;

            // Trait Coverage Ratio: min(1.0, Ci / Ri)
            $cov = min(1.0, (float) $cLevel / (float) $rLevel);

            $radarData[] = [
                'subject' => $skillName,
                'required' => $rLevel,
                'actual' => $cLevel,
                'fullMark' => 4,
                'mandatory' => $isMandatory,
            ];

            $totalWeightedCov += $weight * $cov;
            $totalWeight += $weight;

            if ($isMandatory) {
                $mandatoryCount++;
                if ($cLevel >= $rLevel) {
                    $mandatoryMetCount++;
                }
            }
        }

        // Weighted Job Fit Score (JFS)
        $jfs = $totalWeight > 0.0 
            ? ($totalWeightedCov / $totalWeight) * 100.0 
            : 100.0;

        // Zero-Defect Mandatory Skills Ratio
        $mandatoryRatio = $mandatoryCount > 0 
            ? ((float) $mandatoryMetCount / (float) $mandatoryCount) * 100.0 
            : 100.0;

        // Blended Radar Fit Score (Do NOT roundoff to integer)
        if ($totalWeight > 0.0) {
            $fitScore = (0.70 * $jfs) + (0.20 * $mandatoryRatio) + (0.10 * $globalReadiness);
        } else {
            $fitScore = $globalReadiness;
        }

        return [
            'fit_score' => round($fitScore, 1),
            'job_fit_score' => round($jfs, 1),
            'mandatory_ratio' => round($mandatoryRatio, 1),
            'mandatory_met_count' => $mandatoryMetCount,
            'mandatory_total_count' => $mandatoryCount,
            'readiness_score' => round($globalReadiness, 1),
            'radar_data' => $radarData,
        ];
    }

    /**
     * Deterministic Multi-Stage Candidate Ranking
     */
    public function rankCandidates(array $candidates): array
    {
        usort($candidates, function ($a, $b) {
            // Stage 1: Hard Eligibility (Eligible candidates strictly outrank ineligible)
            $aEligible = (bool) ($a['is_eligible'] ?? false);
            $bEligible = (bool) ($b['is_eligible'] ?? false);
            if ($aEligible !== $bEligible) {
                return $bEligible ? 1 : -1;
            }

            // Stage 2: Blended Job Fit Score (Descending)
            $aFit = (float) ($a['fit_score'] ?? 0);
            $bFit = (float) ($b['fit_score'] ?? 0);
            if (abs($aFit - $bFit) > 0.05) {
                return $bFit <=> $aFit;
            }

            // Stage 3: Mandatory Skills Met Count (Descending)
            $aMandatory = (int) ($a['mandatory_met_count'] ?? 0);
            $bMandatory = (int) ($b['mandatory_met_count'] ?? 0);
            if ($aMandatory !== $bMandatory) {
                return $bMandatory <=> $aMandatory;
            }

            // Stage 4: Global Readiness Score
            $aReadiness = (float) ($a['readiness_score'] ?? 0);
            $bReadiness = (float) ($b['readiness_score'] ?? 0);
            if (abs($aReadiness - $bReadiness) > 0.05) {
                return $bReadiness <=> $aReadiness;
            }

            // Stage 5: Academic CGPA Tie-Breaker
            $aCgpa = (float) ($a['cgpa'] ?? 0);
            $bCgpa = (float) ($b['cgpa'] ?? 0);
            return $bCgpa <=> $aCgpa;
        });

        // Rank Assignment
        $rank = 1;
        foreach ($candidates as &$cand) {
            if (!empty($cand['is_eligible'])) {
                $cand['rank'] = $rank++;
            } else {
                $cand['rank'] = null;
            }
        }
        unset($cand);

        return $candidates;
    }
}
