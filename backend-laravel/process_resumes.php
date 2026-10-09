<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Smalot\PdfParser\Parser;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use App\Models\Student;
use App\Models\StudentSkill;
use App\Models\StudentProject;
use App\Services\ReadinessScoringService;

$readinessService = app(ReadinessScoringService::class);
$pdfParser = new Parser();
$ollamaUrl = env('OLLAMA_URL', 'http://localhost:11434');

$students = Student::whereNotNull('resume_url')->get();
echo "Found " . $students->count() . " students with resumes.\n";

foreach ($students as $student) {
    echo "Processing student {$student->id}...\n";
    $pathFound = null;
    foreach(['pdf', 'doc', 'docx'] as $ext) {
        $path = 'resumes/student_' . $student->id . '_resume.' . $ext;
        if (Storage::disk('local')->exists($path)) {
            $pathFound = $path;
            break;
        }
    }

    if (!$pathFound) {
        echo "File not found for student {$student->id}.\n";
        continue;
    }
    
    // Only parse PDFs for now
    if (!str_ends_with($pathFound, '.pdf')) {
         echo "Not a PDF.\n";
         continue;
    }

    try {
        $pdf = $pdfParser->parseFile(Storage::disk('local')->path($pathFound));
        $text = $pdf->getText();
        $text = substr($text, 0, 5000);
        
        if (empty(trim($text))) {
            echo "No text extracted from PDF.\n";
            continue;
        }

        $prompt = "You are a highly accurate AI resume parser. Extract the following information from the provided resume text and format it STRICTLY as a JSON object with no markdown wrappers, no backticks, and no extra text.\nThe JSON must follow this exact schema:\n{\n  \"bio\": \"A concise 2-sentence summary of the candidate's professional objective and background.\",\n  \"cgpa\": 9.0,\n  \"skills\": [\"Python\", \"React\", \"Machine Learning\"],\n  \"projects\": [\n    { \"title\": \"Project Name\", \"description\": \"Brief project description\" }\n  ]\n}\n\nIf any data is missing from the resume, leave it as null or an empty array.\n\nRESUME TEXT:\n" . $text;

        $response = Http::timeout(120)->post($ollamaUrl . '/api/generate', [
            'model' => env('OLLAMA_MODEL', 'llama3.2'),
            'prompt' => $prompt,
            'stream' => false,
            'format' => 'json'
        ]);

        if ($response->successful()) {
            $raw = $response->json('response');
            $raw = preg_replace('/`json/', '', $raw);
            $raw = preg_replace('/`/', '', $raw);
            $data = json_decode(trim($raw), true);

            if ($data) {
                // Update Bio
                if (isset($data['bio'])) {
                    $meta = $student->profile_metadata ?? [];
                    $meta['bio'] = $data['bio'];
                    $student->update(['profile_metadata' => $meta]);
                }

                // Update CGPA
                if (isset($data['cgpa']) && is_numeric($data['cgpa'])) {
                    $student->update(['cgpa' => $data['cgpa']]);
                }

                // Add Skills
                if (isset($data['skills']) && is_array($data['skills'])) {
                    foreach ($data['skills'] as $skillName) {
                        $masterSkill = \App\Models\MasterSkill::firstOrCreate(
                            ['name' => strtoupper(trim($skillName))],
                            ['category' => 'TECHNICAL', 'is_verified' => true]
                        );
                        StudentSkill::firstOrCreate([
                            'student_id' => $student->id,
                            'skill_id' => $masterSkill->id
                        ], [
                            'skill_name' => trim($skillName),
                            'proficiency_level' => 'INTERMEDIATE',
                            'is_verified' => false
                        ]);
                    }
                }

                // Add Projects
                if (isset($data['projects']) && is_array($data['projects'])) {
                    foreach ($data['projects'] as $proj) {
                        if (isset($proj['title']) && isset($proj['description'])) {
                            StudentProject::firstOrCreate([
                                'student_id' => $student->id,
                                'title' => $proj['title']
                            ], [
                                'description' => $proj['description']
                            ]);
                        }
                    }
                }
                
                $readinessService->calculateReadiness($student);
                echo "Successfully processed and recalculated for student {$student->id}.\n";
            } else {
                echo "Failed to parse JSON for student {$student->id}.\n";
            }
        }
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
echo "Done!\n";
