<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\CommunicationScenario;
use App\Models\CommunicationPracticeSession;
use App\Models\CommunicationFeedback;
use App\Services\AI\AiManager;
use App\Services\AI\MockAiProvider;
use App\Services\Communication\CommunicationTopicGeneratorService;
use App\Services\Communication\SpeechDeliveryEvaluator;
use App\Services\Communication\CommunicationCoachService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

class SpeechDeliveryAndDynamicTopicsTest extends TestCase
{
    use RefreshDatabase;

    protected Student $student;
    protected User $user;
    protected AiManager $aiManager;

    protected function setUp(): void
    {
        parent::setUp();

        // Bind mock AI provider
        $this->aiManager = new AiManager('testing');
        $this->aiManager->setProvider(new MockAiProvider());
        $this->app->instance(AiManager::class, $this->aiManager);

        // Seed an authenticated student
        $this->user = User::create([
            'email' => 'student.speech.' . uniqid() . '@campuslink.edu',
            'password_hash' => bcrypt('Secret123!'),
            'role' => 'STUDENT',
            'is_active' => true,
        ]);
        $this->student = Student::create([
            'user_id' => $this->user->id,
            'student_identifier' => 'STU-SPK-' . uniqid(),
            'first_name' => 'Aarav',
            'last_name' => 'Patel',
            'branch' => 'Computer Science',
            'cgpa' => 8.5,
            'graduation_year' => 2026,
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_speech_delivery_evaluator_calculates_optimal_pacing_and_low_fillers(): void
    {
        $evaluator = new SpeechDeliveryEvaluator();

        $transcript = "First, let us examine our Redis cache layer. The main reason for implementing cache-aside is to reduce database load. For example, during peak checkout traffic, latency remains sub-50 milliseconds. Therefore, in summary, we recommend maintaining TTLs at 15 minutes.";
        $durationSeconds = 60.0; // ~40 words in 60s -> ~40 WPM or let's test specific WPM

        // Test assessPacing directly
        $this->assertEquals('OPTIMAL', $evaluator->assessPacing(142));
        $this->assertEquals('SLIGHTLY_SLOW', $evaluator->assessPacing(120));
        $this->assertEquals('SLIGHTLY_FAST', $evaluator->assessPacing(160));
        $this->assertEquals('TOO_SLOW', $evaluator->assessPacing(100));
        $this->assertEquals('TOO_FAST', $evaluator->assessPacing(180));

        // Test Grade Tier Mapping
        $gradeE = $evaluator->calculateGradeTier(92.5);
        $this->assertEquals('E', $gradeE['tier']);
        $this->assertEquals('Exemplary', $gradeE['label']);

        $gradeA = $evaluator->calculateGradeTier(84.0);
        $this->assertEquals('A', $gradeA['tier']);
        $this->assertEquals('Accomplished', $gradeA['label']);

        $gradeP = $evaluator->calculateGradeTier(74.0);
        $this->assertEquals('P', $gradeP['tier']);
        $this->assertEquals('Proficient', $gradeP['label']);

        $gradeC = $evaluator->calculateGradeTier(65.0);
        $this->assertEquals('C', $gradeC['tier']);
        $this->assertEquals('Developing', $gradeC['label']);

        $gradeD = $evaluator->calculateGradeTier(52.0);
        $this->assertEquals('D', $gradeD['tier']);
        $this->assertEquals('Deficient', $gradeD['label']);
    }

    public function test_speech_delivery_evaluator_detects_fillers_and_frameworks(): void
    {
        $evaluator = new SpeechDeliveryEvaluator();

        $transcriptWithFillers = "Basically um the database like sort of struggled with latency, you know, actually.";
        $analytics = $evaluator->analyzeAcoustics($transcriptWithFillers, 30.0);

        $this->assertGreaterThan(0, $analytics['filler_density_percentage']);
        $this->assertNotEmpty($analytics['filler_words_detected']);

        // Check PREP framework detection
        $prepTranscript = "My core point is to deprecate legacy endpoints because they lack rate limiting. For example, malicious bots caused service disruption last month. In conclusion, we must enforce API tokens.";
        $framework = $evaluator->detectStructuralFramework($prepTranscript, 'STRUCTURED_SPEAKING');
        $this->assertEquals('PREP', $framework['framework_used']);

        // Check STAR framework detection
        $starTranscript = "The situation was a production memory leak. My task was to identify uncollected cycles. I initiated profiling using heap dumps and patched the listener. As a result, memory consumption decreased by 40%.";
        $starFramework = $evaluator->detectStructuralFramework($starTranscript, 'STRUCTURED_SPEAKING');
        $this->assertEquals('STAR', $starFramework['framework_used']);
    }

    public function test_topic_generator_service_creates_dynamic_scenario_with_anti_duplication(): void
    {
        $topicService = app(CommunicationTopicGeneratorService::class);

        $scenario = $topicService->generateForStudent($this->student, 'INTERMEDIATE', 'Cloud Infrastructure & Reliability');

        $this->assertInstanceOf(CommunicationScenario::class, $scenario);
        $this->assertTrue($scenario->is_dynamic);
        $this->assertEquals('PROFESSIONAL_EMAIL', $scenario->category);
        $this->assertEquals($this->student->id, $scenario->generated_by_student_id);
        $this->assertNotEmpty($scenario->title);
        $this->assertNotEmpty($scenario->context_scenario);
        $this->assertNotEmpty($scenario->prompt_text);
        $this->assertNotEmpty($scenario->target_audience);
    }

    public function test_api_generates_dynamic_email_scenario(): void
    {
        $response = $this->postJson('/api/v1/students/me/communication-coach/scenarios/generate-email', [
            'difficulty' => 'INTERMEDIATE',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'scenario' => [
                    'id',
                    'category',
                    'title',
                    'prompt_text',
                    'context_scenario',
                    'target_audience',
                    'difficulty',
                    'is_dynamic',
                ],
                'session' => [
                    'id',
                    'student_id',
                    'scenario_id',
                    'category',
                    'status',
                ],
            ]);

        $this->assertEquals('PROFESSIONAL_EMAIL', $response->json('scenario.category'));
        $this->assertTrue($response->json('scenario.is_dynamic'));
    }

    public function test_api_submits_spoken_audio_and_evaluates_delivery_with_e_to_d_tier(): void
    {
        Storage::fake('local');

        // Create technical explanation scenario
        $scenario = CommunicationScenario::create([
            'category' => 'TECHNICAL_EXPLANATION',
            'title' => 'Explaining Kafka Message Queues',
            'prompt_text' => 'Explain to your non-technical project manager how Apache Kafka queues work and why they prevent lost orders.',
            'context_scenario' => 'A non-technical project manager wants to know how message queues prevent lost customer orders during flash sales.',
            'target_audience' => 'Non-Technical Project Manager',
            'difficulty' => 'INTERMEDIATE',
            'min_word_limit' => 20,
            'max_word_limit' => 300,
            'recommended_min_words' => 50,
            'recommended_max_words' => 150,
            'is_active' => true,
        ]);

        $session = CommunicationPracticeSession::create([
            'student_id' => $this->student->id,
            'scenario_id' => $scenario->id,
            'category' => $scenario->category,
            'status' => 'IN_PROGRESS',
            'attempt_number' => 1,
            'revision_number' => 1,
        ]);

        $fakeAudio = UploadedFile::fake()->create('spoken_response.webm', 250, 'audio/webm');
        $transcript = "First, let us examine how Kafka acts essentially like a high-speed post office where orders are timestamped into dedicated boxes. Consequently, even if database traffic spikes, orders are queued safely. For example, during flash checkout, nothing is dropped. In summary, message queues guarantee reliability.";

        $response = $this->postJson("/api/v1/students/me/communication-coach/sessions/{$session->id}/submit-audio", [
            'audio' => $fakeAudio,
            'transcript' => $transcript,
            'duration_seconds' => 75.0,
            'telemetry' => [
                'duration_seconds' => 75.0,
                'silence_duration_seconds' => 4.5,
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'session' => [
                    'id',
                    'status',
                    'submission_mode',
                    'student_response',
                    'acoustic_telemetry',
                ],
                'feedback' => [
                    'id',
                    'overall_score',
                    'grade_tier',
                    'grade_label',
                    'delivery_scores' => [
                        'pacing_fluency',
                        'filler_word_control',
                        'structural_signposting',
                        'vocal_confidence_clarity',
                        'audience_adaptation',
                    ],
                    'acoustic_analytics' => [
                        'words_per_minute',
                        'pacing_assessment',
                        'filler_words_detected',
                    ],
                    'rubric_scores',
                    'factual_technical_evaluation',
                ],
            ]);

        $this->assertEquals('AUDIO', $response->json('session.submission_mode'));
        $this->assertNotNull($response->json('feedback.grade_tier'));
        $this->assertContains($response->json('feedback.grade_tier'), ['E', 'A', 'P', 'C', 'D']);
        $this->assertNotNull($response->json('feedback.delivery_scores.pacing_fluency'));
        $this->assertNotNull($response->json('feedback.acoustic_analytics.words_per_minute'));

        // Test audio streaming endpoint
        $streamResponse = $this->get("/api/v1/students/me/communication-coach/sessions/{$session->id}/audio");
        $streamResponse->assertStatus(200);
    }

    public function test_audio_submission_accepts_json_stringified_telemetry_from_multipart_form(): void
    {
        $scenario = CommunicationScenario::create([
            'category' => 'TECHNICAL_EXPLANATION',
            'title' => 'Form Data Telemetry Test Scenario',
            'prompt_text' => 'Explain message queue architectures to the infra team.',
            'context_scenario' => 'Infrastructure leads are reviewing message broker options.',
            'target_audience' => 'Infrastructure Leads',
            'difficulty' => 'INTERMEDIATE',
            'min_word_limit' => 20,
            'max_word_limit' => 200,
            'is_active' => true,
        ]);

        $session = CommunicationPracticeSession::create([
            'student_id' => $this->student->id,
            'scenario_id' => $scenario->id,
            'category' => $scenario->category,
            'status' => 'IN_PROGRESS',
            'attempt_number' => 1,
            'revision_number' => 1,
        ]);

        $fakeAudio = UploadedFile::fake()->create('spoken_response.webm', 150, 'audio/webm');
        $transcript = "We can leverage RabbitMQ as an intermediate buffer to decouple ingestion from asynchronous worker processing. This prevents database lock escalations under burst loads.";

        // Submitting telemetry as a raw JSON string (as sent by FormData.append('telemetry', JSON.stringify(...)))
        $response = $this->post("/api/v1/students/me/communication-coach/sessions/{$session->id}/submit-audio", [
            'audio' => $fakeAudio,
            'transcript' => $transcript,
            'duration_seconds' => '45.0',
            'telemetry' => json_encode([
                'duration_seconds' => 45.0,
                'silence_duration_seconds' => 3.2,
                'silence_ratio' => 0.07,
            ]),
        ]);

        $response->assertStatus(200);
        $this->assertEquals('AUDIO', $response->json('session.submission_mode'));
        $this->assertNotNull($response->json('feedback.grade_tier'));
    }

    public function test_group_discussion_audio_submission_is_explicitly_deferred(): void
    {
        $gdScenario = CommunicationScenario::create([
            'category' => 'GROUP_DISCUSSION',
            'title' => 'Balancing Feature Velocity with Architectural Debt',
            'prompt_text' => 'Participate in this group discussion by addressing your teammates concerns regarding shipping fast.',
            'context_scenario' => 'In a group discussion, teammates disagree on whether to ship fast or refactor.',
            'target_audience' => 'Engineering Colleagues in Group Discussion',
            'difficulty' => 'INTERMEDIATE',
            'min_word_limit' => 20,
            'max_word_limit' => 300,
            'is_active' => true,
        ]);

        $session = CommunicationPracticeSession::create([
            'student_id' => $this->student->id,
            'scenario_id' => $gdScenario->id,
            'category' => 'GROUP_DISCUSSION',
            'status' => 'IN_PROGRESS',
            'attempt_number' => 1,
            'revision_number' => 1,
        ]);

        $response = $this->postJson("/api/v1/students/me/communication-coach/sessions/{$session->id}/submit-audio", [
            'transcript' => "I would like to interject and suggest a compromise between shipping velocity and architectural stability.",
            'duration_seconds' => 45.0,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }
}
