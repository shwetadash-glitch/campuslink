<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Student;
use App\Models\Job;
use App\Models\Company;
use App\Models\Recruiter;
use App\Enums\UserRole;
use App\Enums\ProficiencyLevel;
use App\Models\Skill;
class Phase6ParityTest extends TestCase {
    use RefreshDatabase;
    public function test_eligibility_and_skill_gap_deterministic() {
        $user = User::create(['email' => 'stu@test.com', 'password_hash' => 'x', 'role' => UserRole::STUDENT->value]);
        $student = Student::create(['user_id' => $user->id, 'student_identifier' => 'STU1', 'first_name' => 'A', 'last_name' => 'B', 'branch' => 'CS', 'graduation_year' => 2025, 'cgpa' => 8.0, 'backlogs_current' => 0]);
        $company = Company::create(['name' => 'Tech Corp']);
        $job = Job::create(['company_id' => $company->id, 'title' => 'Software Engineer', 'description' => 'Desc', 'employment_type' => 'Full-time', 'eligibility_config' => ['min_cgpa' => 7.5, 'allowed_branches' => ['CS', 'IT']]]);
        $skill = Skill::create(['name' => 'Python', 'category' => 'Technical']);
        $job->requirements()->create(['skill_id' => $skill->id, 'required_proficiency' => ProficiencyLevel::ADVANCED->value, 'is_mandatory' => true]);
        
        // Skill Gap - Student has NO python
        $response = $this->actingAs($user)->getJson("/api/v1/readiness/me/jobs/{$job->id}/skill-gaps");
        $response->assertStatus(200);
        $data = $response->json();
        $gaps = $data['gaps'] ?? $data;
        $this->assertEquals('CRITICAL', $gaps[0]['gap_severity']); // since mandatory and student has 0
        
        // Eligibility - Student has 8.0 > 7.5
        $resp2 = $this->actingAs($user)->getJson("/api/v1/jobs/{$job->id}/my-eligibility");
        $resp2->assertStatus(200)->assertJsonFragment(['is_eligible' => true]);
    }
}
