<?php

namespace App\Services\Communication;

use App\Services\AI\AiManager;
use App\Models\Student;
use App\Models\CommunicationScenario;
use App\Models\CommunicationPracticeSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CommunicationTopicGeneratorService
{
    protected AiManager $aiManager;

    public const DOMAINS = [
        'Cloud Infrastructure & Reliability',
        'Enterprise SaaS & Billing',
        'Cybersecurity & Data Privacy Incident',
        'Fintech Payment Orchestration',
        'Healthtech Regulatory Compliance',
        'E-Commerce Peak Season Logistics',
        'Cross-Functional Product Launch',
        'AI & Machine Learning Model Governance',
    ];

    public const STAKEHOLDERS = [
        'Strict VP of Engineering (concerned with system uptime and SLA breaches)',
        'Enterprise Client Executive (demanding immediate post-incident explanation and SLA credits)',
        'Cross-functional Non-Technical Product Manager (requesting complex database changes before release)',
        'Senior Lead Architect (resistant to adopting an external third-party microservice)',
        'Corporate HR Director & Hiring Committee (evaluating return-to-office and compensation counter-offers)',
        'Frustrated Customer Success Director (facing customer escalations over delayed feature rollouts)',
    ];

    public const TENSIONS = [
        'Explaining an unexpected production database outage and outlining preventative post-mortem steps.',
        'Diplomatically declining an out-of-scope client feature request while protecting sprint velocity.',
        'Resetting executive milestone deadlines due to discovered technical debt in authentication microservices.',
        'Negotiating project handover timelines and on-call rotation responsibilities across distributed teams.',
        'Escalating third-party vendor API instability that impacts critical checkout flows.',
        'Delivering bad news regarding delayed regulatory compliance certification to internal stakeholders.',
    ];

    public function __construct(AiManager $aiManager)
    {
        $this->aiManager = $aiManager;
    }

    /**
     * Generate a unique, context-rich professional email scenario for a student.
     */
    public function generateForStudent(Student $student, string $difficulty = 'INTERMEDIATE', ?string $preferredDomain = null): CommunicationScenario
    {
        $difficulty = strtoupper($difficulty);
        if (!in_array($difficulty, ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], true)) {
            $difficulty = 'INTERMEDIATE';
        }

        // 1. Retrieve student's recent scenarios to avoid repetition
        $recentTitles = CommunicationPracticeSession::where('student_id', $student->id)
            ->where('category', 'PROFESSIONAL_EMAIL')
            ->with('scenario')
            ->latest('id')
            ->take(10)
            ->get()
            ->pluck('scenario.title')
            ->filter()
            ->values()
            ->toArray();

        // 2. Select randomized dimension targets
        $domain = $preferredDomain && in_array($preferredDomain, self::DOMAINS, true)
            ? $preferredDomain
            : self::DOMAINS[array_rand(self::DOMAINS)];
        $stakeholder = self::STAKEHOLDERS[array_rand(self::STAKEHOLDERS)];
        $tension = self::TENSIONS[array_rand(self::TENSIONS)];

        // 3. Attempt AI generation with resilient timeout
        $generatedData = null;
        try {
            $prompt = $this->buildPrompt($difficulty, $domain, $stakeholder, $tension, $recentTitles);
            $schema = $this->getSchema();

            $rawResponse = $this->aiManager->generate($prompt, $schema, ['timeout' => 8]);
            if (is_array($rawResponse) && !empty($rawResponse['title']) && !empty($rawResponse['prompt_text'])) {
                $generatedData = $rawResponse;
            }
        } catch (\Throwable $e) {
            Log::warning("Dynamic topic generation via AI failed or timed out: " . $e->getMessage() . ". Using curated fallback.");
        }

        // 4. Fallback if AI was unavailable or invalid
        if (!$generatedData) {
            $generatedData = $this->generateCuratedFallback($difficulty, $domain, $stakeholder, $tension, $recentTitles);
        }

        // 5. Persist scenario to database
        $minWordLimit = (int) ($generatedData['min_word_limit'] ?? 80);
        $maxWordLimit = (int) ($generatedData['max_word_limit'] ?? 250);
        $recMin = (int) ($generatedData['recommended_min_words'] ?? 120);
        $recMax = (int) ($generatedData['recommended_max_words'] ?? 180);

        return CommunicationScenario::create([
            'category' => 'PROFESSIONAL_EMAIL',
            'title' => mb_substr(trim($generatedData['title']), 0, 250),
            'context_scenario' => trim($generatedData['context_scenario']),
            'target_audience' => mb_substr(trim($generatedData['target_audience']), 0, 100),
            'prompt_text' => trim($generatedData['prompt_text']),
            'difficulty' => $difficulty,
            'min_word_limit' => max(40, min(120, $minWordLimit)),
            'max_word_limit' => max(200, min(500, $maxWordLimit)),
            'recommended_min_words' => max(60, min(150, $recMin)),
            'recommended_max_words' => max(140, min(250, $recMax)),
            'key_focus_areas' => is_array($generatedData['key_focus_areas'] ?? null)
                ? array_slice($generatedData['key_focus_areas'], 0, 5)
                : ['Tone Calibration', 'Executive Summary', 'Clear Call-to-Action', 'Risk Mitigation'],
            'curated_factual_guidance' => $generatedData['curated_factual_guidance'] ?? 'Maintain high executive clarity, diplomatic accountability, and structured actionable next steps.',
            'is_dynamic' => true,
            'generated_by_student_id' => $student->id,
            'is_active' => true,
            'prompt_generation_metadata' => [
                'domain' => $domain,
                'stakeholder' => $stakeholder,
                'tension' => $tension,
                'difficulty' => $difficulty,
                'generated_at' => now()->toIso8601String(),
                'generator_mode' => $generatedData['generator_mode'] ?? 'AI_GENERATED',
            ],
        ]);
    }

    /**
     * Build the LLM prompt for dynamic topic creation.
     */
    protected function buildPrompt(string $difficulty, string $domain, string $stakeholder, string $tension, array $recentTitles): string
    {
        $excludeBlock = empty($recentTitles)
            ? "None (first exercise)"
            : implode(", ", array_map(fn($t) => "\"{$t}\"", $recentTitles));

        return "You are an expert corporate communications director in high-growth technology firms.\n"
            . "Generate a realistic, immersive, and workplace-authentic email writing scenario for an engineering or business student.\n\n"
            . "STUDENT PROFILE & CONSTRAINTS:\n"
            . "- Category: PROFESSIONAL_EMAIL\n"
            . "- Target Difficulty: {$difficulty}\n"
            . "- Exclude previously completed scenarios: {$excludeBlock}\n\n"
            . "DIVERSITY DIMENSIONS:\n"
            . "- Workplace Domain: {$domain}\n"
            . "- Stakeholder Target: {$stakeholder}\n"
            . "- Core Tension: {$tension}\n\n"
            . "REQUIREMENTS:\n"
            . "1. The scenario must place the student in an authentic modern tech role (e.g. Associate Software Engineer, Junior DevOps Engineer, Technical Solutions Specialist).\n"
            . "2. The prompt_text must give unambiguous drafting directions (who to write to, key questions to answer, required tone).\n"
            . "3. Word limits: min 80, max 250 words; recommended 120 to 180 words.\n"
            . "4. Output strictly valid JSON matching the specified schema.";
    }

    /**
     * Structured schema for generation.
     */
    protected function getSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'title' => ['type' => 'string'],
                'context_scenario' => ['type' => 'string'],
                'target_audience' => ['type' => 'string'],
                'prompt_text' => ['type' => 'string'],
                'difficulty' => ['type' => 'string', 'enum' => ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']],
                'min_word_limit' => ['type' => 'integer'],
                'max_word_limit' => ['type' => 'integer'],
                'recommended_min_words' => ['type' => 'integer'],
                'recommended_max_words' => ['type' => 'integer'],
                'key_focus_areas' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'curated_factual_guidance' => ['type' => 'string'],
                'rubric_special_instructions' => ['type' => 'string'],
            ],
            'required' => [
                'title',
                'context_scenario',
                'target_audience',
                'prompt_text',
                'difficulty',
                'min_word_limit',
                'max_word_limit',
                'recommended_min_words',
                'recommended_max_words',
                'key_focus_areas',
                'curated_factual_guidance',
            ],
        ];
    }

    /**
     * Fallback scenario generator when AI service is unavailable or times out.
     */
    protected function generateCuratedFallback(string $difficulty, string $domain, string $stakeholder, string $tension, array $recentTitles): array
    {
        $templates = [
            [
                'title' => "Incident Escalation: {$domain} Pipeline Interruption",
                'context_scenario' => "During today's automated deployment cycle in the {$domain} environment, a critical configuration drift caused transient latency spikes and affected customer checkout calls for 42 minutes. The issue was mitigated via rollback, but enterprise clients have started inquiring about permanent root-cause prevention and SLA implications.",
                'target_audience' => $stakeholder,
                'prompt_text' => "Draft a professional incident notification email to the stakeholder. Acknowledge the interruption with immediate ownership, outline the temporary mitigation applied, summarize the permanent architectural fix underway, and propose a follow-up review schedule without over-promising impossible turnaround times.",
                'key_focus_areas' => ['Ownership & Accountability', 'Technical Brevity', 'De-escalation Tone', 'Actionable Next Steps'],
                'curated_factual_guidance' => 'Emphasize root-cause transparency, avoid defensive blame towards third-party suppliers, and establish clear follow-up timelines.',
            ],
            [
                'title' => "Milestone Re-alignment: {$domain} Scope Negotiation",
                'context_scenario' => "Your cross-functional engineering squad is two weeks away from delivering the Q3 milestone for {$domain}. However, newly discovered schema dependencies require an extra sprint of refactoring to ensure data integrity and prevent security compliance violations. A key stakeholder expects delivery by Friday.",
                'target_audience' => $stakeholder,
                'prompt_text' => "Write a structured realignment email. Explain the technical trade-off between rushing an unverified schema versus extending the timeline by one sprint. Provide two concrete compromise options (such as phased feature flags or dark launching) and request a 15-minute decision check-in.",
                'key_focus_areas' => ['Trade-off Framing', 'Options Presentation', 'Diplomatic Firmness', 'Decisive Call-to-Action'],
                'curated_factual_guidance' => 'Articulate business risks clearly, avoid overly dense technical jargon, and present well-reasoned compromise options.',
            ],
            [
                'title' => "Client Advisory: Security Patch Scheduling for {$domain}",
                'context_scenario' => "A critical zero-day advisory was released that affects our production clustering in {$domain}. A maintenance window of 90 minutes is urgently needed between 02:00 UTC and 03:30 UTC this Thursday. Premium enterprise customers must be informed with adequate notice to minimize disruption to their scheduled batch operations.",
                'target_audience' => $stakeholder,
                'prompt_text' => "Compose a high-priority advisory email explaining the necessity of the emergency maintenance. Provide the exact maintenance window in both UTC and local time zones, describe the expected impact (read-only mode), and direct questions to the dedicated escalation bridge.",
                'key_focus_areas' => ['Clear Operational Guidance', 'Urgency Without Panic', 'Precise Time Windows', 'Contact Routing'],
                'curated_factual_guidance' => 'Ensure precise operational windows are stated, emergency contact procedures are clear, and client reassurance is maintained.',
            ],
        ];

        // Pick one that is not in recent titles
        $selected = $templates[array_rand($templates)];
        foreach ($templates as $tmpl) {
            if (!in_array($tmpl['title'], $recentTitles, true)) {
                $selected = $tmpl;
                break;
            }
        }

        return array_merge($selected, [
            'difficulty' => $difficulty,
            'min_word_limit' => 80,
            'max_word_limit' => 250,
            'recommended_min_words' => 120,
            'recommended_max_words' => 180,
            'generator_mode' => 'CURATED_FALLBACK',
            'rubric_special_instructions' => 'Assess professional tone calibration, clarity of call-to-action, and adherence to business communication standards.',
        ]);
    }
}
