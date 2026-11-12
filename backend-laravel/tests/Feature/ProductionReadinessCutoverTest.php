<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Models\Job;
use App\Models\PlacementDrive;
use App\Enums\UserRole;
use App\Exceptions\AiServiceUnavailableException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

class ProductionReadinessCutoverTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_endpoint_returns_ok()
    {
        $response = $this->get('/up');
        $response->assertStatus(200);
    }

    public function test_inactive_imported_user_cannot_login()
    {
        $user = User::create([
            'id' => 13,
            'email' => 'student3@college.edu',
            'password_hash' => Hash::make('password123'),
            'role' => UserRole::STUDENT->value,
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'student3@college.edu',
            'password' => 'password123',
        ]);

        $response->assertStatus(400)
                 ->assertJson(['detail' => 'Inactive user']);
    }

    public function test_active_user_can_login_with_both_username_and_email()
    {
        $user = User::create([
            'id' => 1,
            'email' => 'admin@campuslink.com',
            'password_hash' => Hash::make('admin123'),
            'role' => UserRole::SUPER_ADMIN->value,
            'is_active' => true,
        ]);

        // 1. Login with username
        $response1 = $this->postJson('/api/v1/auth/login', [
            'username' => 'admin@campuslink.com',
            'password' => 'admin123',
        ]);
        $response1->assertStatus(200)
                  ->assertJsonStructure(['access_token', 'refresh_token', 'token_type', 'user']);

        // 2. Login with email
        $response2 = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@campuslink.com',
            'password' => 'admin123',
        ]);
        $response2->assertStatus(200)
                  ->assertJsonStructure(['access_token', 'refresh_token', 'token_type', 'user']);
    }

    public function test_ai_service_unavailable_returns_standard_503_json()
    {
        // Define temporary test route throwing AiServiceUnavailableException
        Route::get('/api/v1/test-ai-guard', function () {
            throw new AiServiceUnavailableException(
                'AI Interview service is offline in this environment.',
                'interview_chat',
                60
            );
        });

        $response = $this->getJson('/api/v1/test-ai-guard');

        $response->assertStatus(503)
                 ->assertJson([
                     'status' => 'error',
                     'code' => 'AI_SERVICE_UNAVAILABLE',
                     'message' => 'AI Interview service is offline in this environment.',
                     'retry_after' => 60,
                 ]);
    }

    public function test_multi_role_access_and_placement_core_workflows()
    {
        // 1. Student setup
        $studentUser = User::create([
            'email' => 'student@college.edu',
            'password_hash' => Hash::make('password'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $student = Student::create([
            'user_id' => $studentUser->id,
            'student_identifier' => 'STU-001',
            'first_name' => 'Alice',
            'last_name' => 'Johnson',
            'branch' => 'CSE',
            'graduation_year' => 2026,
            'cgpa' => 8.5,
        ]);

        // 2. Company & Recruiter setup
        $company = Company::create([
            'name' => 'TechCorp Global',
            'industry' => 'Technology',
        ]);
        $recruiterUser = User::create([
            'email' => 'recruiter@techcorp.com',
            'password_hash' => Hash::make('password'),
            'role' => UserRole::RECRUITER->value,
            'is_active' => true,
        ]);
        $recruiter = Recruiter::create([
            'user_id' => $recruiterUser->id,
            'company_id' => $company->id,
            'contact_name' => 'John Recruiter',
            'contact_email' => 'recruiter@techcorp.com',
        ]);

        // 3. Job setup
        $job = Job::create([
            'company_id' => $company->id,
            'recruiter_id' => $recruiter->id,
            'title' => 'Software Engineer',
            'description' => 'Backend development with Laravel and PostgreSQL',
            'employment_type' => 'Full-time',
            'status' => 'PUBLISHED',
        ]);

        // 4. Placement Drive setup
        $drive = PlacementDrive::create([
            'company_id' => $company->id,
            'job_id' => $job->id,
            'name' => 'TechCorp Annual Drive 2026',
            'drive_type' => 'ON_CAMPUS',
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(8),
            'status' => 'PUBLISHED',
        ]);

        // Verify Student can view available published jobs
        $studentToken = $studentUser->createToken('auth')->plainTextToken;
        $jobsResponse = $this->withHeader('Authorization', "Bearer {$studentToken}")
                             ->getJson('/api/v1/jobs/available');
        $jobsResponse->assertStatus(200);

        // Clear guard cache before recruiter request
        $this->app['auth']->forgetGuards();

        // Verify Recruiter can view jobs
        $recruiterToken = $recruiterUser->createToken('auth')->plainTextToken;
        $recruiterJobs = $this->withHeader('Authorization', "Bearer {$recruiterToken}")
                              ->getJson('/api/v1/recruiters/me/jobs');
        $recruiterJobs->assertStatus(200);

        // Clear cached auth guards
        $this->app['auth']->forgetGuards();
        $studentUser->unsetRelation('studentProfile');

        // Verify Student placement dashboard
        $dashboardResponse = $this->withHeader('Authorization', "Bearer {$studentToken}")
                                  ->getJson('/api/v1/students/me/placement-dashboard');
        $dashboardResponse->assertStatus(200);
    }
}
