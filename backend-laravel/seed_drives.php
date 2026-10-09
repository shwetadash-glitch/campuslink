<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\PlacementDrive;
use App\Models\Company;
use App\Models\Job;

$c1 = Company::firstOrCreate(['name' => 'Google'], ['industry' => 'Technology', 'description' => 'Search giant']);
$c2 = Company::firstOrCreate(['name' => 'Microsoft'], ['industry' => 'Technology', 'description' => 'Software giant']);
$c3 = Company::firstOrCreate(['name' => 'Goldman Sachs'], ['industry' => 'Finance', 'description' => 'Investment Bank']);

$j1 = Job::create(['company_id' => $c1->id, 'title' => 'SWE Intern', 'description' => 'Intern', 'location' => 'Bangalore', 'employment_type' => 'INTERNSHIP', 'base_salary' => 100000]);
$j2 = Job::create(['company_id' => $c2->id, 'title' => 'SDE 1', 'description' => 'SDE', 'location' => 'Hyderabad', 'employment_type' => 'FULL_TIME', 'base_salary' => 1500000]);
$j3 = Job::create(['company_id' => $c3->id, 'title' => 'Summer Analyst', 'description' => 'Analyst', 'location' => 'Bangalore', 'employment_type' => 'INTERNSHIP', 'base_salary' => 120000]);

PlacementDrive::create([
    'company_id' => $c1->id,
    'job_id' => $j1->id,
    'name' => 'Google STEP Internship 2026',
    'status' => 'REGISTRATION_OPEN'
]);

PlacementDrive::create([
    'company_id' => $c2->id,
    'job_id' => $j2->id,
    'name' => 'Microsoft SDE Full-Time Hiring',
    'status' => 'REGISTRATION_OPEN'
]);

PlacementDrive::create([
    'company_id' => $c3->id,
    'job_id' => $j3->id,
    'name' => 'Goldman Sachs Summer Analyst',
    'status' => 'REGISTRATION_OPEN'
]);

echo "Drives created!\n";
