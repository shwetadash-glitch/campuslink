<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Job;
use App\Models\JobRequirement;
use App\Models\Skill;

class SeedJobReqs extends Command
{
    protected $signature = 'app:seed-reqs';
    public function handle()
    {
        $python = Skill::where('name', 'Python')->first();
        $react = Skill::where('name', 'React')->first();
        $docker = Skill::where('name', 'Docker')->first();
        $ml = Skill::where('name', 'Machine Learning')->first();
        $sql = Skill::where('name', 'SQL')->first();

        $ml_job = Job::where('title', 'Machine Learning Engineer')->first();
        if ($ml_job) {
            JobRequirement::firstOrCreate(['job_id' => $ml_job->id, 'skill_id' => $python->id], ['required_proficiency' => 'EXPERT', 'is_mandatory' => true]);
            JobRequirement::firstOrCreate(['job_id' => $ml_job->id, 'skill_id' => $ml->id], ['required_proficiency' => 'EXPERT', 'is_mandatory' => true]);
            JobRequirement::firstOrCreate(['job_id' => $ml_job->id, 'skill_id' => $sql->id], ['required_proficiency' => 'INTERMEDIATE', 'is_mandatory' => false]);
            $this->info("Seeded ML Engineer reqs.");
        }

        $fs_job = Job::where('title', 'Full Stack Developer')->first();
        if ($fs_job) {
            JobRequirement::firstOrCreate(['job_id' => $fs_job->id, 'skill_id' => $react->id], ['required_proficiency' => 'ADVANCED', 'is_mandatory' => true]);
            JobRequirement::firstOrCreate(['job_id' => $fs_job->id, 'skill_id' => $python->id], ['required_proficiency' => 'INTERMEDIATE', 'is_mandatory' => true]);
            JobRequirement::firstOrCreate(['job_id' => $fs_job->id, 'skill_id' => $docker->id], ['required_proficiency' => 'BEGINNER', 'is_mandatory' => false]);
            $this->info("Seeded Full Stack Developer reqs.");
        }
        
        $ai_job = Job::where('title', 'AI Engineer')->first();
        if ($ai_job) {
            JobRequirement::firstOrCreate(['job_id' => $ai_job->id, 'skill_id' => $python->id], ['required_proficiency' => 'ADVANCED', 'is_mandatory' => true]);
            $this->info("Seeded AI Engineer reqs.");
        }
    }
}
