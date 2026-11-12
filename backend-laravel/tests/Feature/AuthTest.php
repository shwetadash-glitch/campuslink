<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Enums\UserRole;
use Illuminate\Support\Facades\Hash;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_registration_cascade()
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'newstudent@college.edu',
            'password' => 'secret123',
            'role' => UserRole::STUDENT->value,
            'first_name' => 'New',
            'last_name' => 'Student',
            'branch' => 'Computer Science',
            'graduation_year' => 2026,
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'user' => ['id', 'email', 'role']]);

        // Verify database cascade
        $this->assertDatabaseHas('users', ['email' => 'newstudent@college.edu']);
        $this->assertDatabaseHas('students', [
            'first_name' => 'Newstudent',
            'branch' => 'Computer Science'
        ]);
        
        $student = Student::first();
        $this->assertEquals('STU' . str_pad($student->user_id, 4, '0', STR_PAD_LEFT), $student->student_identifier);
    }

    public function test_login_returns_token()
    {
        $user = User::create([
            'email' => 'test@example.com',
            'password_hash' => Hash::make('password'),
            'role' => UserRole::STUDENT->value,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['access_token', 'refresh_token', 'token_type']);
    }

    public function test_me_endpoint_requires_auth()
    {
        $response = $this->getJson('/api/v1/auth/me');
        $response->assertStatus(401);
    }

    public function test_demo_accounts_authenticate_successfully()
    {
        $accounts = [
            ['email' => 'student1@college.edu', 'role' => UserRole::STUDENT->value],
            ['email' => 'recruiter1@comp1.com', 'role' => UserRole::RECRUITER->value],
            ['email' => 'admin@campuslink.com', 'role' => UserRole::SUPER_ADMIN->value],
            ['email' => 'po@campuslink.com', 'role' => UserRole::PLACEMENT_OFFICER->value],
        ];

        foreach ($accounts as $account) {
            User::create([
                'email' => $account['email'],
                'password_hash' => Hash::make('password'),
                'role' => $account['role'],
                'is_active' => true,
            ]);

            $this->app['auth']->forgetGuards();
            $response = $this->postJson('/api/v1/auth/login', [
                'username' => $account['email'],
                'password' => 'password',
            ]);

            $response->assertStatus(200)
                     ->assertJsonStructure(['access_token', 'refresh_token', 'token_type', 'user']);

            $this->assertEquals($account['role'], $response->json('user.role'));

            // Verify bearer token works on /auth/me
            $token = $response->json('access_token');
            $this->app['auth']->forgetGuards();
            $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
                               ->getJson('/api/v1/auth/me');
            $meResponse->assertStatus(200);
            $returnedRole = $meResponse->json('data.role') ?? $meResponse->json('role');
            $this->assertEquals($account['role'], $returnedRole);
        }
    }

    public function test_login_accepts_email_or_username_and_rejects_bad_password()
    {
        User::create([
            'email' => 'student1@college.edu',
            'password_hash' => Hash::make('password'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);

        // Login using 'email' field
        $emailRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'student1@college.edu',
            'password' => 'password',
        ]);
        $emailRes->assertStatus(200);

        // Login with bad password
        $badRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'student1@college.edu',
            'password' => 'wrongpass',
        ]);
        $badRes->assertStatus(401);
    }
}
