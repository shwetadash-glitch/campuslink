<?php
$user = \App\Models\User::where('email', 'recruiter1@comp1.com')->first();
if (!$user || !$user->recruiterProfile) {
    echo "User or profile not found.\n";
    exit;
}
$companyId = $user->recruiterProfile->company_id;
$job = \App\Models\Job::where('company_id', $companyId)->first();

if (!$job) {
    echo "No job found for this company.\n";
    exit;
}

$drives = [
    [
        'name' => 'Winter Hiring Drive 2026',
        'description' => 'Looking for talented graduates for our winter intake.',
        'job_id' => $job->id,
        'date' => '2026-11-15',
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'mode' => 'OFFLINE',
        'venue' => 'Main Auditorium',
        'capacity' => 150,
        'registration_deadline' => '2026-11-10',
        'status' => 'PUBLISHED'
    ],
    [
        'name' => 'Virtual Tech Screening',
        'description' => 'First round coding assessment for all applicants.',
        'job_id' => $job->id,
        'date' => '2026-12-05',
        'start_time' => '10:00:00',
        'end_time' => '12:00:00',
        'mode' => 'VIRTUAL',
        'venue' => 'HackerRank Platform',
        'capacity' => null,
        'registration_deadline' => '2026-12-01',
        'status' => 'PUBLISHED'
    ],
    [
        'name' => 'Spring Recruitment 2027',
        'description' => 'Early planning for spring recruitment season.',
        'job_id' => $job->id,
        'date' => '2027-03-20',
        'start_time' => '10:00:00',
        'end_time' => '16:00:00',
        'mode' => 'OFFLINE',
        'venue' => 'Campus Labs',
        'capacity' => 50,
        'registration_deadline' => '2027-03-15',
        'status' => 'DRAFT'
    ]
];

foreach ($drives as $data) {
    $drive = new \App\Models\PlacementDrive();
    $drive->name = $data['name'];
    $drive->job_id = $data['job_id'];
    $drive->company_id = $companyId;
    $drive->start_date = \Carbon\Carbon::parse($data['date'] . ' ' . $data['start_time']);
    $drive->end_date = \Carbon\Carbon::parse($data['date'] . ' ' . $data['end_time']);
    $drive->registration_deadline = $data['registration_deadline'];
    $drive->capacity = $data['capacity'] ?? null;
    $drive->status = $data['status'];
    $drive->drive_type = $data['mode'];
    
    $drive->metadata_json = json_encode([
        'description' => $data['description'] ?? null,
        'mode' => $data['mode'] ?? null,
        'venue' => $data['venue'] ?? null
    ]);
    $drive->save();
}
echo "Added 3 drives successfully!\n";
