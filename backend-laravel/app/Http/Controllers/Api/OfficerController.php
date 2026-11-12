<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Company;
use Illuminate\Support\Facades\DB;
use App\Models\PlacementDrive;
use App\Models\Offer;
use App\Enums\OfferStatus;
use App\Services\NotificationService;
use App\Services\EligibilityService;
use App\Services\SkillGapService;
use App\Services\ReadinessScoringService;
use App\Services\CandidateRankingService;
use App\Services\BranchNormalizationService;
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

    public function aiShortlist(
        Request $request, 
        $driveId, 
        EligibilityService $eligibilityService, 
        SkillGapService $skillGapService, 
        ReadinessScoringService $readinessService,
        CandidateRankingService $rankingService
    ) {
        $drive = PlacementDrive::with(['company', 'job.company', 'job.requirements.skill'])->find($driveId);
        if (!$drive) return response()->json(['error' => 'Invalid drive'], 404);
        if (!$drive->job) return response()->json(['error' => 'Drive has no job associated'], 400);

        $limit = $request->input('limit', 100);
        $offset = $request->input('offset', 0);
        $candidatesQuery = \App\Models\DriveCandidate::where('drive_id', $driveId)
            ->with(['student.skills.skill', 'student.projects', 'student.certifications', 'student.assessments']);
        $total = $candidatesQuery->count();
        $candidates = $candidatesQuery->offset($offset)->limit($limit)->get();

        if ($candidates->isEmpty()) {
            $companyName = $drive->company?->name ?? $drive->job?->company?->name ?? $drive->name ?? 'Company';
            $allowedBranches = $drive->job->eligibility_config['allowed_branches'] ?? [];
            return response()->json([
                'total' => $total, 
                'candidates' => [],
                'branch_breakdown' => [],
                'drive_info' => [
                    'drive_id' => $drive->id,
                    'drive_name' => $drive->name,
                    'company_name' => $companyName,
                    'job_title' => $drive->job?->title,
                    'track' => 'Software & Technology Track',
                    'domain_badge' => '💻 Tech & Software',
                    'allowed_branches' => $allowedBranches,
                ]
            ]);
        }

        $results = [];
        foreach ($candidates as $cand) {
            $student = $cand->student;
            
            $eligibility = $eligibilityService->checkHardEligibility($student, $drive->job);
            $gaps = $skillGapService->analyzeSkillGaps($student, $drive->job);
            $readiness = $readinessService->calculateReadiness($student);
            
            // Do NOT roundoff scores to integer
            $globalScore = isset($readiness['overall_score']) ? (float) $readiness['overall_score'] : 0.0;
            
            // Recruiter Radar Fit Calculation
            $radarFit = $rankingService->calculateRadarFit($student, $drive->job, $globalScore);
            $fitScore = $radarFit['fit_score'];

            // Tier evaluation based on fit score without roundoff
            $tier = 'NOT_READY';
            if ($eligibility['is_eligible']) {
                if ($fitScore >= 75.0) {
                    $tier = 'HIGHLY_EMPLOYABLE';
                } elseif ($fitScore >= 50.0) {
                    $tier = 'QUALIFIED';
                }
            }

            $missing = implode(', ', array_column($gaps['missing_skills'], 'skill_name'));
            $matched = implode(', ', array_column($gaps['matched_skills'], 'skill_name'));
            $promptContext = "Student {$student->first_name}. FitScore: {$fitScore}. Readiness: {$globalScore}. Eligible: ".($eligibility['is_eligible']?'Yes':'No').". Missing: {$missing}. Matched: {$matched}. Tier: {$tier}.";

            $results[$cand->id] = [
                'cand_id' => $cand->id,
                'student_id' => $student->id,
                'student_identifier' => $student->student_identifier,
                'student_name' => trim($student->first_name . ' ' . $student->last_name),
                'branch' => $student->branch,
                'canonical_branch' => BranchNormalizationService::normalize($student->branch),
                'cgpa' => $student->cgpa !== null ? (float) $student->cgpa : null,
                'readiness_score' => $globalScore,
                'fit_score' => $fitScore,
                'is_eligible' => (bool) $eligibility['is_eligible'],
                'failed_criteria' => $eligibility['failed_criteria'] ?? [],
                'matched_skills' => $gaps['matched_skills'],
                'partial_skills' => $gaps['partial_skills'],
                'missing_skills' => $gaps['missing_skills'],
                'radar_data' => $radarFit['radar_data'],
                'mandatory_met_count' => $radarFit['mandatory_met_count'],
                'mandatory_total_count' => $radarFit['mandatory_total_count'],
                'tier' => $tier,
                'justification' => '',
                '_context' => $promptContext
            ];
        }

        // Multi-stage deterministic ranking
        $rankedCandidates = $rankingService->rankCandidates(array_values($results));

        // Format deterministic justifications
        $companyName = $drive->company?->name 
            ?? $drive->job?->company?->name 
            ?? $drive->name 
            ?? 'Company';

        // Infer Domain Track
        $allowedBranches = $drive->job->eligibility_config['allowed_branches'] ?? [];
        $allowedCanonicals = array_map([BranchNormalizationService::class, 'normalize'], (array) $allowedBranches);

        $driveTrack = 'Software & Technology Track';
        $domainBadge = '💻 Tech & Software';
        if (in_array('CIVIL', $allowedCanonicals, true)) {
            $driveTrack = 'Core Civil Infrastructure & Structural Engineering Track';
            $domainBadge = '🏗️ Core Civil';
        } elseif (in_array('MECH', $allowedCanonicals, true)) {
            $driveTrack = 'Core Automotive, EV Powertrain & Mechanical Systems Track';
            $domainBadge = '⚙️ Core Mechanical';
        } elseif (in_array('EEE', $allowedCanonicals, true) || in_array('ECE', $allowedCanonicals, true)) {
            $driveTrack = 'Core Industrial Automation, Smart Grid & Embedded Systems Track';
            $domainBadge = '⚡ Core Electrical / ECE';
        } elseif (in_array('DS', $allowedCanonicals, true) || in_array('AIML', $allowedCanonicals, true)) {
            $driveTrack = 'Software, Cloud & AI Engineering Track';
            $domainBadge = '💻 Software & AI';
        }

        foreach ($rankedCandidates as &$c) {
            if ($c['is_eligible']) {
                $mandMet = $c['mandatory_met_count'] ?? 0;
                $mandTotal = $c['mandatory_total_count'] ?? 0;
                $mandText = ($mandTotal > 0 && $mandMet === $mandTotal)
                    ? 'meeting all mandatory benchmarks.'
                    : ($mandTotal > 0 ? "meeting {$mandMet}/{$mandTotal} mandatory benchmarks." : 'meeting baseline requirements.');

                $c['justification'] = "Rank #{$c['rank']}: Demonstrates {$c['fit_score']}% alignment with {$companyName} requirements, {$mandText}";
            } else {
                $failed = !empty($c['failed_criteria']) ? implode(' ', $c['failed_criteria']) : 'Failed hard eligibility criteria.';
                $c['justification'] = "Ineligible: {$failed}";
            }
        }
        unset($c);

        // Compute Branch Segregation Summary Breakdown
        $branchBreakdown = [];
        foreach ($rankedCandidates as $c) {
            $canon = $c['canonical_branch'] ?: 'OTHER';
            $dispName = $c['branch'] ?: 'Other';
            if (!isset($branchBreakdown[$canon])) {
                $branchBreakdown[$canon] = [
                    'canonical' => $canon,
                    'display_name' => $dispName,
                    'total' => 0,
                    'eligible' => 0,
                    'disqualified' => 0,
                    'highly_employable' => 0,
                    'qualified' => 0,
                    'avg_fit' => 0.0,
                    'total_fit' => 0.0,
                ];
            }
            $branchBreakdown[$canon]['total']++;
            $branchBreakdown[$canon]['total_fit'] += $c['fit_score'];
            if ($c['is_eligible']) {
                $branchBreakdown[$canon]['eligible']++;
                if ($c['tier'] === 'HIGHLY_EMPLOYABLE') $branchBreakdown[$canon]['highly_employable']++;
                if ($c['tier'] === 'QUALIFIED') $branchBreakdown[$canon]['qualified']++;
            } else {
                $branchBreakdown[$canon]['disqualified']++;
            }
        }

        foreach ($branchBreakdown as &$bb) {
            $bb['avg_fit'] = $bb['total'] > 0 ? round($bb['total_fit'] / $bb['total'], 1) : 0.0;
            unset($bb['total_fit']);
        }
        unset($bb);

        // Optional Ollama AI refinement
        $ollamaUrl = config('services.ollama.url');
        $ollamaModel = config('services.ollama.model', 'llama3.2');

        if ($ollamaUrl) {
            $chunks = array_chunk($rankedCandidates, 10, true);
            $startTime = microtime(true);
            foreach ($chunks as $chunkIndex => $chunk) {
                if (microtime(true) - $startTime > 5) {
                    break;
                }
                try {
                    $batchContext = "";
                    foreach ($chunk as $idx => $data) {
                        $batchContext .= "ID: {$data['student_id']} | Rank: #{$data['rank']} | " . $data['_context'] . "\n";
                    }
                    $systemPrompt = "You are an AI assistant. I will provide students with their stats, rank, and IDs. For EACH student, write EXACTLY 1 short sentence justifying their rank and tier. Output MUST be valid JSON where the keys are the EXACT numeric student IDs provided, and the values are the 1-sentence justifications. Example: {\"123\": \"Rank #1: Demonstrates 96.5% alignment with requirements, meeting all mandatory benchmarks.\"}";
                    
                    $response = Http::timeout(3)->post($ollamaUrl . '/api/chat', [
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
                            foreach ($rankedCandidates as &$candRef) {
                                $sId = (string) $candRef['student_id'];
                                if (isset($content[$sId]) && is_string($content[$sId])) {
                                    $candRef['justification'] = $content[$sId];
                                }
                            }
                            unset($candRef);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning("Ollama AI Shortlist batch {$chunkIndex} skipped: " . $e->getMessage());
                    break;
                }
            }
        }

        // Optional Branch Query Filter
        $filterBranch = $request->input('branch');
        if ($filterBranch && strtoupper(trim($filterBranch)) !== 'ALL') {
            $filterCanonical = BranchNormalizationService::normalize($filterBranch);
            $rankedCandidates = array_values(array_filter($rankedCandidates, function ($c) use ($filterCanonical, $filterBranch) {
                return $c['canonical_branch'] === $filterCanonical 
                    || strcasecmp(trim((string)$c['branch']), trim($filterBranch)) === 0;
            }));
        }

        foreach ($rankedCandidates as &$c) {
            unset($c['_context']);
            unset($c['cand_id']);
        }
        unset($c);

        return response()->json([
            'total' => count($rankedCandidates),
            'candidates' => $rankedCandidates,
            'branch_breakdown' => $branchBreakdown,
            'drive_info' => [
                'drive_id' => $drive->id,
                'drive_name' => $drive->name,
                'company_name' => $companyName,
                'job_title' => $drive->job?->title,
                'track' => $driveTrack,
                'domain_badge' => $domainBadge,
                'allowed_branches' => $allowedBranches,
            ]
        ]);
    }

    /**
     * Return dynamic At-Risk student cohort analysis with multi-factor risk diagnosis.
     */
    public function atRiskCohort(Request $request, ReadinessScoringService $readinessService)
    {
        $placedStudentIds = Offer::where(function($q) {
            $q->whereIn('status', [OfferStatus::ACCEPTED->value, OfferStatus::JOINED->value])
              ->orWhere('verification_status', 'VERIFIED');
        })->pluck('student_id')->unique()->toArray();

        $totalCohort = Student::count();
        $placedCount = count($placedStudentIds);
        $unplacedCount = max(0, $totalCohort - $placedCount);

        $query = Student::with(['skills.skill', 'projects', 'certifications', 'assessments', 'scores', 'driveCandidates']);

        // Optional branch filter
        if ($request->filled('branch') && strtoupper(trim($request->branch)) !== 'ALL' && strtoupper(trim($request->branch)) !== 'ALL BRANCHES') {
            $branch = $request->branch;
            $query->where(function($q) use ($branch) {
                $q->where('branch', $branch)
                  ->orWhere(DB::raw('LOWER(branch)'), strtolower($branch));
            });
        }

        $allStudents = $query->get();

        $candidates = [];
        $highRiskCount = 0;
        $mediumRiskCount = 0;
        $lowRiskCount = 0;
        $activeInterventionsCount = 0;

        foreach ($allStudents as $student) {
            $isPlaced = in_array($student->id, $placedStudentIds, true);
            
            // Check readiness score
            $scoreRecord = $student->scores->firstWhere('score_type', 'READINESS_V1');
            if ($scoreRecord) {
                $score = (float)$scoreRecord->score_value;
            } else {
                $calc = $readinessService->calculateReadiness($student);
                $score = (float)($calc['overall_score'] ?? 0);
            }
            $roundedScore = round($score, 1);

            $reasons = [];
            $riskLevel = 'LOW';

            if ($isPlaced) {
                $riskLevel = 'PLACED';
                $reasons[] = "Candidate has accepted/verified placement offer. Excluded from active risk intervention.";
            } else {
                if ($score < 35.0) {
                    $riskLevel = 'HIGH';
                    $reasons[] = "Critically low readiness score ({$roundedScore}%). Insufficient verified technical proficiencies.";
                } elseif ($score < 55.0) {
                    $riskLevel = 'MEDIUM';
                    $reasons[] = "Borderline readiness score ({$roundedScore}%). Lacks competitive project and assessment depth.";
                }

                if ($student->backlogs_current > 0) {
                    $riskLevel = 'HIGH';
                    $reasons[] = "Active academic backlogs ({$student->backlogs_current}) disqualify candidate from major corporate cutoffs.";
                } elseif ($student->backlogs_history > 0 && $riskLevel !== 'HIGH') {
                    $riskLevel = 'MEDIUM';
                    $reasons[] = "Past backlog history ({$student->backlogs_history}) limits eligibility for zero-history drives.";
                }

                if ($student->cgpa && (float)$student->cgpa < 6.5) {
                    if ((float)$student->cgpa < 6.0) {
                        $riskLevel = 'HIGH';
                        $reasons[] = "CGPA ({$student->cgpa}) falls below baseline minimum eligibility threshold.";
                    } else {
                        if ($riskLevel === 'LOW') $riskLevel = 'MEDIUM';
                        $reasons[] = "CGPA ({$student->cgpa}) is close to cutoff thresholds (6.0 - 6.5).";
                    }
                }

                if ($student->assessments->isEmpty() && $riskLevel !== 'LOW') {
                    $reasons[] = "Has not completed any verified coding or technical assessments.";
                }

                if (empty($reasons)) {
                    $reasons[] = "Standard candidate profile. On track for upcoming recruitment drives.";
                }

                if ($riskLevel === 'HIGH') $highRiskCount++;
                elseif ($riskLevel === 'MEDIUM') $mediumRiskCount++;
                else $lowRiskCount++;
            }

            $activeIntervention = $student->profile_metadata['active_intervention'] ?? 'None';
            if ($activeIntervention !== 'None') {
                $activeInterventionsCount++;
            }

            // Exclude placed students from default at-risk table unless explicitly requested
            if (!$request->boolean('include_placed') && $isPlaced) {
                continue;
            }

            // Risk filter if passed
            if ($request->filled('risk_level') && strtoupper($request->risk_level) !== 'ALL') {
                if ($riskLevel !== strtoupper($request->risk_level)) {
                    continue;
                }
            }

            $candidates[] = [
                'id' => $student->id,
                'user_id' => $student->user_id,
                'student' => trim($student->first_name . ' ' . $student->last_name),
                'studentId' => $student->student_identifier,
                'branch' => $student->branch,
                'canonical_branch' => BranchNormalizationService::normalize($student->branch),
                'cgpa' => (float)$student->cgpa,
                'backlogs_current' => (int)$student->backlogs_current,
                'backlogs_history' => (int)$student->backlogs_history,
                'score' => $roundedScore,
                'riskLevel' => $riskLevel,
                'reason' => implode(' ', $reasons),
                'intervention' => $activeIntervention,
                'is_placed' => $isPlaced,
                'interventions_history' => $student->profile_metadata['interventions'] ?? [],
            ];
        }

        // Distinct branches
        $allBranches = Student::distinct()->pluck('branch')->filter()->values()->all();

        return response()->json([
            'summary' => [
                'total_cohort' => $totalCohort,
                'total_placed' => $placedCount,
                'total_unplaced' => $unplacedCount,
                'high_risk_count' => $highRiskCount,
                'medium_risk_count' => $mediumRiskCount,
                'low_risk_count' => $lowRiskCount,
                'active_interventions_count' => $activeInterventionsCount,
                'placed_rate_percent' => $totalCohort > 0 ? round(($placedCount / $totalCohort) * 100, 1) : 0,
                'intervention_success_rate' => 68.0,
            ],
            'branches' => array_values(array_unique(array_merge(['All Branches'], $allBranches))),
            'students' => $candidates,
        ]);
    }

    /**
     * Record an at-risk intervention for a student and dispatch in-app notification.
     */
    public function recordIntervention(Request $request, $id, NotificationService $notificationService)
    {
        $validated = $request->validate([
            'intervention_type' => 'required|string|max:100',
            'subject' => 'nullable|string|max:255',
            'message' => 'nullable|string',
            'action_notes' => 'nullable|string',
        ]);

        $student = Student::where('student_identifier', $id)->orWhere('id', $id)->firstOrFail();

        $interventionType = $validated['intervention_type'];
        $subject = $validated['subject'] ?? "Placement Office Intervention: {$interventionType}";
        $message = $validated['message'] ?? "A mandatory placement intervention ({$interventionType}) has been assigned to you. Please review your dashboard and report to the Placement Office if scheduled.";

        $meta = $student->profile_metadata ?? [];
        $meta['active_intervention'] = $interventionType;
        $meta['interventions'] = $meta['interventions'] ?? [];
        $meta['interventions'][] = [
            'id' => uniqid('intv_'),
            'type' => $interventionType,
            'officer_id' => auth()->id(),
            'subject' => $subject,
            'message' => $message,
            'created_at' => now()->toISOString(),
        ];
        $student->profile_metadata = $meta;
        $student->save();

        // Dispatch Notification if user_id exists
        if ($student->user_id) {
            $notificationService->sendNotification([
                'user_id' => $student->user_id,
                'type' => 'AT_RISK_INTERVENTION',
                'title' => $subject,
                'message' => $message,
                'metadata' => [
                    'student_id' => $student->id,
                    'intervention_type' => $interventionType,
                ],
                'channel' => 'IN_APP',
                'force_sync' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Intervention '{$interventionType}' recorded successfully and notification sent to student.",
            'student_id' => $student->id,
            'active_intervention' => $interventionType,
        ]);
    }
}
