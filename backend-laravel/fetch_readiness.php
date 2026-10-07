<?php
use App\Models\Student;
use App\Services\ReadinessScoringService;

$service = new ReadinessScoringService();
$students = Student::all();
$shortlisted = [];

foreach ($students as $student) {
    $readiness = $service->calculateReadiness($student);
    if ($readiness['overall_score'] >= 50) { // Just a threshold to be "shortlisted"
        $shortlisted[] = [
            'id' => $student->student_identifier,
            'name' => $student->first_name . ' ' . $student->last_name,
            'branch' => $student->branch,
            'score' => $readiness['overall_score'],
            'tier' => $readiness['readiness_level']
        ];
    }
}

echo json_encode($shortlisted, JSON_PRETTY_PRINT);
