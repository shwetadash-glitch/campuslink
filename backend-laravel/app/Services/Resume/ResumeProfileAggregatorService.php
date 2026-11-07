<?php

namespace App\Services\Resume;

use App\Models\Student;

class ResumeProfileAggregatorService
{
    /**
     * Aggregate verified and unverified student information into structured resume baseline content.
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
                    'is_verified' => true, // Academic records in campus system
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
            $category = $item->skill ? $item->skill->category : 'General';
            
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

        // 4. Capstone & Coursework Projects
        $projects = $student->projects->map(function ($item) {
            return [
                'id' => $item->id,
                'title' => $item->title,
                'description' => $item->description ?? '',
                'technologies' => $item->technologies ?? '',
                'project_url' => $item->project_url ?? '',
                'role' => 'Lead Developer',
                'highlights' => !empty($item->description) ? array_filter(array_map('trim', explode("\n", $item->description))) : [],
                'is_verified' => !empty($item->project_url),
            ];
        })->values()->all();

        // 5. Certifications & Credentials
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

        // 6. Default Grounded Summary
        $cgpaText = $student->cgpa ? " with a cumulative GPA of {$student->cgpa}" : "";
        $skillsSample = collect($skills)->take(4)->pluck('name')->implode(', ');
        $skillsPhrase = $skillsSample ? " Proficient in {$skillsSample}." : "";
        $defaultSummary = "Undergraduate in {$student->branch} (Class of {$student->graduation_year}){$cgpaText} seeking career opportunities in professional engineering and software development.{$skillsPhrase}";

        return [
            'personal_info' => $personalInfo,
            'summary' => $defaultSummary,
            'academic_history' => $academicHistory,
            'skills' => $skills,
            'projects' => $projects,
            'certifications' => $certifications,
            'custom_sections' => [],
            'section_order' => ['summary', 'skills', 'projects', 'education', 'certifications'],
            'section_visibility' => [
                'summary' => true,
                'skills' => true,
                'projects' => true,
                'education' => true,
                'certifications' => true,
                'custom_sections' => true,
            ],
        ];
    }
}
