<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Resume;
use App\Models\ResumeVersion;
use App\Models\Student;
use App\Services\Resume\ResumeProfileAggregatorService;
use App\Services\Resume\ResumeContentGeneratorService;
use App\Services\Resume\JobDescriptionAnalyzerService;
use App\Services\Resume\ResumeQualityAnalysisService;
use App\Services\Resume\ResumePdfExportService;
use App\Services\Resume\ResumeDocxExportService;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ResumeBuilderController extends Controller
{
    protected ResumeProfileAggregatorService $profileAggregator;
    protected ResumeContentGeneratorService $contentGenerator;
    protected JobDescriptionAnalyzerService $jobAnalyzer;
    protected ResumeQualityAnalysisService $qualityAnalyzer;
    protected ResumePdfExportService $pdfExporter;
    protected ResumeDocxExportService $docxExporter;

    public function __construct(
        ResumeProfileAggregatorService $profileAggregator,
        ResumeContentGeneratorService $contentGenerator,
        JobDescriptionAnalyzerService $jobAnalyzer,
        ResumeQualityAnalysisService $qualityAnalyzer,
        ResumePdfExportService $pdfExporter,
        ResumeDocxExportService $docxExporter
    ) {
        $this->profileAggregator = $profileAggregator;
        $this->contentGenerator = $contentGenerator;
        $this->jobAnalyzer = $jobAnalyzer;
        $this->qualityAnalyzer = $qualityAnalyzer;
        $this->pdfExporter = $pdfExporter;
        $this->docxExporter = $docxExporter;
    }

    private function getStudent(Request $request): Student
    {
        $student = $request->user()->studentProfile;
        if (!$student) {
            abort(403, 'Authenticated user does not have an associated student profile.');
        }
        return $student;
    }

    private function findStudentResume(Student $student, int $resumeId): Resume
    {
        return Resume::where('id', $resumeId)
            ->where('student_id', $student->id)
            ->firstOrFail();
    }

    /**
     * List all resumes for the authenticated student.
     */
    public function index(Request $request)
    {
        $student = $this->getStudent($request);
        $resumes = Resume::where('student_id', $student->id)
            ->orderBy('is_primary', 'desc')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'resumes' => $resumes,
        ]);
    }

    /**
     * Create a new resume pre-populated from baseline verified student profile.
     */
    public function store(Request $request)
    {
        $student = $this->getStudent($request);

        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'target_role' => 'nullable|string|max:100',
            'target_company' => 'nullable|string|max:100',
            'job_id' => 'nullable|exists:jobs,id',
            'template' => 'nullable|string|in:modern,classic,technical',
        ]);

        // Aggregate fresh profile baseline
        $content = $this->profileAggregator->aggregateProfile($student);

        // Run baseline quality analysis
        $analysis = $this->qualityAnalyzer->analyze($student, $content);

        $isFirst = Resume::where('student_id', $student->id)->count() === 0;

        $resume = Resume::create([
            'student_id' => $student->id,
            'job_id' => $validated['job_id'] ?? null,
            'title' => $validated['title'],
            'target_role' => $validated['target_role'] ?? null,
            'target_company' => $validated['target_company'] ?? null,
            'template' => $validated['template'] ?? 'modern',
            'is_primary' => $isFirst,
            'content' => $content,
            'quality_score' => $analysis['quality_score'],
            'ats_score' => $analysis['ats_score'],
            'analysis_summary' => $analysis,
        ]);

        // Automatically create initial version 1 snapshot
        $resume->createSnapshot("Initial Draft from Student Profile");

        return response()->json([
            'status' => 'success',
            'resume' => $resume->fresh(['versions']),
        ], 201);
    }

    /**
     * Get single resume details.
     */
    public function show(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);
        $resume->load(['job.company', 'versions']);

        return response()->json([
            'status' => 'success',
            'resume' => $resume,
        ]);
    }

    /**
     * Update resume content, template, or metadata.
     */
    public function update(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:100',
            'target_role' => 'nullable|string|max:100',
            'target_company' => 'nullable|string|max:100',
            'template' => 'nullable|string|in:modern,classic,technical',
            'content' => 'sometimes|array',
            'create_version' => 'nullable|boolean',
            'change_summary' => 'nullable|string|max:200',
        ]);

        $content = $validated['content'] ?? $resume->content;

        // Re-analyze quality on content update
        $analysis = $this->qualityAnalyzer->analyze($student, $content);

        $updateData = [
            'quality_score' => $analysis['quality_score'],
            'ats_score' => $analysis['ats_score'],
            'analysis_summary' => $analysis,
        ];

        if (isset($validated['title'])) $updateData['title'] = $validated['title'];
        if (isset($validated['target_role'])) $updateData['target_role'] = $validated['target_role'];
        if (isset($validated['target_company'])) $updateData['target_company'] = $validated['target_company'];
        if (isset($validated['template'])) $updateData['template'] = $validated['template'];
        if (isset($validated['content'])) $updateData['content'] = $validated['content'];

        // ANY modification to content, title, target_role, or template invalidates approval and cached PDF
        $hasContentOrPresentationChange = isset($validated['content']) || 
                                          isset($validated['template']) || 
                                          isset($validated['title']) || 
                                          isset($validated['target_role']);
        if ($hasContentOrPresentationChange) {
            $updateData['approved_by_student_at'] = null;
            if ($resume->pdf_path && Storage::disk('local')->exists($resume->pdf_path)) {
                Storage::disk('local')->delete($resume->pdf_path);
            }
            $updateData['pdf_path'] = null;
            $updateData['pdf_generated_at'] = null;
        }

        $resume->update($updateData);

        if (!empty($validated['create_version'])) {
            $resume->createSnapshot($validated['change_summary'] ?? 'Manual Save Snapshot');
        }

        return response()->json([
            'status' => 'success',
            'resume' => $resume->fresh(['versions']),
        ]);
    }

    /**
     * Delete resume.
     */
    public function destroy(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        if ($resume->pdf_path && Storage::disk('local')->exists($resume->pdf_path)) {
            Storage::disk('local')->delete($resume->pdf_path);
        }

        $resume->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Resume deleted successfully.',
        ]);
    }

    /**
     * Set resume as primary.
     */
    public function setPrimary(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        Resume::where('student_id', $student->id)->update(['is_primary' => false]);
        $resume->update(['is_primary' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Resume set as primary.',
            'resume' => $resume,
        ]);
    }

    /**
     * Create an explicit version snapshot.
     */
    public function createVersion(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'change_summary' => 'nullable|string|max:200',
        ]);

        $snapshot = $resume->createSnapshot($validated['change_summary'] ?? null);

        return response()->json([
            'status' => 'success',
            'version' => $snapshot,
        ], 201);
    }

    /**
     * List version history for a resume.
     */
    public function versions(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        return response()->json([
            'status' => 'success',
            'versions' => $resume->versions,
        ]);
    }

    /**
     * Get specific version snapshot.
     */
    public function showVersion(Request $request, $id, $versionNumber)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $version = ResumeVersion::where('resume_id', $resume->id)
            ->where('version_number', (int) $versionNumber)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'version' => $version,
        ]);
    }

    /**
     * Restore resume to a previous version snapshot.
     * Restoring older content invalidates approval and cached PDF, requiring re-review and re-approval.
     */
    public function restoreVersion(Request $request, $id, $versionNumber)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $version = ResumeVersion::where('resume_id', $resume->id)
            ->where('version_number', (int) $versionNumber)
            ->firstOrFail();

        // Run quality audit on restored content
        $analysis = $this->qualityAnalyzer->analyze($student, $version->content);

        // Invalidate approval and cached PDF on restoration
        if ($resume->pdf_path && Storage::disk('local')->exists($resume->pdf_path)) {
            Storage::disk('local')->delete($resume->pdf_path);
        }

        $resume->update([
            'content' => $version->content,
            'quality_score' => $analysis['quality_score'],
            'ats_score' => $analysis['ats_score'],
            'analysis_summary' => $analysis,
            'approved_by_student_at' => null, // Restoring requires re-review and re-approval
            'pdf_path' => null,
            'pdf_generated_at' => null,
        ]);

        $newSnapshot = $resume->createSnapshot("Restored from Version {$versionNumber}");

        return response()->json([
            'status' => 'success',
            'message' => "Resume restored to Version {$versionNumber}. Please review and re-approve before exporting.",
            'resume' => $resume->fresh(['versions']),
            'restored_version' => $newSnapshot->version_number,
        ]);
    }

    /**
     * Compare two versions or compare resume with student's current baseline profile.
     */
    public function compareVersions(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'v1' => 'nullable|integer',
            'v2' => 'nullable|integer',
            'compare_with_profile' => 'nullable|boolean',
        ]);

        $content1 = $resume->content;
        $label1 = "Current Version";

        if (!empty($validated['v1'])) {
            $snap1 = ResumeVersion::where('resume_id', $resume->id)->where('version_number', $validated['v1'])->firstOrFail();
            $content1 = $snap1->content;
            $label1 = "Version {$validated['v1']}";
        }

        if (!empty($validated['compare_with_profile'])) {
            $content2 = $this->profileAggregator->aggregateProfile($student);
            $label2 = "Verified Profile Baseline";
        } elseif (!empty($validated['v2'])) {
            $snap2 = ResumeVersion::where('resume_id', $resume->id)->where('version_number', $validated['v2'])->firstOrFail();
            $content2 = $snap2->content;
            $label2 = "Version {$validated['v2']}";
        } else {
            $content2 = $this->profileAggregator->aggregateProfile($student);
            $label2 = "Verified Profile Baseline";
        }

        return response()->json([
            'status' => 'success',
            'comparison' => [
                'left' => ['label' => $label1, 'content' => $content1],
                'right' => ['label' => $label2, 'content' => $content2],
            ],
        ]);
    }

    /**
     * AI-Powered Professional Summary Generation / Enhancement.
     */
    public function generateSummary(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'target_role' => 'nullable|string|max:100',
            'job_description' => 'nullable|string',
        ]);

        $result = $this->contentGenerator->generateProfessionalSummary(
            $student,
            $resume->content,
            $validated['target_role'] ?? $resume->target_role,
            $validated['job_description'] ?? $resume->job_description_raw
        );

        return response()->json($result);
    }

    /**
     * AI-Powered Work Experience Description Enhancement into Action-Verb Bullet Points.
     */
    public function improveExperience(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'experience' => 'required|array',
            'experience.job_title' => 'required|string',
            'experience.company' => 'required|string',
            'experience.description' => 'nullable|string',
            'experience.technologies' => 'nullable|string',
        ]);

        $result = $this->contentGenerator->improveExperienceDescription(
            $validated['experience'],
            $resume->target_role,
            $resume->job_description_raw
        );

        return response()->json($result);
    }

    /**
     * AI-Powered Project Description Enhancement into Action-Verb Bullet Points.
     */
    public function improveProject(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'project' => 'required|array',
            'project.title' => 'required|string',
            'project.description' => 'nullable|string',
            'project.technologies' => 'nullable|string',
        ]);

        $result = $this->contentGenerator->improveProjectDescription(
            $validated['project'],
            $resume->target_role,
            $resume->job_description_raw
        );

        return response()->json($result);
    }

    /**
     * Analyze submitted Job Description against resume skills & provide recommendations.
     */
    public function analyzeJobDescription(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $validated = $request->validate([
            'job_description' => 'required|string|min:20',
            'job_id' => 'nullable|exists:jobs,id',
        ]);

        $analysis = $this->jobAnalyzer->analyze(
            $student,
            $resume->content,
            $validated['job_description'],
            $validated['job_id'] ?? $resume->job_id
        );

        // Store analysis and match score on resume model
        $resume->update([
            'job_description_raw' => $validated['job_description'],
            'job_match_score' => $analysis['job_match_score'],
        ]);

        return response()->json($analysis);
    }

    /**
     * Resume Quality, Completeness, Readability, and ATS Check.
     */
    public function analyzeQuality(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $analysis = $this->qualityAnalyzer->analyze($student, $resume->content);

        $resume->update([
            'quality_score' => $analysis['quality_score'],
            'ats_score' => $analysis['ats_score'],
            'analysis_summary' => $analysis,
        ]);

        return response()->json([
            'status' => 'success',
            'analysis' => $analysis,
        ]);
    }

    /**
     * Record student approval before export.
     */
    public function approve(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $resume->approve();

        return response()->json([
            'status' => 'success',
            'message' => 'Resume approved for final export.',
            'approved_at' => $resume->approved_by_student_at->toIso8601String(),
        ]);
    }

    /**
     * Export resume to PDF (requires student approval).
     */
    public function exportPdf(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        try {
            $pdfPath = $this->pdfExporter->exportPdf($resume, true);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'APPROVAL_REQUIRED',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'PDF generated successfully.',
            'pdf_path' => $pdfPath,
            'download_url' => url("/api/v1/students/me/resumes/{$resume->id}/download-pdf"),
            'generated_at' => $resume->pdf_generated_at->toIso8601String(),
        ]);
    }

    /**
     * Securely download or stream generated resume PDF.
     */
    public function downloadPdf(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        // Security Guard 1: Prevent arbitrary path traversal attack before any disk operation
        if ($resume->pdf_path) {
            if (!is_string($resume->pdf_path) || !str_starts_with($resume->pdf_path, 'resumes/') || str_contains($resume->pdf_path, '..')) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'INVALID_DOCUMENT_PATH',
                    'message' => 'Invalid or suspicious document path.',
                ], 400);
            }
        }

        if (!$resume->pdf_path || !Storage::disk('local')->exists($resume->pdf_path)) {
            // Auto-generate if approved
            if ($resume->isApproved()) {
                $this->pdfExporter->exportPdf($resume, false);
            } else {
                return response()->json([
                    'status' => 'error',
                    'code' => 'APPROVAL_REQUIRED',
                    'message' => 'Resume must be reviewed and approved by student before PDF export or download.',
                ], 422);
            }
        }

        $filePath = Storage::disk('local')->path($resume->pdf_path);
        $cleanTitle = preg_replace('/[^A-Za-z0-9_-]/', '_', $resume->title);
        $filename = "{$cleanTitle}.pdf";

        return response()->download($filePath, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * Export resume to DOCX (requires student approval).
     */
    public function exportDocx(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        try {
            $docxPath = $this->docxExporter->exportDocx($resume, true);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'APPROVAL_REQUIRED',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'DOCX generated successfully.',
            'docx_path' => $docxPath,
            'download_url' => url("/api/v1/students/me/resumes/{$resume->id}/download-docx"),
        ]);
    }

    /**
     * Securely download generated resume DOCX.
     */
    public function downloadDocx(Request $request, $id)
    {
        $student = $this->getStudent($request);
        $resume = $this->findStudentResume($student, (int) $id);

        $docxPath = "resumes/resume_{$resume->id}.docx";

        if (!Storage::disk('local')->exists($docxPath)) {
            // Auto-generate if approved
            if ($resume->isApproved()) {
                $this->docxExporter->exportDocx($resume, false);
            } else {
                return response()->json([
                    'status' => 'error',
                    'code' => 'APPROVAL_REQUIRED',
                    'message' => 'Resume must be reviewed and approved by student before DOCX export or download.',
                ], 422);
            }
        }

        $filePath = Storage::disk('local')->path($docxPath);
        $cleanTitle = preg_replace('/[^A-Za-z0-9_-]/', '_', $resume->title);
        $filename = "{$cleanTitle}.docx";

        return response()->download($filePath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
    }

    /**
     * Authorized officer / recruiter download of student resume.
     * Enforces strict placement relationship between recruiter company and candidate.
     */
    public function authorizedDownload(Request $request, $studentId, $id)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        $resume = Resume::where('id', $id)
            ->where('student_id', $studentId)
            ->firstOrFail();

        // Security Guard 1: Prevent arbitrary path traversal attack before any disk operation
        if ($resume->pdf_path) {
            if (!is_string($resume->pdf_path) || !str_starts_with($resume->pdf_path, 'resumes/') || str_contains($resume->pdf_path, '..')) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'INVALID_DOCUMENT_PATH',
                    'message' => 'Invalid or suspicious document path.',
                ], 400);
            }
        }

        $userRole = $user->role instanceof \BackedEnum ? $user->role->value : (string) $user->role;

        // Recruiter access requires active evaluation relationship
        if ($userRole === 'RECRUITER') {
            $recruiter = $user->recruiterProfile;
            if (!$recruiter || !$recruiter->company_id) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'UNAUTHORIZED_RECRUITER_ACCESS',
                    'message' => 'No active company profile found for this recruiter account.',
                ], 403);
            }

            $companyId = $recruiter->company_id;

            // 1. Candidate applied to a job of this company
            $hasJobApp = \App\Models\Application::where('student_id', $studentId)
                ->whereHas('job', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                })->exists();

            // 2. Candidate registered for a placement drive of this company
            $hasDriveCand = \App\Models\DriveCandidate::where('student_id', $studentId)
                ->whereHas('placementDrive', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                })->exists();

            // 3. Candidate has an offer from this company
            $hasOffer = \App\Models\Offer::where('student_id', $studentId)
                ->where('company_id', $companyId)
                ->exists();

            // 4. Resume is tailored for a specific job of this company
            $isTailoredJob = $resume->job_id && \App\Models\Job::where('id', $resume->job_id)
                ->where('company_id', $companyId)
                ->exists();

            if (!$hasJobApp && !$hasDriveCand && !$hasOffer && !$isTailoredJob) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'UNAUTHORIZED_RECRUITER_ACCESS',
                    'message' => 'You are not authorized to evaluate this candidate. The student has not applied to your company drives or jobs.',
                ], 403);
            }
        } elseif (!in_array($userRole, ['SUPER_ADMIN', 'PLACEMENT_OFFICER'])) {
            return response()->json([
                'status' => 'error',
                'code' => 'FORBIDDEN',
                'message' => 'Unauthorized document access.',
            ], 403);
        }

        // Candidate resume must be approved and generated
        if (!$resume->isApproved() || !$resume->pdf_path || !Storage::disk('local')->exists($resume->pdf_path)) {
            return response()->json([
                'status' => 'error',
                'code' => 'PDF_NOT_FOUND',
                'message' => 'Official verified resume PDF is not currently available for this candidate.',
            ], 404);
        }

        $filePath = Storage::disk('local')->path($resume->pdf_path);
        return response()->download($filePath, "Resume_Candidate_{$studentId}.pdf", [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * Authorized officer / recruiter download of student resume in DOCX format.
     */
    public function authorizedDownloadDocx(Request $request, $studentId, $id)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }

        $resume = Resume::where('id', $id)
            ->where('student_id', $studentId)
            ->firstOrFail();

        $userRole = $user->role instanceof \BackedEnum ? $user->role->value : (string) $user->role;

        // Recruiter access requires active evaluation relationship
        if ($userRole === 'RECRUITER') {
            $recruiter = $user->recruiterProfile;
            if (!$recruiter || !$recruiter->company_id) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'UNAUTHORIZED_RECRUITER_ACCESS',
                    'message' => 'No active company profile found for this recruiter account.',
                ], 403);
            }

            $companyId = $recruiter->company_id;

            $hasJobApp = \App\Models\Application::where('student_id', $studentId)
                ->whereHas('job', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                })->exists();

            $hasDriveCand = \App\Models\DriveCandidate::where('student_id', $studentId)
                ->whereHas('placementDrive', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                })->exists();

            $hasOffer = \App\Models\Offer::where('student_id', $studentId)
                ->where('company_id', $companyId)
                ->exists();

            $isTailoredJob = $resume->job_id && \App\Models\Job::where('id', $resume->job_id)
                ->where('company_id', $companyId)
                ->exists();

            if (!$hasJobApp && !$hasDriveCand && !$hasOffer && !$isTailoredJob) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'UNAUTHORIZED_RECRUITER_ACCESS',
                    'message' => 'You are not authorized to evaluate this candidate. The student has not applied to your company drives or jobs.',
                ], 403);
            }
        } elseif (!in_array($userRole, ['SUPER_ADMIN', 'PLACEMENT_OFFICER'])) {
            return response()->json([
                'status' => 'error',
                'code' => 'FORBIDDEN',
                'message' => 'Unauthorized document access.',
            ], 403);
        }

        // Candidate resume must be approved
        if (!$resume->isApproved()) {
            return response()->json([
                'status' => 'error',
                'code' => 'DOCX_NOT_APPROVED',
                'message' => 'Official verified resume DOCX is not currently approved for this candidate.',
            ], 404);
        }

        $docxPath = "resumes/resume_{$resume->id}.docx";
        if (!Storage::disk('local')->exists($docxPath)) {
            $this->docxExporter->exportDocx($resume, false);
        }

        $filePath = Storage::disk('local')->path($docxPath);
        return response()->download($filePath, "Resume_Candidate_{$studentId}.docx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
    }
}
