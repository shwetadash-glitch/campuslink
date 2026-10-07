<?php
$driveId = 1;
$studentIds = range(80, 129);
$existingCount = \App\Models\DriveCandidate::where('drive_id', $driveId)->whereIn('student_id', $studentIds)->count();
echo 'Existing: ' . $existingCount . PHP_EOL;

foreach ($studentIds as $id) {
    \App\Models\DriveCandidate::firstOrCreate([
        'drive_id' => $driveId,
        'student_id' => $id,
    ]);
}

$finalCount = \App\Models\DriveCandidate::where('drive_id', $driveId)->whereIn('student_id', $studentIds)->count();
echo 'Final Count: ' . $finalCount . PHP_EOL;

$finalIds = \App\Models\DriveCandidate::where('drive_id', $driveId)->whereIn('student_id', $studentIds)->pluck('id')->toArray();
echo 'Candidate IDs: ' . implode(', ', $finalIds) . PHP_EOL;

