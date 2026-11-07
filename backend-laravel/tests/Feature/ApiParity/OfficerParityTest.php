<?php
namespace Tests\Feature\ApiParity;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Enums\UserRole;

class OfficerParityTest extends TestCase {
    use RefreshDatabase;
    
    public function test_officer_can_view_student() {
        $officer = User::create(['email' => 'o@t.com', 'password_hash' => 'x', 'role' => UserRole::PLACEMENT_OFFICER->value]);
        $studentUser = User::create(['email' => 's@t.com', 'password_hash' => 'x', 'role' => UserRole::STUDENT->value]);
        $student = Student::create(['user_id' => $studentUser->id, 'first_name' => 'S', 'last_name' => 'L', 'student_identifier' => 'STU', 'branch' => 'CS', 'graduation_year' => 2025]);
        
        $this->actingAs($officer)->getJson("/api/v1/officer/students/{$student->id}")
             ->assertStatus(200)
             ->assertJsonFragment(['first_name' => 'S']);
             
        // Unauth role denied
        $this->actingAs($studentUser)->getJson("/api/v1/officer/students/{$student->id}")->assertStatus(403);
    }
    
    public function test_officer_can_manage_companies() {
        $officer = User::create(['email' => 'o@t.com', 'password_hash' => 'x', 'role' => UserRole::PLACEMENT_OFFICER->value]);
        Company::create(['name' => 'C1', 'industry' => 'Tech']);
        
        $this->actingAs($officer)->getJson('/api/v1/officer/companies')->assertStatus(200)->assertJsonCount(1);
        
        $res = $this->actingAs($officer)->postJson('/api/v1/officer/companies', ['name' => 'C2', 'industry' => 'Fin']);
        $res->assertStatus(201);
        $this->assertDatabaseHas('companies', ['name' => 'C2']);
    }
}
