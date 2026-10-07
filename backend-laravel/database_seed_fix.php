<?php

use App\Models\Job;
use App\Models\Company;
use App\Models\JobRequirement;
use App\Models\Skill;

// Keep only the first "Machine Learning Engineer" job
$ml_jobs = Job::where('title', 'Machine Learning Engineer')->get();
if ($ml_jobs->count() > 1) {
    $ml_jobs->slice(1)->each(function ($job) {
        $job->delete();
    });
}

// Clean up any DevOps Engineer duplicates (if any)
$devops_jobs = Job::where('title', 'DevOps Engineer')->get();
if ($devops_jobs->count() > 1) {
    $devops_jobs->slice(1)->each(function ($job) {
        $job->delete();
    });
}

// Get the first company to assign new jobs to
$company = Company::first();
if (!$company) {
    echo "No company found.";
    exit;
}

// Create a Software Engineer job
if (Job::where('title', 'Software Engineer')->count() == 0) {
    $job = Job::create([
        'company_id' => $company->id,
        'title' => 'Software Engineer',
        'description' => 'Build robust and scalable backend systems.',
        'employment_type' => 'Full-time',
        'location' => 'Flexible',
        'remote_type' => 'Hybrid',
        'status' => 'PUBLISHED'
    ]);
    
    // Add some skills
    $python = Skill::where('name', 'Python')->first();
    if ($python) {
        JobRequirement::create([
            'job_id' => $job->id,
            'skill_id' => $python->id,
            'required_proficiency' => 'INTERMEDIATE',
            'is_mandatory' => true
        ]);
    }
}

// Create a Full Stack Developer job
if (Job::where('title', 'Full Stack Developer')->count() == 0) {
    $job = Job::create([
        'company_id' => $company->id,
        'title' => 'Full Stack Developer',
        'description' => 'Develop both client and server software using React and Node.js.',
        'employment_type' => 'Full-time',
        'location' => 'New York, NY',
        'remote_type' => 'On-site',
        'status' => 'PUBLISHED'
    ]);
    
    // Add some skills
    $javascript = Skill::where('name', 'JavaScript')->first();
    if ($javascript) {
        JobRequirement::create([
            'job_id' => $job->id,
            'skill_id' => $javascript->id,
            'required_proficiency' => 'ADVANCED',
            'is_mandatory' => true
        ]);
    }
}

// Create an AI Engineer job
if (Job::where('title', 'AI Engineer')->count() == 0) {
    $job = Job::create([
        'company_id' => $company->id,
        'title' => 'AI Engineer',
        'description' => 'Design and implement advanced artificial intelligence algorithms.',
        'employment_type' => 'Full-time',
        'location' => 'San Francisco, CA',
        'remote_type' => 'Remote',
        'status' => 'PUBLISHED'
    ]);
    
    // Add some skills
    $ml = Skill::where('name', 'Machine Learning')->first();
    if ($ml) {
        JobRequirement::create([
            'job_id' => $job->id,
            'skill_id' => $ml->id,
            'required_proficiency' => 'EXPERT',
            'is_mandatory' => true
        ]);
    }
}

echo "Database cleaned and seeded successfully!\n";
