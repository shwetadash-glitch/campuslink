<?php

namespace App\Services\Resume;

use App\Models\Student;

class ResumeProfileAggregatorService
{
    /**
     * Aggregate verified and unverified student information into structured resume baseline content.
     * Supports both Freshers and Experienced Professionals.
     * Does NOT alter or mutate the underlying student records.
     */
    public function aggregateProfile(Student $student): array
    {
        $student->loadMissing([
            'user',
            'academicHistories',
            'skills.skill',
            'projects',
            'certifications',
        ]);

        $metadata = $student->profile_metadata ?? [];

        // 1. Personal Information
        $personalInfo = [
            'full_name' => trim("{$student->first_name} {$student->last_name}"),
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'email' => $student->user?->email ?? '',
            'phone' => $student->phone ?? '',
            'student_identifier' => $student->student_identifier,
            'branch' => $student->branch,
            'graduation_year' => $student->graduation_year,
            'cgpa' => $student->cgpa !== null ? (float) $student->cgpa : null,
            'location' => $metadata['location'] ?? '',
            'linkedin_url' => $metadata['linkedin'] ?? ($metadata['linkedin_url'] ?? ''),
            'github_url' => $metadata['github'] ?? ($metadata['github_url'] ?? ''),
            'portfolio_url' => $metadata['portfolio'] ?? ($metadata['portfolio_url'] ?? ''),
        ];

        // 2. Academic History (Institute verified qualifications)
        $academicHistory = $student->academicHistories
            ->sortByDesc('end_year')
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'qualification' => $item->qualification,
                    'institution' => $item->institution,
                    'specialization' => $item->specialization ?? '',
                    'start_year' => $item->start_year,
                    'end_year' => $item->end_year,
                    'score_value' => (float) $item->score_value,
                    'score_type' => $item->score_type,
                    'is_verified' => true,
                ];
            })
            ->values()
            ->all();

        // If no separate academic history rows exist, synthesize base college education from student record
        if (empty($academicHistory) && $student->graduation_year) {
            $academicHistory[] = [
                'id' => null,
                'qualification' => "Bachelor of Technology ({$student->branch})",
                'institution' => 'University Institute of Technology',
                'specialization' => $student->branch,
                'start_year' => $student->graduation_year - 4,
                'end_year' => $student->graduation_year,
                'score_value' => $student->cgpa ? (float) $student->cgpa : 0.0,
                'score_type' => 'CGPA',
                'is_verified' => true,
            ];
        }

        // 3. Technical & Domain Skills (Distinguishing verified and student-claimed)
        $skills = $student->skills->map(function ($item) {
            $skillName = $item->skill ? $item->skill->name : 'Technical Skill';
            $category = $item->skill ? $item->skill->category : 'Core Technologies';
            
            $sourceVal = $item->source instanceof \BackedEnum ? $item->source->value : (string) ($item->source ?? 'STUDENT');
            $proficiencyVal = $item->proficiency_level instanceof \BackedEnum ? $item->proficiency_level->value : (string) ($item->proficiency_level ?? 'INTERMEDIATE');
            
            $isVerified = !empty($sourceVal) && in_array(strtoupper($sourceVal), ['ASSESSMENT', 'VERIFIED', 'CERTIFICATION']);

            return [
                'id' => $item->id,
                'skill_id' => $item->skill_id,
                'name' => $skillName,
                'category' => $category,
                'proficiency_level' => $proficiencyVal,
                'months_experience' => (int) ($item->months_experience ?? 0),
                'source' => $sourceVal,
                'is_verified' => $isVerified,
            ];
        })->values()->all();

        // 4. Work Experience & Internships (from profile metadata)
        $rawExperience = $metadata['work_experience'] ?? ($metadata['experience'] ?? ($metadata['internships'] ?? []));
        $workExperience = [];
        if (is_array($rawExperience)) {
            foreach ($rawExperience as $idx => $exp) {
                if (is_array($exp)) {
                    $highlights = [];
                    if (!empty($exp['highlights']) && is_array($exp['highlights'])) {
                        $highlights = array_values(array_filter($exp['highlights']));
                    } elseif (!empty($exp['description'])) {
                        $highlights = array_values(array_filter(array_map('trim', explode("\n", $exp['description']))));
                    }

                    $workExperience[] = [
                        'id' => $exp['id'] ?? ($idx + 1),
                        'job_title' => $exp['job_title'] ?? ($exp['title'] ?? ($exp['role'] ?? 'Software Engineer')),
                        'company' => $exp['company'] ?? ($exp['organization'] ?? 'Tech Corp'),
                        'location' => $exp['location'] ?? '',
                        'start_date' => $exp['start_date'] ?? ($exp['startDate'] ?? ''),
                        'end_date' => $exp['end_date'] ?? ($exp['endDate'] ?? ''),
                        'is_current' => !empty($exp['is_current']) || !empty($exp['isCurrent']),
                        'technologies' => $exp['technologies'] ?? '',
                        'description' => $exp['description'] ?? '',
                        'highlights' => $highlights,
                        'is_verified' => !empty($exp['is_verified']),
                    ];
                }
            }
        }

        // 5. Capstone & Coursework Projects
        $projects = $student->projects->map(function ($item) {
            $highlights = [];
            if (!empty($item->description)) {
                $lines = array_filter(array_map('trim', explode("\n", $item->description)));
                $highlights = array_values($lines);
            }
            if (empty($highlights)) {
                $techDesc = $item->technologies ? " utilizing {$item->technologies}" : "";
                $highlights = [
                    "Engineered {$item->title}{$techDesc} with clean architecture and robust error handling.",
                ];
            }

            return [
                'id' => $item->id,
                'title' => $item->title,
                'description' => $item->description ?? '',
                'technologies' => $item->technologies ?? '',
                'project_url' => $item->project_url ?? '',
                'role' => 'Lead Developer',
                'highlights' => $highlights,
                'is_verified' => !empty($item->project_url),
            ];
        })->values()->all();

        // 6. Certifications & Credentials
        $certifications = $student->certifications->map(function ($item) {
            $hasProof = !empty($item->proof_path);

            return [
                'id' => $item->id,
                'name' => $item->name,
                'issuing_org' => $item->issuing_org,
                'issue_date' => $item->issue_date ? $item->issue_date->format('Y-m-d') : null,
                'expiry_date' => $item->expiry_date ? $item->expiry_date->format('Y-m-d') : null,
                'credential_id' => $item->credential_id,
                'proof_url' => $item->proof_path,
                'is_verified' => $hasProof,
            ];
        })->values()->all();

        // 7. Achievements & Honors (from profile metadata)
        $rawAchievements = $metadata['achievements'] ?? ($metadata['awards'] ?? ($metadata['honors'] ?? []));
        $achievements = [];
        if (is_array($rawAchievements)) {
            foreach ($rawAchievements as $idx => $ach) {
                if (is_string($ach)) {
                    $achievements[] = [
                        'id' => $idx + 1,
                        'title' => $ach,
                        'issuer' => '',
                        'date' => '',
                        'description' => '',
                    ];
                } elseif (is_array($ach)) {
                    $achievements[] = [
                        'id' => $ach['id'] ?? ($idx + 1),
                        'title' => $ach['title'] ?? 'Academic Honor',
                        'issuer' => $ach['issuer'] ?? ($ach['organization'] ?? ''),
                        'date' => $ach['date'] ?? ($ach['year'] ?? ''),
                        'description' => $ach['description'] ?? '',
                    ];
                }
            }
        }

        // Determine Candidate Profile Type: Fresher vs Experienced
        $isExperienced = count($workExperience) > 0;
        $candidateType = $isExperienced ? 'EXPERIENCED' : 'FRESHER';

        // 8. Grounded Default Summary
        $skillsSample = collect($skills)->take(5)->pluck('name')->implode(', ');
        $skillsPhrase = $skillsSample ? "with core skills in {$skillsSample}" : "grounded in software engineering principles";

        if ($isExperienced) {
            $companies = collect($workExperience)->pluck('company')->filter()->unique()->implode(', ');
            $roles = collect($workExperience)->pluck('job_title')->filter()->unique()->implode(', ');
            $expSnippet = $companies ? "with practical engineering experience at {$companies}" : "with hands-on industry experience";
            $defaultSummary = "Dedicated {$roles} {$expSnippet} {$skillsPhrase}. Demonstrated ability to deliver reliable software features, collaborate in agile teams, and solve complex technical challenges with clean code.";
        } else {
            $cgpaText = $student->cgpa ? " maintaining an institutional CGPA of {$student->cgpa}/10" : "";
            $projSample = collect($projects)->take(2)->pluck('title')->implode(' and ');
            $projSnippet = $projSample ? " Demonstrated practical problem solving through projects including {$projSample}." : "";
            $defaultSummary = "Undergraduate in {$student->branch} (Class of {$student->graduation_year}){$cgpaText} {$skillsPhrase}.{$projSnippet} Seeking to leverage analytical capability and software development competencies in entry-level engineering roles.";
        }

        // Section ordering based on Fresher vs Experienced profile standards
        if ($isExperienced) {
            $sectionOrder = ['summary', 'work_experience', 'skills', 'projects', 'education', 'certifications', 'achievements'];
        } else {
            $sectionOrder = ['summary', 'skills', 'projects', 'education', 'certifications', 'achievements'];
        }

        return [
            'candidate_type' => $candidateType,
            'personal_info' => $personalInfo,
            'summary' => $defaultSummary,
            'academic_history' => $academicHistory,
            'skills' => $skills,
            'work_experience' => $workExperience,
            'projects' => $projects,
            'certifications' => $certifications,
            'achievements' => $achievements,
            'custom_sections' => [],
            'section_order' => $sectionOrder,
            'section_visibility' => [
                'summary' => true,
                'skills' => true,
                'work_experience' => $isExperienced,
                'projects' => true,
                'education' => true,
                'certifications' => !empty($certifications),
                'achievements' => !empty($achievements),
                'custom_sections' => true,
            ],
        ];
    }
}
