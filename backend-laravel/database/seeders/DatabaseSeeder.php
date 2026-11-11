<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Job;
use App\Models\Skill;
use App\Models\StudentSkill;
use App\Enums\UserRole;
use App\Enums\ProficiencyLevel;
use App\Enums\JobStatus;
use App\Services\ReadinessScoringService;
use App\Services\SkillGapService;
class DatabaseSeeder extends Seeder {
    public function run() {
        // Admin
        User::factory()->create(['email' => 'testadmin99@test.com', 'role' => UserRole::SUPER_ADMIN->value]);
        
        // Master Skills
        $python = Skill::factory()->create(['name' => 'Python']);
        $java = Skill::factory()->create(['name' => 'Java']);
        $react = Skill::factory()->create(['name' => 'React']);
        $comm = Skill::factory()->create(['name' => 'Communication', 'category' => 'Soft Skill']);

        // Company & Job
        $company = Company::factory()->create(['name' => 'Tech Corp']);
        $recUser = User::factory()->create(['email' => 'testrecruiter99@test.com', 'role' => UserRole::RECRUITER->value]);
        Recruiter::create(['user_id' => $recUser->id, 'company_id' => $company->id, 'contact_name' => 'Recruiter Bob', 'contact_email' => 'testrecruiter99@test.com']);
        
        $job = Job::factory()->create(['company_id' => $company->id, 'title' => 'Backend Engineer']);
        $job->requirements()->create(['skill_id' => $python->id, 'required_proficiency' => ProficiencyLevel::ADVANCED->value, 'is_mandatory' => true]);
        $job->requirements()->create(['skill_id' => $java->id, 'required_proficiency' => ProficiencyLevel::INTERMEDIATE->value, 'is_mandatory' => false]);

        // Student for Phase 6 Testing
        $stuUser = User::factory()->create(['email' => 'teststudent99@test.com', 'role' => UserRole::STUDENT->value]);
        $student = Student::factory()->create([
            'user_id' => $stuUser->id, 
            'first_name' => 'Test', 
            'last_name' => 'Student',
            'cgpa' => 8.5
        ]);

        StudentSkill::create(['student_id' => $student->id, 'skill_id' => $python->id, 'proficiency_level' => ProficiencyLevel::INTERMEDIATE->value]);
        StudentSkill::create(['student_id' => $student->id, 'skill_id' => $comm->id, 'proficiency_level' => ProficiencyLevel::ADVANCED->value]);

        $student->projects()->create(['title' => 'Web App', 'description' => 'Test', 'technologies' => ['Python']]);

        // Calculate initial phase 6 scores
        $readiness = new ReadinessScoringService();
        $readiness->calculateReadiness($student);

        $skillGap = new SkillGapService();
        $skillGap->analyzeSkillGaps($student, $job);

        // Standard Demo Accounts for Frontend (Non-Production Only)
        if (!app()->environment('production')) {
            $this->call(DemoAccountSeeder::class);

            $stuUser3 = User::firstOrCreate(
                ['email' => 'student2@college.edu'],
                [
                    'password_hash' => \Illuminate\Support\Facades\Hash::make('password'),
                    'role' => UserRole::STUDENT->value
                ]
            );
            if (!$stuUser3->studentProfile) {
                Student::factory()->create(['user_id' => $stuUser3->id, 'first_name' => 'Second', 'last_name' => 'Student', 'cgpa' => 7.5]);
            }

            $company2 = Company::firstOrCreate(['name' => 'Innovate LLC']);
            $recUser3 = User::firstOrCreate(
                ['email' => 'recruiter2@comp2.com'],
                [
                    'password_hash' => \Illuminate\Support\Facades\Hash::make('password'),
                    'role' => UserRole::RECRUITER->value
                ]
            );
            if (!$recUser3->recruiterProfile) {
                Recruiter::create(['user_id' => $recUser3->id, 'company_id' => $company2->id, 'contact_name' => 'Second Recruiter', 'contact_email' => 'recruiter2@comp2.com']);
            }
        }
    }
}
