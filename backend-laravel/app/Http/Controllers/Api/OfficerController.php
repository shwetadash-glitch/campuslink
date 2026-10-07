<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Company;
use Illuminate\Support\Facades\DB;
use App\Models\PlacementDrive;
use App\Services\EligibilityService;
use App\Services\SkillGapService;
use App\Services\ReadinessScoringService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;


class OfficerController extends Controller {
    public function students(Request $request) {
        $query = Student::query();
        if ($request->has('branch')) $query->where('branch', $request->branch);
        if ($request->has('graduation_year')) $query->where('graduation_year', $request->graduation_year);
        if ($request->has('min_cgpa')) $query->where('cgpa', '>=', $request->min_cgpa);
        if ($request->has('query')) {
            $search = '%' . strtolower(trim($request->input('query'))) . '%';
            $query->where(function($q) use ($search) {
                $q->where(DB::raw('LOWER(first_name)'), 'LIKE', $search)
                  ->orWhere(DB::raw('LOWER(last_name)'), 'LIKE', $search)
                  ->orWhere(DB::raw('LOWER(student_identifier)'), 'LIKE', $search);
            });
        }
        
        $total = $query->count();
        $limit = $request->input('limit', 50);
        $offset = $request->input('offset', 0);
        
        $students = $query->with(['scores' => function($q) {
            $q->where('score_type', 'READINESS_V1')->latest('calculated_at');
        }])->offset($offset)->limit($limit)->get();
        
        $students->transform(function($student) {
            $arr = $student->toArray();
            $arr['readiness_score'] = $student->scores->first()->score_value ?? null;
            return $arr;
        });
        return response()->json(['total' => $total, 'students' => $students]);
    }
    
    public function student($id) {
        $student = Student::where('student_identifier', $id)->orWhere('id', $id)->firstOrFail();
        $student->load(['academicHistory', 'skills.skill', 'projects', 'certifications', 'assessments']);
        return new \App\Http\Resources\FullStudentProfileResource($student);
    }
    
    public function companies(Request $request) {
        $query = Company::query();
        if ($request->has('industry')) $query->where('industry', $request->industry);
        if ($request->has('query')) {
            $search = '%' . strtolower(trim($request->input('query'))) . '%';
            $query->where(DB::raw('LOWER(name)'), 'LIKE', $search);
        }
        
        $total = $query->count();
        $limit = $request->input('limit', 50);
        $offset = $request->input('offset', 0);
        
        $companies = $query->offset($offset)->limit($limit)->get();
        
        return response()->json($companies);
    }
    
    public function storeCompany(Request $request) {
        $validated = $request->validate(['name' => 'required|string', 'industry' => 'nullable|string', 'description' => 'nullable|string']);
        $company = Company::create($validated);
        return response()->json($company, 201);
    }

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
            $score = $readiness['overall_score'] ?? 0;
            
            $tier = 'NOT_READY';
            if ($eligibility['is_eligible']) {
                if ($score >= 75) $tier = 'HIGHLY_EMPLOYABLE';
                elseif ($score >= 50) $tier = 'QUALIFIED';
            }

            $missing = implode(', ', array_column($gaps['missing_skills'], 'skill_name'));
            $matched = implode(', ', array_column($gaps['matched_skills'], 'skill_name'));
            $promptContext = "Student {$student->first_name}. Score: {$score}. Eligible: ".($eligibility['is_eligible']?'Yes':'No').". Missing: {$missing}. Matched: {$matched}. Tier: {$tier}.";
            
            $results[$cand->id] = [
                'student_id' => $student->id,
                'student_identifier' => $student->student_identifier,
                'student_name' => $student->first_name . ' ' . $student->last_name,
                'branch' => $student->branch,
                'cgpa' => $student->cgpa,
                'readiness_score' => $score,
                'is_eligible' => $eligibility['is_eligible'],
                'matched_skills' => $gaps['matched_skills'],
                'partial_skills' => $gaps['partial_skills'],
                'missing_skills' => $gaps['missing_skills'],
                'tier' => $tier,
                'justification' => 'Student tier calculated based on readiness score and eligibility (AI currently unavailable).',
                '_context' => $promptContext
            ];
        }

        $ollamaUrl = env('OLLAMA_URL');
        $ollamaModel = env('OLLAMA_MODEL', 'llama3.2');

        if ($ollamaUrl) {
            $chunks = array_chunk($results, 1, true);
            foreach ($chunks as $chunkIndex => $chunk) {
                try {
                    if (connection_aborted()) {
                        Log::info("Client aborted connection. Stopping AI loop.");
                        break;
                    }
                    $batchContext = "";
                    foreach ($chunk as $id => $data) {
                        $batchContext .= "ID: {$id} | " . $data['_context'] . "\n";
                    }
                    $systemPrompt = "You are an AI assistant. I will provide students with their stats and IDs. For EACH student, write EXACTLY 1 short sentence justifying their tier. Output MUST be valid JSON where the keys are the EXACT numeric student IDs provided, and the values are the 1-sentence justifications. Example: {\"123\": \"Justification here\"}.";
                    
                    $response = Http::timeout(15)->post($ollamaUrl . '/api/chat', [
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
                        Log::error("Ollama AI Shortlist batch {$chunkIndex} returned status: " . $response->status());
                    }
                } catch (\Exception $e) {
                    Log::error("Ollama AI Shortlist batch {$chunkIndex} failed: " . $e->getMessage());
                }
            }
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
}



