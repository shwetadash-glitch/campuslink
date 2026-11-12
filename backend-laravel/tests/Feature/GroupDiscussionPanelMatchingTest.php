<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\CommunicationScenario;
use App\Enums\UserRole;
use App\Enums\CommunicationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class GroupDiscussionPanelMatchingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Student $student;
    protected Student $friend1;
    protected Student $friend2;
    protected Student $peer3;

    protected function setUp(): void
    {
        parent::setUp();

        // Create main student
        $this->user = User::create([
            'email' => 'cornelius.' . uniqid() . '@campuslink.edu',
            'password_hash' => bcrypt('password'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $this->student = Student::create([
            'user_id' => $this->user->id,
            'first_name' => 'Cornelius',
            'last_name' => 'Nicolas',
            'student_identifier' => 'STU_MAIN_' . uniqid(),
            'branch' => 'Computer Science',
            'graduation_year' => 2026,
        ]);

        // Create peers / friends
        $userF1 = User::create([
            'email' => 'lydia.' . uniqid() . '@campuslink.edu',
            'password_hash' => bcrypt('password'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $this->friend1 = Student::create([
            'user_id' => $userF1->id,
            'first_name' => 'Lydia',
            'last_name' => 'Stark',
            'student_identifier' => 'STU_PEER_' . uniqid(),
            'branch' => 'Mechanical Engineering',
            'graduation_year' => 2026,
        ]);

        $userF2 = User::create([
            'email' => 'abdul.' . uniqid() . '@campuslink.edu',
            'password_hash' => bcrypt('password'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $this->friend2 = Student::create([
            'user_id' => $userF2->id,
            'first_name' => 'Abdul',
            'last_name' => 'Bergnaum',
            'student_identifier' => 'STU_PEER_' . uniqid(),
            'branch' => 'Computer Science',
            'graduation_year' => 2026,
        ]);

        $userP3 = User::create([
            'email' => 'dulce.' . uniqid() . '@campuslink.edu',
            'password_hash' => bcrypt('password'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
        ]);
        $this->peer3 = Student::create([
            'user_id' => $userP3->id,
            'first_name' => 'Dulce',
            'last_name' => 'Walker',
            'student_identifier' => 'STU_PEER_' . uniqid(),
            'branch' => 'Electronics & Communication',
            'graduation_year' => 2026,
        ]);
    }

    public function test_student_can_search_fellow_students_to_add_friends(): void
    {
        Sanctum::actingAs($this->user);
        $response = $this->getJson('/api/v1/students/me/peers?search=Lydia');

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $peers = $response->json('peers');
        $this->assertNotEmpty($peers);
        $this->assertEquals('Lydia Stark', $peers[0]['name']);
        $this->assertEquals('Mechanical Engineering', $peers[0]['branch']);
    }

    public function test_student_can_fetch_random_cohort_peers(): void
    {
        Sanctum::actingAs($this->user);
        $response = $this->getJson('/api/v1/students/me/peers/random?count=3');

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $peers = $response->json('peers');
        $this->assertCount(3, $peers);
        $peerIds = array_column($peers, 'id');
        $this->assertNotContains($this->student->id, $peerIds, 'Main student should not be in random peer list');
    }

    public function test_student_can_configure_panel_with_friends(): void
    {
        Sanctum::actingAs($this->user);
        $response = $this->postJson('/api/v1/students/me/group-discussions/panel', [
            'mode' => 'FRIENDS',
            'peer_ids' => [$this->friend1->id, $this->friend2->id],
            'topic_title' => 'Synthesizing Conflicting Viewpoints into Consensus',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('mode', 'FRIENDS');
        $peers = $response->json('peers');
        $this->assertCount(3, $peers); // 2 friends + 1 filled cohort classmate
        $this->assertEquals('Lydia Stark', $peers[0]['name']);
        $this->assertEquals('Friend / Added Peer', $peers[0]['mode_badge']);
        $this->assertNotEmpty($response->json('dialogue_turns'));
    }

    public function test_student_can_configure_panel_placed_between_random_students(): void
    {
        Sanctum::actingAs($this->user);
        $response = $this->postJson('/api/v1/students/me/group-discussions/panel', [
            'mode' => 'RANDOM',
            'topic_title' => 'Constructive Disagreement on Architectural Frameworks',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('mode', 'RANDOM');
        $peers = $response->json('peers');
        $this->assertCount(3, $peers);
        $this->assertEquals('Random Match', $peers[0]['mode_badge']);
        $this->assertNotEmpty($response->json('dialogue_turns'));
    }

    public function test_student_can_submit_gd_evaluation(): void
    {
        Sanctum::actingAs($this->user);
        $scenario = CommunicationScenario::firstOrCreate(
            ['title' => 'Steering a Derailing Discussion Back to Core Problem'],
            [
                'category' => CommunicationCategory::GROUP_DISCUSSION->value,
                'prompt_text' => 'Refocus team from CSS to Disaster Recovery.',
                'context_scenario' => 'A collaborative campus placement case-study exercise with 15 minutes remaining.',
                'target_audience' => 'Panel',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 20,
                'max_word_limit' => 200,
                'recommended_min_words' => 50,
                'recommended_max_words' => 150,
                'is_active' => true,
            ]
        );

        $payload = [
            'scenario_id' => $scenario->id,
            'topic' => $scenario->title,
            'clarity_and_fluency' => 18.5,
            'active_listening' => 18.0,
            'body_language' => 17.5,
            'topic_knowledge' => 19.0,
            'creativity_and_perspectivity' => 18.5,
            'speaking_duration_seconds' => 120,
            'speech_transcript' => 'Cornelius Nicolas (You): Let us refocus on the disaster recovery architecture.',
        ];

        $response = $this->postJson('/api/v1/students/me/group-discussions/submit', $payload);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $this->assertEquals(91.5, $response->json('result.overall_score'));
        $this->assertEquals('SELECTED', $response->json('result.decision'));
        $this->assertEquals('E', $response->json('result.grade_tier'));
    }
}
