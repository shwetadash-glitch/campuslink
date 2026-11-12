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
     * Comprehensive quality, ATS compatibility, keyword matching, and audit analysis.
     * Evaluates both Fresher and Experienced resumes.
     */
    public function analyze(Student $student, array $content): array
    {
        $issues = [];
        $recommendations = [];
        $strengths = [];

        $personal = $content['personal_info'] ?? [];
        $workExperience = $content['work_experience'] ?? ($content['experience'] ?? []);
        $projects = $content['projects'] ?? [];
        $skills = $content['skills'] ?? [];
        $academicHistory = $content['academic_history'] ?? [];
        $certifications = $content['certifications'] ?? [];

        $isExperienced = !empty($workExperience) && count($workExperience) > 0;

        // 1. Completeness Check (0 - 100)
        $completenessScore = 0;
        if (!empty($personal['full_name']) && strlen(trim($personal['full_name'])) >= 2) {
            $completenessScore += 25;
            $strengths[] = "Full legal name present for recruiter identification.";
        } else {
            $issues[] = ['section' => 'personal_info', 'severity' => 'HIGH', 'issue' => 'Missing candidate full name.'];
        }

        if (!empty($personal['email']) && filter_var($personal['email'], FILTER_VALIDATE_EMAIL)) {
            $completenessScore += 25;
        } else {
            $issues[] = ['section' => 'personal_info', 'severity' => 'HIGH', 'issue' => 'Missing or invalid contact email address.'];
        }

        if (!empty($personal['phone']) && strlen(preg_replace('/[^0-9]/', '', $personal['phone'])) >= 8) {
            $completenessScore += 15;
        } else {
            $issues[] = ['section' => 'personal_info', 'severity' => 'MEDIUM', 'issue' => 'Missing valid phone number for recruiter screening.'];
        }

        if (!empty($personal['linkedin_url']) || !empty($personal['github_url']) || !empty($personal['portfolio_url'])) {
            $completenessScore += 15;
            $strengths[] = "Professional profile / repository links provided.";
        } else {
            $issues[] = ['section' => 'personal_info', 'severity' => 'LOW', 'issue' => 'Adding a LinkedIn or GitHub profile link increases recruiter callback rates.'];
        }

        if (!empty($content['summary']) && strlen(trim($content['summary'])) >= 40) {
            $completenessScore += 10;
        } else {
            $issues[] = ['section' => 'summary', 'severity' => 'MEDIUM', 'issue' => 'Professional summary is absent or too brief. Provide a 2-4 sentence executive overview.'];
        }

        if (!empty($skills) && count($skills) >= 4) {
            $completenessScore += 10;
        } else {
            $issues[] = ['section' => 'skills', 'severity' => 'HIGH', 'issue' => 'List at least 4 key technical skills or competencies.'];
        }
        $completenessScore = min(100, $completenessScore);

        // 2. ATS Compatibility Analysis (0 - 100)
        $atsScore = 100;
        $standardSections = ['summary', 'skills', 'education'];
        if ($isExperienced) {
            $standardSections[] = 'work_experience';
        } else {
            $standardSections[] = 'projects';
        }

        $sectionOrder = $content['section_order'] ?? [];
        foreach ($standardSections as $sec) {
            if (!in_array($sec, $sectionOrder)) {
                $atsScore -= 10;
                $issues[] = ['section' => $sec, 'severity' => 'HIGH', 'issue' => 'Missing standard ATS section heading: ' . ucfirst(str_replace('_', ' ', $sec))];
            }
        }

        if (empty($academicHistory)) {
            $atsScore -= 15;
            $issues[] = ['section' => 'education', 'severity' => 'HIGH', 'issue' => 'ATS screeners require clear educational institution and degree credentials.'];
        } else {
            $strengths[] = "Clear educational credentials formatted for automated parsing.";
        }

        // Action verb evaluation across bullets
        $actionVerbs = [
            'architected', 'engineered', 'developed', 'spearheaded', 'implemented',
            'designed', 'optimized', 'streamlined', 'integrated', 'refactored',
            'automated', 'built', 'orchestrated', 'deployed', 'collaborated',
            'analyzed', 'configured', 'administered', 'delivered', 'tested'
        ];

        $totalBullets = 0;
        $actionVerbCount = 0;

        // Check work experience bullets
        foreach ($workExperience as $exp) {
            $highlights = $exp['highlights'] ?? [];
            foreach ($highlights as $hl) {
                $totalBullets++;
                $firstWord = strtolower(strtok(trim($hl), " \t\n\r\0\x0B,."));
                if (in_array($firstWord, $actionVerbs)) {
                    $actionVerbCount++;
                }
            }
        }

        // Check project bullets
        foreach ($projects as $proj) {
            $highlights = $proj['highlights'] ?? [];
            foreach ($highlights as $hl) {
                $totalBullets++;
                $firstWord = strtolower(strtok(trim($hl), " \t\n\r\0\x0B,."));
                if (in_array($firstWord, $actionVerbs)) {
                    $actionVerbCount++;
                }
            }
        }

        if ($totalBullets > 0) {
            $verbRatio = $actionVerbCount / $totalBullets;
            if ($verbRatio >= 0.70) {
                $strengths[] = "High action-verb density ({$actionVerbCount}/{$totalBullets} bullets start with power verbs).";
            } elseif ($verbRatio < 0.40) {
                $atsScore -= 10;
                $issues[] = [
                    'section' => 'bullets',
                    'severity' => 'MEDIUM',
                    'issue' => "Bullet points should start with decisive action verbs (e.g. Engineered, Architected, Implemented) following the Action + Technology + Result formula."
                ];
            }
        }

        // Check for walls of text vs scannable bullets
        foreach ($projects as $idx => $proj) {
            $desc = $proj['description'] ?? '';
            $highlights = $proj['highlights'] ?? [];
            if (empty($highlights) && strlen($desc) > 250 && !str_contains($desc, "\n") && !str_contains($desc, "•")) {
                $atsScore -= 8;
                $issues[] = [
                    'section' => 'projects',
                    'severity' => 'MEDIUM',
                    'issue' => "Project '" . ($proj['title'] ?? 'Item') . "' is written as a dense paragraph. Convert into 2-3 Action + Technology + Result bullet points."
                ];
                break;
            }
        }
        $atsScore = max(45, min(100, $atsScore));

        // 3. Readability & Summary Checks (0 - 100)
        $readabilityScore = 90;
        $summary = $content['summary'] ?? '';
        $wordCount = str_word_count($summary);

        if ($wordCount > 95) {
            $readabilityScore -= 12;
            $issues[] = ['section' => 'summary', 'severity' => 'LOW', 'issue' => "Professional summary is {$wordCount} words. Target 50–75 words for optimal recruiter skimmability."];
        } elseif ($wordCount > 35) {
            $strengths[] = "Professional summary length ({$wordCount} words) is within the optimal recruiter reading window.";
        }

        // Check for first-person pronouns (I, me, my, we) in professional resumes
        if (preg_match('/\b(I|me|my|myself)\b/i', $summary)) {
            $readabilityScore -= 8;
            $issues[] = ['section' => 'summary', 'severity' => 'LOW', 'issue' => 'Avoid first-person pronouns (I, me, my). Write in direct, active voice.'];
        }
        $readabilityScore = max(40, min(100, $readabilityScore));

        // 4. Keyword Matching & Density Check
        $skillsCount = count($skills);
        $keywordScore = min(100, (int) round(($skillsCount / 8) * 100));
        if ($skillsCount >= 6) {
            $strengths[] = "Strong keyword footprint with {$skillsCount} listed technical competencies.";
        } else {
            $issues[] = ['section' => 'skills', 'severity' => 'MEDIUM', 'issue' => "Consider adding additional core technologies to improve keyword matching against ATS screening filters."];
        }

        // 5. Unsupported Claims & Contradiction Detection
        $unsupportedClaims = $this->contentGenerator->detectUnsupportedClaims($student, $content);
        foreach ($unsupportedClaims as $claim) {
            $issues[] = [
                'section' => 'verification',
                'severity' => $claim['severity'] ?? 'HIGH',
                'issue' => $claim['message'],
            ];
        }

        // 6. Overall Quality Score
        $overallQuality = (int) round(
            ($completenessScore * 0.30) +
            ($atsScore * 0.35) +
            ($readabilityScore * 0.20) +
            ($keywordScore * 0.15)
        );

        if (!empty($unsupportedClaims)) {
            $overallQuality = max(35, $overallQuality - (count($unsupportedClaims) * 6));
        }

        // 7. Actionable Recommendations
        if ($completenessScore < 85) {
            $recommendations[] = "Fill out remaining contact and portfolio links (GitHub, LinkedIn, Portfolio) to maximize recruiter outreach.";
        }
        if ($atsScore < 85) {
            $recommendations[] = "Refine bullet points using the Action + Technology + Result formula without inventing metrics.";
        }
        if (empty($workExperience) && count($projects) < 2) {
            $recommendations[] = "For fresher candidates, showcase at least 2 detailed technical or capstone projects to demonstrate hands-on software development competence.";
        }
        if (empty($recommendations)) {
            $recommendations[] = "Your resume meets top-tier ATS compliance and professional placement standards.";
        }

        return [
            'quality_score' => $overallQuality,
            'ats_score' => $atsScore,
            'candidate_type' => $isExperienced ? 'EXPERIENCED' : 'FRESHER',
            'breakdown' => [
                'completeness' => $completenessScore,
                'ats_compatibility' => $atsScore,
                'readability' => $readabilityScore,
                'keyword_density' => $keywordScore,
            ],
            'strengths' => $strengths,
            'issues' => $issues,
            'recommendations' => $recommendations,
            'unsupported_claims_count' => count($unsupportedClaims),
        ];
    }
}
