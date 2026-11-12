<?php
namespace App\Services;

use App\Models\Student;
use App\Models\Job;

class EligibilityService
{
    public function checkHardEligibility(Student $student, Job $job)
    {
        $eligible = true;
        $reasons = [];
        $strengths = [];

        $config = $job->eligibility_config ?? [];
        
        // Strict unrounded CGPA check
        if (isset($config['min_cgpa']) && $student->cgpa !== null) {
            $studentCgpa = (float) $student->cgpa;
            $minCgpa = (float) $config['min_cgpa'];
            if ($studentCgpa < $minCgpa) {
                $eligible = false;
                $reasons[] = "CGPA ({$student->cgpa}) is below required {$config['min_cgpa']}";
            } else {
                $strengths[] = "Meets CGPA requirements.";
            }
        }

        if (isset($config['max_active_backlogs'])) {
            $active = (int) ($student->backlogs_current ?? 0);
            $maxAllowed = (int) $config['max_active_backlogs'];
            if ($active > $maxAllowed) {
                $eligible = false;
                $reasons[] = "Active backlogs ({$active}) exceed allowed {$config['max_active_backlogs']}";
            }
        }

        if (isset($config['allowed_branches']) && !empty($config['allowed_branches'])) {
            $allowedBranches = is_array($config['allowed_branches']) 
                ? $config['allowed_branches'] 
                : [$config['allowed_branches']];

            if (!BranchNormalizationService::isBranchAllowed($student->branch, $allowedBranches)) {
                $eligible = false;
                $reasons[] = "Branch ({$student->branch}) is not eligible.";
            } else {
                $strengths[] = "Branch meets eligibility criteria.";
            }
        }

        return [
            'is_eligible' => $eligible,
            'passed_criteria' => $strengths,
            'failed_criteria' => $reasons
        ];
    }
}
