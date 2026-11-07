<?php

namespace App\Services\Resume;

use App\Models\Student;
use App\Models\Job;
use App\Services\AI\AiManager;
use App\Exceptions\AiServiceUnavailableException;

class JobDescriptionAnalyzerService
{
    protected AiManager $aiManager;

    public function __construct(AiManager $aiManager)
    {
        $this->aiManager = $aiManager;
    }

    /**
     * Analyze a job description against candidate profile and generate evidence-based tailoring suggestions.
     */
    public function analyze(Student $student, array $resumeContent, string $jobDescription, ?int $jobId = null): array
    {
        // 1. If jobId provided, load job requirements from DB as baseline facts
        $dbRequiredSkills = [];
        if ($jobId) {
            $job = Job::with('requirements')->find($jobId);
            if ($job && $job->requirements) {
                $dbRequiredSkills = $job->requirements->pluck('skill_name')->all();
            }
        }

        // 2. Extract keywords and skills from JD
        $extractedSkills = $this->extractSkillsFromDescription($jobDescription, $dbRequiredSkills);

        // 3. Extract candidate's existing skills from resume and student profile
        $candidateSkills = collect($resumeContent['skills'] ?? [])
            ->map(fn($s) => is_array($s) ? ($s['name'] ?? '') : (string) $s)
            ->filter()
            ->values()
            ->all();

        $candidateSkillsLower = array_map('strtolower', $candidateSkills);

        // 4. Compare matching vs missing
        $matchingSkills = [];
        $missingSkills = [];

        foreach ($extractedSkills as $reqSkill) {
            $reqLower = strtolower($reqSkill);
            $matched = false;

            foreach ($candidateSkillsLower as $candSkill) {
                if ($candSkill === $reqLower || str_contains($candSkill, $reqLower) || str_contains($reqLower, $candSkill)) {
                    $matchingSkills[] = $reqSkill;
                    $matched = true;
                    break;
                }
            }

            if (!$matched) {
                $missingSkills[] = $reqSkill;
            }
        }

        // 5. Calculate Match Score (0 - 100)
        $totalRequired = count($extractedSkills);
        $matchedCount = count($matchingSkills);
        $matchScore = $totalRequired > 0 ? (int) round(($matchedCount / $totalRequired) * 100) : 75;

        // 6. Generate Evidence-Based Recommendations with Detailed Rationale
        $recommendations = [];

        if (!empty($missingSkills)) {
            $missingList = implode(', ', array_slice($missingSkills, 0, 4));
            $recommendations[] = [
                'type' => 'KEYWORD_OPTIMIZATION',
                'priority' => 'HIGH',
                'title' => 'Incorporate Target Keywords',
                'message' => "The job requisition explicitly seeks skills in {$missingList}.",
                'rationale' => "Applicant Tracking Systems (ATS) rank candidates by keyword frequency. If you have foundational knowledge, academic coursework, or lab experience in these areas, explicitly mention them under Technical Skills or Coursework.",
            ];
        }

        // Check if any projects highlight matching skills
        $projectTexts = collect($resumeContent['projects'] ?? [])
            ->map(fn($p) => ($p['title'] ?? '') . ' ' . ($p['description'] ?? '') . ' ' . ($p['technologies'] ?? ''))
            ->implode(' ');

        $projectsNeedKeywords = false;
        foreach ($matchingSkills as $skill) {
            if (!str_contains(strtolower($projectTexts), strtolower($skill))) {
                $projectsNeedKeywords = true;
                break;
            }
        }

        if ($projectsNeedKeywords && !empty($resumeContent['projects'])) {
            $recommendations[] = [
                'type' => 'PROJECT_ALIGNMENT',
                'priority' => 'MEDIUM',
                'title' => 'Align Project Descriptions with Job Stack',
                'message' => 'Integrate keywords like ' . implode(', ', array_slice($matchingSkills, 0, 3)) . ' directly into your project bullet points.',
                'rationale' => 'Recruiters look for practical application of required technologies. Describing how you used these tools in specific capstone deliverables significantly increases interview shortlist rates.',
            ];
        }

        // Tailored Professional Summary Recommendation
        $recommendations[] = [
            'type' => 'SUMMARY_TAILORING',
            'priority' => 'MEDIUM',
            'title' => 'Tailor Professional Summary',
            'message' => 'Customize your summary to address the key responsibilities highlighted in this job requisition.',
            'rationale' => 'A customized summary demonstrates intentional interest and immediately clarifies how your academic background matches the employer’s technical mission.',
        ];

        return [
            'status' => 'success',
            'job_match_score' => $matchScore,
            'is_simulated' => $this->aiManager->getProviderName() === 'mock',
            'provider' => $this->aiManager->getProviderName(),
            'extracted_skills' => $extractedSkills,
            'matching_skills' => array_values(array_unique($matchingSkills)),
            'missing_skills' => array_values(array_unique($missingSkills)),
            'recommendations' => $recommendations,
            'analyzed_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Extract relevant technology skills from job description text.
     */
    protected function extractSkillsFromDescription(string $text, array $knownSkills = []): array
    {
        $commonTechKeywords = [
            'PHP', 'Laravel', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot',
            'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Vue.js',
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQL',
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Git',
            'REST APIs', 'GraphQL', 'Microservices', 'Distributed Systems',
            'Data Structures', 'Algorithms', 'OOP', 'Linux', 'Unit Testing',
        ];

        $allKeywords = array_unique(array_merge($commonTechKeywords, $knownSkills));
        $found = [];

        foreach ($allKeywords as $kw) {
            // Case-insensitive word boundary check
            $pattern = '/\b' . preg_quote($kw, '/') . '\b/i';
            if (preg_match($pattern, $text)) {
                $found[] = $kw;
            }
        }

        // If very few detected via regex and JD is substantial, supplement with known keywords
        if (empty($found) && !empty($knownSkills)) {
            $found = $knownSkills;
        }

        return !empty($found) ? array_values(array_unique($found)) : ['Problem Solving', 'Software Engineering', 'Communication', 'Teamwork'];
    }
}
