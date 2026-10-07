<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\StudentSkill;
use App\Models\StudentProject;
use App\Models\StudentCertification;
use App\Models\StudentAcademicHistory;
use App\Models\StudentAssessment;
use App\Models\Skill;
use App\Enums\ProficiencyLevel;
use App\Enums\SkillSource;
use Illuminate\Support\Facades\DB;

class MockStudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Target specific mock student IDs 80 through 129
            $studentIds = range(80, 129);
            
            // Only retrieve existing students to ensure we don't error out if some are missing,
            // though the prompt guarantees they exist.
            $students = Student::whereIn('id', $studentIds)->get();

            // Realistic branch names to distribute across students
            $branches = [
                'Computer Science',
                'Information Technology',
                'Electronics and Communication Engineering',
                'Electrical Engineering',
                'Mechanical Engineering',
                'Civil Engineering',
                'Artificial Intelligence and Data Science'
            ];

            // Fetch actual existing skill IDs from the database by known names
            $skillNames = [
                'Python', 'Java', 'React', 'SQL', 'Docker', 'AWS', 
                'Communication', 'C++', 'Machine Learning', 'KUBERNETES', 
                'GRAPHQL', 'PYTHON'
            ];
            
            $skillIds = Skill::whereIn('name', $skillNames)->pluck('id')->toArray();
            
            // Fail clearly if no existing skills match the expected names
            if (empty($skillIds)) {
                throw new \RuntimeException('The required existing skills were not found in the database. Ensure the DatabaseSeeder has run first.');
            }

            // Enums for skills
            $proficiencyLevels = ProficiencyLevel::cases();
            $skillSources = SkillSource::cases();
            
            // Mock assessment types
            $assessmentTypes = ['Coding Test', 'Aptitude Test', 'Core Subject Quiz', 'Communication Evaluation'];

            foreach ($students as $index => $student) {
                // 1. Update the student branch to ensure distribution
                $branch = $branches[$index % count($branches)];
                $student->update(['branch' => $branch]);

                // 2. Student Skills (3 to 6 unique skills per student)
                if (!empty($skillIds)) {
                    // Make sure we don't request more skills than exist
                    $maxSkills = min(rand(3, 6), count($skillIds));
                    if ($maxSkills > 0) {
                        $selectedSkills = (array) array_rand(array_flip($skillIds), $maxSkills);

                        foreach ($selectedSkills as $skillId) {
                            $exists = StudentSkill::where('student_id', $student->id)
                                                  ->where('skill_id', $skillId)
                                                  ->exists();
                            if (!$exists) {
                                StudentSkill::create([
                                    'student_id' => $student->id,
                                    'skill_id' => $skillId,
                                    'proficiency_level' => $proficiencyLevels[array_rand($proficiencyLevels)]->value,
                                    'months_experience' => rand(0, 36),
                                    'source' => $skillSources[array_rand($skillSources)]->value,
                                ]);
                            }
                        }
                    }
                }

                // 3. Projects (1 to 3 per student)
                $projectCount = StudentProject::where('student_id', $student->id)->count();
                if ($projectCount === 0) {
                    $numProjects = rand(1, 3);
                    for ($i = 1; $i <= $numProjects; $i++) {
                        StudentProject::create([
                            'student_id' => $student->id,
                            'title' => "Fictional {$branch} Project {$i}",
                            'description' => "Designed and developed a fictional system applicable to {$branch} methodologies.",
                            'technologies' => ['React', 'Python', 'SQL'], 
                            'project_url' => null // Nullified instead of fake GitHub URL
                        ]);
                    }
                }

                // 4. Certifications (0 to 2 per student)
                $certCount = StudentCertification::where('student_id', $student->id)->count();
                if ($certCount === 0) {
                    $numCerts = rand(0, 2);
                    for ($i = 1; $i <= $numCerts; $i++) {
                        StudentCertification::create([
                            'student_id' => $student->id,
                            'name' => "Certified {$branch} Professional",
                            'issuing_org' => 'Global Tech Certification Board',
                            'issue_date' => now()->subMonths(rand(6, 24)),
                            'expiry_date' => now()->addMonths(rand(12, 36)),
                            'credential_id' => 'CRED-' . rand(10000, 99999),
                        ]);
                    }
                }

                // 5. Academic History (Class 10, Class 12, B.Tech)
                $academicCount = StudentAcademicHistory::where('student_id', $student->id)->count();
                if ($academicCount === 0) {
                    // Class 10
                    StudentAcademicHistory::create([
                        'student_id' => $student->id,
                        'qualification' => 'Class 10',
                        'institution' => 'Fictional High School',
                        'specialization' => 'General',
                        'start_year' => 2017,
                        'end_year' => 2018,
                        'score_value' => rand(75, 95),
                        'score_type' => 'Percentage',
                    ]);

                    // Class 12
                    StudentAcademicHistory::create([
                        'student_id' => $student->id,
                        'qualification' => 'Class 12',
                        'institution' => 'Fictional Junior College',
                        'specialization' => 'Science',
                        'start_year' => 2019,
                        'end_year' => 2020,
                        'score_value' => rand(70, 95),
                        'score_type' => 'Percentage',
                    ]);

                    // B.Tech
                    StudentAcademicHistory::create([
                        'student_id' => $student->id,
                        'qualification' => 'B.Tech',
                        'institution' => 'Fictional Engineering College',
                        'specialization' => $branch,
                        'start_year' => 2021,
                        'end_year' => 2025,
                        'score_value' => rand(70, 98) / 10, // Generates 7.0 to 9.8 CGPA
                        'score_type' => 'CGPA',
                    ]);
                }

                // 6. Assessments (1 to 3 per student)
                $assessmentCount = StudentAssessment::where('student_id', $student->id)->count();
                if ($assessmentCount === 0) {
                    $numAssessments = rand(1, 3);
                    for ($i = 1; $i <= $numAssessments; $i++) {
                        StudentAssessment::create([
                            'student_id' => $student->id,
                            'assessment_type' => $assessmentTypes[array_rand($assessmentTypes)],
                            'score' => rand(60, 100),
                            'max_score' => 100,
                            'assessment_date' => now()->subDays(rand(1, 60)),
                            'metadata_json' => ['provider' => 'CampusLinkMockAssessments', 'level' => 'Intermediate'],
                        ]);
                    }
                }
            }
        });
    }
}
