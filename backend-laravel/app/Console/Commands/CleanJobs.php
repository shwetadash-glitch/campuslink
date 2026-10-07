<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Job;
use App\Models\Company;
use App\Models\JobRequirement;
use App\Models\Skill;

class CleanJobs extends Command
{
    protected $signature = 'app:clean-jobs';
    protected $description = 'Clean duplicate jobs and seed new ones';

    public function handle()
    {
        // Keep only the first "Machine Learning Engineer" job
        $ml_jobs = Job::where('title', 'Machine Learning Engineer')->get();
        if ($ml_jobs->count() > 1) {
            $ml_jobs->slice(1)->each(function ($job) {
                $job->delete();
            });
            $this->info("Deleted " . ($ml_jobs->count() - 1) . " ML Engineer duplicates.");
        }

        // Clean up any DevOps Engineer duplicates
        $devops_jobs = Job::where('title', 'DevOps Engineer')->get();
        if ($devops_jobs->count() > 1) {
            $devops_jobs->slice(1)->each(function ($job) {
                $job->delete();
            });
            $this->info("Deleted " . ($devops_jobs->count() - 1) . " DevOps Engineer duplicates.");
        }

        $company = Company::first();
        if (!$company) {
            $this->error("No company found.");
            return;
        }

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
            $this->info("Created Software Engineer.");
        }

        if (Job::where('title', 'Full Stack Developer')->count() == 0) {
            $job = Job::create([
                'company_id' => $company->id,
                'title' => 'Full Stack Developer',
                'description' => 'Develop both client and server software.',
                'employment_type' => 'Full-time',
                'location' => 'New York, NY',
                'remote_type' => 'On-site',
                'status' => 'PUBLISHED'
            ]);
            $this->info("Created Full Stack Developer.");
        }

        if (Job::where('title', 'AI Engineer')->count() == 0) {
            $job = Job::create([
                'company_id' => $company->id,
                'title' => 'AI Engineer',
                'description' => 'Design AI algorithms.',
                'employment_type' => 'Full-time',
                'location' => 'San Francisco, CA',
                'remote_type' => 'Remote',
                'status' => 'PUBLISHED'
            ]);
            $this->info("Created AI Engineer.");
        }
        
        $this->info("Done!");
    }
}
