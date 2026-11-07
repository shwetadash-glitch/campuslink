<?php

namespace App\Services\Resume;

use App\Models\Student;

class ResumeQualityAnalysisService
{
    protected ResumeContentGeneratorService $contentGenerator;

    public function __construct(ResumeContentGeneratorService $contentGenerator)
    {
        $this->contentGenerator = $contentGenerator;
    }

    /**
     * Comprehensive quality, ATS compatibility, and audit analysis.
     */
    public function analyze(Student $student, array $content): array
    {
        $issues = [];
        $recommendations = [];

        // 1. Completeness Check (Max 30 pts)
        $completenessScore = 0;
        $personal = $content['personal_info'] ?? [];

        if (!empty($personal['full_name']) && !empty($personal['email'])) {
            $completenessScore += 10;
        } else {
            $issues[] = ['section' => 'personal_info', 'issue' => 'Missing contact full name or email.'];
        }

        if (!empty($personal['phone']) || !empty($personal['linkedin_url']) || !empty($personal['github_url'])) {
            $completenessScore += 5;
        } else {
            $issues[] = ['section' => 'personal_info', 'issue' => 'Adding LinkedIn or GitHub profiles significantly enhances technical visibility.'];
        }

        if (!empty($content['summary']) && strlen($content['summary']) > 50) {
            $completenessScore += 5;
        } else {
            $issues[] = ['section' => 'summary', 'issue' => 'Professional summary is absent or too brief.'];
        }

        if (!empty($content['skills']) && count($content['skills']) >= 4) {
            $completenessScore += 5;
        } else {
            $issues[] = ['section' => 'skills', 'issue' => 'List at least 4 key technical skills.'];
        }

        if (!empty($content['projects']) && count($content['projects']) >= 1) {
            $completenessScore += 5;
        } else {
            $issues[] = ['section' => 'projects', 'issue' => 'Include at least one capstone or technical course project.'];
        }

        // Normalize completeness score to 0-100 scale
        $completenessPercentage = (int) round(($completenessScore / 30) * 100);

        // 2. Readability & Formatting Analysis (0 - 100)
        $readabilityScore = 85;
        $summary = $content['summary'] ?? '';
        $wordCount = str_word_count($summary);

        if ($wordCount > 100) {
            $readabilityScore -= 15;
            $issues[] = ['section' => 'summary', 'issue' => 'Professional summary exceeds 100 words. Keep it concise (50-80 words).'];
        }

        // Check project descriptions for bullet points vs walls of text
        $projects = $content['projects'] ?? [];
        foreach ($projects as $idx => $proj) {
            $desc = $proj['description'] ?? '';
            if (strlen($desc) > 300 && !str_contains($desc, "\n") && !str_contains($desc, "•") && !str_contains($desc, "-")) {
                $readabilityScore -= 10;
                $issues[] = [
                    'section' => 'projects',
                    'issue' => "Project '" . ($proj['title'] ?? "Project " . ($idx + 1)) . "' is written as a dense paragraph. Convert into 2-3 bullet points starting with action verbs.",
                ];
                break;
            }
        }
        $readabilityScore = max(40, $readabilityScore);

        // 3. ATS Compatibility Check (0 - 100)
        $atsScore = 90;
        $standardSections = ['summary', 'skills', 'projects', 'education'];
        $sectionOrder = $content['section_order'] ?? [];

        foreach ($standardSections as $sec) {
            if (!in_array($sec, $sectionOrder)) {
                $atsScore -= 10;
                $issues[] = ['section' => $sec, 'issue' => "Missing standard ATS section header: " . ucfirst($sec)];
            }
        }

        if (empty($content['academic_history'])) {
            $atsScore -= 15;
            $issues[] = ['section' => 'education', 'issue' => 'ATS systems require clear educational degree credentials.'];
        }
        $atsScore = max(40, $atsScore);

        // 4. Unsupported Claims & Contradiction Detection
        $unsupportedClaims = $this->contentGenerator->detectUnsupportedClaims($student, $content);

        // 5. Overall Quality Score
        $overallQuality = (int) round(
            ($completenessPercentage * 0.40) +
            ($readabilityScore * 0.30) +
            ($atsScore * 0.30)
        );

        if (!empty($unsupportedClaims)) {
            $overallQuality = max(30, $overallQuality - (count($unsupportedClaims) * 5));
        }

        // 6. Actionable Recommendations
        if ($completenessPercentage < 80) {
            $recommendations[] = "Complete your profile information including projects, technical certifications, and portfolio links.";
        }
        if ($readabilityScore < 80) {
            $recommendations[] = "Use concise bullet points beginning with action verbs (e.g. 'Architected', 'Implemented', 'Deployed') instead of narrative paragraphs.";
        }
        if (!empty($unsupportedClaims)) {
            $recommendations[] = "Resolve unverified skills and contradictory CGPA entries to ensure strict grounding in institutional records.";
        }
        if ($atsScore < 90) {
            $recommendations[] = "Ensure all standard section headers (Summary, Skills, Projects, Education) are enabled and properly sequenced.";
        }

        return [
            'quality_score' => $overallQuality,
            'ats_score' => $atsScore,
            'completeness_score' => $completenessPercentage,
            'readability_score' => $readabilityScore,
            'issues' => $issues,
            'unsupported_claims' => $unsupportedClaims,
            'recommendations' => $recommendations,
            'analyzed_at' => now()->toIso8601String(),
        ];
    }
}
