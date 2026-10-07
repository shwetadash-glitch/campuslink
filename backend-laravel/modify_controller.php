<?php
$file = 'app/Http/Controllers/Api/OfficerController.php';
$content = file_get_contents($file);

$imports = "\nuse App\Models\PlacementDrive;\nuse App\Services\EligibilityService;\nuse App\Services\SkillGapService;\nuse App\Services\ReadinessScoringService;\nuse Illuminate\Support\Facades\Http;\nuse Illuminate\Support\Facades\Log;\n";

if (strpos($content, 'use App\Models\PlacementDrive;') === false) {
    $content = str_replace('use Illuminate\Support\Facades\DB;', 'use Illuminate\Support\Facades\DB;' . $imports, $content);
}

$method = <<<'EOD'
    public function aiShortlist(Request $request, $driveId, EligibilityService $eligibilityService, SkillGapService $skillGapService, ReadinessScoringService $readinessService) {
        $drive = PlacementDrive::with('job.requirements.skill')->find($driveId);
        if (!$drive) return response()->json(['error' => 'Invalid drive'], 404);
        if (!$drive->job) return response()->json(['error' => 'Drive has no job associated'], 400);

        $limit = $request->input('limit', 100);
        $offset = $request->input('offset', 0);
        $candidatesQuery = \App\Models\DriveCandidate::where('drive_id', $driveId)
            ->with(['student.skills.skill', 'student.projects', 'student.certifications', 'student.assessments']);
        $total = $candidatesQuery->count();
        $candidates = $candidatesQuery->offset($offset)->limit($limit)->get();

        if ($candidates->isEmpty()) {
            return response()->json(['total' => $total, 'candidates' => []]);
        }

        $results = [];
        foreach ($candidates as $cand) {
            $student = $cand->student;
            
            $eligibility = $eligibilityService->checkHardEligibility($student, $drive->job);
            $gaps = $skillGapService->analyzeSkillGaps($student, $drive->job);
            $readiness = $readinessService->calculateReadiness($student);
            $score = $readiness['total_score'] ?? 0;
            
            $tier = 'NOT_READY';
            if ($eligibility['eligible']) {
                if ($score >= 75) $tier = 'HIGHLY_EMPLOYABLE';
                elseif ($score >= 50) $tier = 'QUALIFIED';
            }

            $missing = implode(', ', array_column($gaps['missing_skills'], 'skill_name'));
            $matched = implode(', ', array_column($gaps['matched_skills'], 'skill_name'));
            $promptContext = "Student {$student->first_name}. Score: {$score}. Eligible: ".($eligibility['eligible']?'Yes':'No').". Missing: {$missing}. Matched: {$matched}. Tier: {$tier}.";
            
            $results[$cand->id] = [
                'student_id' => $student->id,
                'student_identifier' => $student->student_identifier,
                'student_name' => $student->first_name . ' ' . $student->last_name,
                'branch' => $student->branch,
                'cgpa' => $student->cgpa,
                'readiness_score' => $score,
                'is_eligible' => $eligibility['eligible'],
                'matched_skills' => $gaps['matched_skills'],
                'partial_skills' => $gaps['partial_skills'],
                'missing_skills' => $gaps['missing_skills'],
                'tier' => $tier,
                'justification' => 'Student tier calculated based on readiness score and eligibility (AI currently unavailable).',
                '_context' => $promptContext
            ];
        }

        try {
            $ollamaUrl = env('OLLAMA_URL');
            $ollamaModel = env('OLLAMA_MODEL', 'llama3.2');
            if ($ollamaUrl) {
                $batchContext = "";
                foreach ($results as $id => $data) {
                    $batchContext .= "ID: {$id} | " . $data['_context'] . "\n";
                }
                $systemPrompt = "You are an AI assistant. I will provide a list of students with their stats. For EACH student ID, write EXACTLY 1 short sentence justifying their tier based only on the provided stats. Output MUST be valid JSON in this exact format: {\"ID\": \"1-sentence justification\", \"ID2\": \"...\"}. Do NOT output anything other than JSON.";
                
                $response = Http::timeout(60)->post($ollamaUrl . '/api/chat', [
                    'model' => $ollamaModel,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $batchContext]
                    ],
                    'stream' => false,
                    'format' => 'json'
                ]);
                
                if ($response->successful()) {
                    $content = json_decode($response->json('message.content'), true);
                    if (is_array($content)) {
                        foreach ($content as $id => $justification) {
                            if (isset($results[$id])) {
                                $results[$id]['justification'] = is_string($justification) ? $justification : json_encode($justification);
                            }
                        }
                    }
                } else {
                    Log::error("Ollama AI Shortlist returned status: " . $response->status());
                }
            }
        } catch (\Exception $e) {
            Log::error("Ollama AI Shortlist failed: " . $e->getMessage());
        }

        $finalCandidates = array_values($results);
        foreach ($finalCandidates as &$c) {
            unset($c['_context']);
        }

        return response()->json([
            'total' => $total,
            'candidates' => $finalCandidates
        ]);
    }
EOD;

if (strpos($content, 'function aiShortlist(') === false) {
    $content = substr_replace($content, "\n" . $method . "\n}\n", strrpos($content, '}'), 1);
    file_put_contents($file, $content);
    echo "Controller updated.\n";
} else {
    echo "Method already exists.\n";
}
