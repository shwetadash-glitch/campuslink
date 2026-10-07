<?php
$drive = \App\Models\PlacementDrive::with('job')->find(1);
$job = $drive->job;
echo 'Job Eligibility Config: ' . json_encode($job->eligibility_config) . PHP_EOL;

$eligibilityService = app()->make(\App\Services\EligibilityService::class);
$readinessService = app()->make(\App\Services\ReadinessScoringService::class);

$candidates = \App\Models\DriveCandidate::where('drive_id', 1)->with('student')->get();
foreach ($candidates as $cand) {
    $student = $cand->student;
    $readiness = $readinessService->calculateReadiness($student);
    $score = $readiness['overall_score'] ?? 0;
    
    if (round($score) == 82 || round($score) == 83) {
        $eligibility = $eligibilityService->checkHardEligibility($student, $job);
        
        echo '----------------------' . PHP_EOL;
        echo 'Student ID: ' . $student->id . PHP_EOL;
        echo 'Identifier: ' . $student->student_identifier . PHP_EOL;
        echo 'Name: ' . $student->first_name . ' ' . $student->last_name . PHP_EOL;
        echo 'Branch: ' . $student->branch . PHP_EOL;
        echo 'CGPA: ' . $student->cgpa . PHP_EOL;
        echo 'Score: ' . $score . PHP_EOL;
        echo 'Is Eligible: ' . ($eligibility['is_eligible'] ? 'true' : 'false') . PHP_EOL;
        echo 'Failed Criteria: ' . implode(', ', $eligibility['failed_criteria']) . PHP_EOL;
        
        $tier = 'NOT_READY';
        if ($eligibility['is_eligible']) {
            if ($score >= 75) $tier = 'HIGHLY_EMPLOYABLE';
            elseif ($score >= 50) $tier = 'QUALIFIED';
        }
        echo 'Calculated Tier: ' . $tier . PHP_EOL;
    }
}

