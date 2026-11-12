<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\DriveCandidate;
use App\Enums\CandidateDriveStatus;

// Target: Cornelius Nicolas (student_id = 1) in TechCorp Campus Drive 2026 (drive_id = 1)
$candidate = DriveCandidate::where('student_id', 1)->where('drive_id', 1)->first();

if ($candidate) {
    $now = now();
    $candidate->status = CandidateDriveStatus::SHORTLISTED->value;
    $candidate->current_round_number = 3; // Eligible for Round 3 Group Discussion
    $candidate->round_results = [
        'round_2' => [
            'quiz_sent' => true,
            'student_submitted' => true,
            'status' => 'CLEARED',
            'score' => 85.0,
            'correct_answers' => 9,
            'total_questions' => 10,
            'passing_cutoff' => 60.0,
            'skill_breakdown' => [
                'Python' => 100.0,
                'SQL' => 80.0,
                'C++' => 85.0,
            ],
            'dispatched_at' => $now->copy()->subHours(2)->toIso8601String(),
            'submitted_at' => $now->copy()->subHour()->toIso8601String(),
            'completed_at' => $now->copy()->subHour()->toIso8601String(),
            'notes' => 'Candidate scored 85.0% on Technical Quiz. Cleared and shortlisted for Round 3 Group Discussion.',
        ],
        // Round 3 is not yet completed! It is awaiting GD session participation
    ];
    $candidate->save();
    echo "Successfully updated Candidate ID {$candidate->id} for Drive 1: Round 2 CLEARED, ready for Round 3 Group Discussion." . PHP_EOL;
} else {
    echo "Candidate not found." . PHP_EOL;
}

// Ensure other drives remain in their earlier stages (ONLY ONE company cleared quiz round)
$otherCandidates = DriveCandidate::where('student_id', 1)->where('drive_id', '!=', 1)->get();
foreach ($otherCandidates as $oc) {
    echo "Drive ID {$oc->drive_id}: Status={$oc->status}, Round={$oc->current_round_number}, Results=" . json_encode($oc->round_results) . PHP_EOL;
}
