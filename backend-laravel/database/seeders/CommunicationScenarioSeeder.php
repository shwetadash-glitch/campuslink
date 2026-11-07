<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CommunicationScenario;
use App\Enums\CommunicationCategory;

class CommunicationScenarioSeeder extends Seeder
{
    public function run(): void
    {
        $scenarios = [
            // -------------------------------------------------------------
            // 1. HR_INTERVIEW
            // -------------------------------------------------------------
            [
                'category' => CommunicationCategory::HR_INTERVIEW->value,
                'title' => 'Articulating 3-Year Career Aspirations',
                'prompt_text' => 'Where do you see yourself professionally in three years, and how does this role align with your long-term engineering ambitions?',
                'context_scenario' => 'You are in the final behavioral round with the Head of Campus Talent at a high-growth cloud infrastructure company.',
                'target_audience' => 'HR Talent Director & Engineering Leadership',
                'difficulty' => 'BEGINNER',
                'min_word_limit' => 30,
                'max_word_limit' => 350,
                'recommended_min_words' => 75,
                'recommended_max_words' => 200,
                'key_focus_areas' => ['Long-term vision', 'Specific learning milestones', 'Alignment with company mission'],
                'curated_factual_guidance' => 'Focus on realistic software engineering growth milestones (e.g. progressing from feature implementation to component ownership and architectural design).',
            ],
            [
                'category' => CommunicationCategory::HR_INTERVIEW->value,
                'title' => 'Navigating Ambiguity and Shifting Requirements',
                'prompt_text' => 'Describe a project where requirements were vague or rapidly changing. How did you maintain momentum and deliver results?',
                'context_scenario' => 'You are interviewing for an Associate Product Engineer role where priorities pivot based on early customer feedback.',
                'target_audience' => 'Senior Engineering Manager',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 40,
                'max_word_limit' => 400,
                'recommended_min_words' => 100,
                'recommended_max_words' => 250,
                'key_focus_areas' => ['Proactive requirement discovery', 'Iterative milestone breakdown', 'Stakeholder alignment'],
                'curated_factual_guidance' => 'Candidate should describe identifying key stakeholders, establishing assumptions, and creating small testable increments.',
            ],
            [
                'category' => CommunicationCategory::HR_INTERVIEW->value,
                'title' => 'Discussing Role Scope and Compensation Expectations',
                'prompt_text' => 'How do you approach evaluating whether an employment offer aligns with market standards and your career expectations?',
                'context_scenario' => 'You are participating in an initial HR alignment conversation prior to formal offer dispatch.',
                'target_audience' => 'HR Business Partner',
                'difficulty' => 'ADVANCED',
                'min_word_limit' => 30,
                'max_word_limit' => 300,
                'recommended_min_words' => 60,
                'recommended_max_words' => 180,
                'key_focus_areas' => ['Professional diplomacy', 'Total rewards understanding', 'Focus on mutual value'],
                'curated_factual_guidance' => 'Professional compensation discussions should balance market benchmarking, growth opportunities, and total rewards (learning, equity, base) without rigid ultimatums.',
            ],

            // -------------------------------------------------------------
            // 2. TECHNICAL_EXPLANATION
            // -------------------------------------------------------------
            [
                'category' => CommunicationCategory::TECHNICAL_EXPLANATION->value,
                'title' => 'Explaining Database Indexing to a Non-Technical PM',
                'prompt_text' => 'Explain why our application dashboard is slow and how adding a database index (B-Tree) will resolve the query latency, using plain language.',
                'context_scenario' => 'Your non-technical Product Manager wants to know why search is sluggish and why engineering needs half a sprint to tune database queries.',
                'target_audience' => 'Non-Technical Product Manager',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 40,
                'max_word_limit' => 450,
                'recommended_min_words' => 90,
                'recommended_max_words' => 250,
                'key_focus_areas' => ['Intuitive analogy (e.g. book index)', 'Trade-off transparency (faster reads, slower writes)', 'Clear business impact'],
                'curated_factual_guidance' => 'A database index allows the engine to locate records in O(log n) time without scanning all rows (full table scan). The key trade-off is additional storage and slight overhead during INSERT/UPDATE operations.',
            ],
            [
                'category' => CommunicationCategory::TECHNICAL_EXPLANATION->value,
                'title' => 'Explaining Cache Invalidation and Eventual Consistency',
                'prompt_text' => 'Explain to an intern why a user might temporarily see outdated profile details after updating their avatar, and how our cache invalidation handles it.',
                'context_scenario' => 'You are mentoring a junior intern who noticed a 2-second discrepancy between user profile updates and CDN/Redis cache refresh.',
                'target_audience' => 'Junior Software Engineering Intern',
                'difficulty' => 'ADVANCED',
                'min_word_limit' => 50,
                'max_word_limit' => 450,
                'recommended_min_words' => 100,
                'recommended_max_words' => 250,
                'key_focus_areas' => ['Clarity of technical trade-offs', 'Supportive coaching tone', 'Mechanics of TTL and write-through cache'],
                'curated_factual_guidance' => 'Eventual consistency allows high read throughput by caching data near users. When updates occur, caches are invalidated via TTL or pub/sub events; there is a brief propagation window where stale reads can occur.',
            ],
            [
                'category' => CommunicationCategory::TECHNICAL_EXPLANATION->value,
                'title' => 'Microservices vs Monolith Latency Trade-Offs',
                'prompt_text' => 'A business director asks why splitting our monolith into microservices increased network latency for a single checkout request. Explain this clearly.',
                'context_scenario' => 'A quarterly business review where leadership questions why microservice migration introduced multi-hop latency.',
                'target_audience' => 'Business Director & Non-Engineering Stakeholders',
                'difficulty' => 'ADVANCED',
                'min_word_limit' => 50,
                'max_word_limit' => 450,
                'recommended_min_words' => 100,
                'recommended_max_words' => 250,
                'key_focus_areas' => ['Network hop serialization', 'Clear justification of microservice benefits (independent scaling)', 'Remediation options'],
                'curated_factual_guidance' => 'In-process memory calls in a monolith take microseconds. Microservices communicate over HTTP/gRPC networks adding serialization, network transit, and connection handshake overhead, compensated by independent scaling and fault isolation.',
            ],

            // -------------------------------------------------------------
            // 3. GROUP_DISCUSSION
            // -------------------------------------------------------------
            [
                'category' => CommunicationCategory::GROUP_DISCUSSION->value,
                'title' => 'Constructive Disagreement on Architectural Frameworks',
                'prompt_text' => 'A peer in a campus recruitment group discussion strongly insists on using MongoDB for a financial transaction ledger. Articulate your constructive disagreement.',
                'context_scenario' => 'You are in a 6-candidate campus placement group discussion evaluating a FinTech ledger architecture.',
                'target_audience' => 'Recruitment Panel and Peer Candidates',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 30,
                'max_word_limit' => 350,
                'recommended_min_words' => 70,
                'recommended_max_words' => 180,
                'key_focus_areas' => ['Validating peer perspective', 'Presenting ACID transaction requirements objectively', 'Collaborative framing'],
                'curated_factual_guidance' => 'Financial ledgers require strict ACID guarantees and relational constraints to avoid double-entry imbalance. Relational databases (e.g. PostgreSQL) provide robust transactional guarantees compared to document stores.',
            ],
            [
                'category' => CommunicationCategory::GROUP_DISCUSSION->value,
                'title' => 'Steering a Derailing Discussion Back to Core Problem',
                'prompt_text' => 'The group discussion has spent 10 minutes debating CSS color schemes instead of disaster recovery planning. Interject politely and refocus the group.',
                'context_scenario' => 'A collaborative campus placement case-study exercise with 15 minutes remaining.',
                'target_audience' => 'Peer Team Members and Evaluator Observers',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 25,
                'max_word_limit' => 250,
                'recommended_min_words' => 50,
                'recommended_max_words' => 150,
                'key_focus_areas' => ['Diplomatic interjection', 'Time management awareness', 'Action-oriented redirection'],
                'curated_factual_guidance' => 'Effective leadership involves acknowledging the team energy while anchoring back to primary deliverables and remaining time constraints.',
            ],
            [
                'category' => CommunicationCategory::GROUP_DISCUSSION->value,
                'title' => 'Synthesizing Conflicting Viewpoints into Consensus',
                'prompt_text' => 'Two candidates are deadlocked between building an internal tool vs buying an off-the-shelf SaaS solution. Synthesize both sides into a balanced recommendation.',
                'context_scenario' => 'Campus placement group discussion case study evaluating corporate IT modernization.',
                'target_audience' => 'Group Discussion Candidates and Facilitator',
                'difficulty' => 'ADVANCED',
                'min_word_limit' => 35,
                'max_word_limit' => 350,
                'recommended_min_words' => 75,
                'recommended_max_words' => 200,
                'key_focus_areas' => ['Summarizing core arguments accurately', 'Proposing hybrid evaluation criteria', 'Fostering unity'],
                'curated_factual_guidance' => 'A balanced build-vs-buy analysis weighs total cost of ownership, time to market, core vs context functionality, and maintenance overhead.',
            ],

            // -------------------------------------------------------------
            // 4. PROFESSIONAL_EMAIL
            // -------------------------------------------------------------
            [
                'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
                'title' => 'Escalating an Unforeseen Sprint Blocker',
                'prompt_text' => 'Draft a concise, professional email to your Engineering Lead and Project Manager informing them that a third-party payment gateway outage will delay tomorrow\'s release.',
                'context_scenario' => 'It is 4:00 PM on Thursday; the external sandbox environment has suffered an unannounced outage, blocking end-to-end payment testing.',
                'target_audience' => 'Engineering Lead and Project Manager',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 30,
                'max_word_limit' => 300,
                'recommended_min_words' => 60,
                'recommended_max_words' => 180,
                'key_focus_areas' => ['Clear executive summary up front', 'Impact scope', 'Mitigation steps and proposed timeline'],
                'curated_factual_guidance' => 'Escalation emails should clearly state the issue, concrete business impact, mitigation steps already taken, and clear next decision points.',
            ],
            [
                'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
                'title' => 'Interview Follow-Up and Gratitude Note',
                'prompt_text' => 'Write a professional follow-up email to an engineering interviewer expressing gratitude for a technical round discussing distributed cache invalidation.',
                'context_scenario' => 'You completed a 60-minute technical interview yesterday with a Staff Engineer at your top-choice placement partner.',
                'target_audience' => 'Staff Software Engineer Interviewer',
                'difficulty' => 'BEGINNER',
                'min_word_limit' => 25,
                'max_word_limit' => 250,
                'recommended_min_words' => 50,
                'recommended_max_words' => 150,
                'key_focus_areas' => ['Genuine appreciation', 'Specific technical recall from the discussion', 'Reiteration of enthusiasm'],
                'curated_factual_guidance' => 'A strong follow-up email references a specific technical problem discussed during the interview and expresses professional gratitude without sounding presumptuous.',
            ],
            [
                'category' => CommunicationCategory::PROFESSIONAL_EMAIL->value,
                'title' => 'Requesting Cross-Team API Schema Collaboration',
                'prompt_text' => 'Write an email to another team\'s Engineering Lead requesting a breaking schema change to an internal user identity endpoint to support your team\'s mobile initiative.',
                'context_scenario' => 'Your team needs the User Service to expose tenant UUIDs in the profile payload, which requires a non-breaking versioned migration.',
                'target_audience' => 'Peer Engineering Lead (User Service)',
                'difficulty' => 'ADVANCED',
                'min_word_limit' => 40,
                'max_word_limit' => 350,
                'recommended_min_words' => 80,
                'recommended_max_words' => 220,
                'key_focus_areas' => ['Clear business rationale', 'Proposed non-breaking versioning strategy', 'Call to schedule a 15-minute sync'],
                'curated_factual_guidance' => 'Cross-team API change requests should respect the owning team\'s backlog, propose versioned or additive changes to avoid breaking existing consumers, and offer engineering assistance.',
            ],

            // -------------------------------------------------------------
            // 5. STRUCTURED_SPEAKING
            // -------------------------------------------------------------
            [
                'category' => CommunicationCategory::STRUCTURED_SPEAKING->value,
                'title' => '2-Minute Elevator Pitch for Capstone Project',
                'prompt_text' => 'Draft the written script of your 2-minute elevator pitch explaining your capstone distributed key-value store to a hiring manager at a campus job fair.',
                'context_scenario' => 'You have 90 seconds to capture the interest of a Senior Cloud Architect visiting your university placement booth.',
                'target_audience' => 'Senior Cloud Architect',
                'difficulty' => 'INTERMEDIATE',
                'min_word_limit' => 40,
                'max_word_limit' => 400,
                'recommended_min_words' => 90,
                'recommended_max_words' => 220,
                'key_focus_areas' => ['Hook and problem framing', 'Technical architecture highlight (consensus, replication)', 'Measurable performance outcome'],
                'curated_factual_guidance' => 'An effective technical pitch states the problem, describes the architecture (e.g. Raft consensus, LSM-tree storage engine), and highlights concrete benchmark metrics (e.g. 10k ops/sec with sub-5ms p99 latency).',
            ],
            [
                'category' => CommunicationCategory::STRUCTURED_SPEAKING->value,
                'title' => 'Incident Post-Mortem Executive Briefing',
                'prompt_text' => 'Draft the introductory 2-minute spoken briefing summarizing a major database connection pool exhaustion incident that caused a 20-minute outage.',
                'context_scenario' => 'You are opening the blameless post-mortem review with the VP of Engineering and Operations leads.',
                'target_audience' => 'VP of Engineering and Operations Team',
                'difficulty' => 'ADVANCED',
                'min_word_limit' => 50,
                'max_word_limit' => 450,
                'recommended_min_words' => 100,
                'recommended_max_words' => 250,
                'key_focus_areas' => ['Blameless framing', 'Clear timeline and blast radius', 'Root cause and permanent preventive actions'],
                'curated_factual_guidance' => 'Blameless post-mortems focus on systemic vulnerabilities (e.g. unpooled connection leak under traffic spikes, lack of circuit breaker) rather than individual human error, outlining permanent preventative safeguards.',
            ],
            [
                'category' => CommunicationCategory::STRUCTURED_SPEAKING->value,
                'title' => 'Project Kick-Off Address to Cross-Functional Team',
                'prompt_text' => 'Draft the opening remarks for a sprint kick-off meeting where Engineering, Design, and QA are collaborating on a new mobile onboarding flow.',
                'context_scenario' => 'You are the student team lead launching a 4-week capstone sprint with multidisciplinary team members.',
                'target_audience' => 'Cross-Functional Team (Designers, Developers, QA)',
                'difficulty' => 'BEGINNER',
                'min_word_limit' => 35,
                'max_word_limit' => 350,
                'recommended_min_words' => 70,
                'recommended_max_words' => 200,
                'key_focus_areas' => ['Inspirational tone', 'Clarifying shared success metrics', 'Inviting cross-discipline participation'],
                'curated_factual_guidance' => 'Kick-off remarks unify the team around user outcomes, clarify the timeline, define channels for raising blockers, and establish psychological safety for collaboration.',
            ],
        ];

        foreach ($scenarios as $data) {
            CommunicationScenario::updateOrCreate(
                [
                    'category' => $data['category'],
                    'title' => $data['title'],
                ],
                $data
            );
        }
    }
}
