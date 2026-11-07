<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\RecruiterController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\DriveController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\SkillController;
use App\Http\Controllers\Api\ReadinessController;
use App\Http\Controllers\Api\OfficerController;
use App\Http\Controllers\Api\JobApplicationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\AiHelperController;
use App\Http\Controllers\Api\StudentPlacementJourneyController;
use App\Http\Controllers\Api\NotificationController;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/skills', [SkillController::class, 'index']);

    // Jobs endpoints that are fully public in FastAPI
    Route::get('/jobs/skills/all', [JobController::class, 'skillsAll']);
    Route::get('/jobs/{job}/requirements', [JobController::class, 'requirements']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        
        Route::get('/messages/contacts', [MessageController::class, 'contacts']);
        Route::get('/messages/{userId}', [MessageController::class, 'conversation']);
        Route::post('/messages', [MessageController::class, 'send']);
        Route::post('/ai-interview/chat', [AiHelperController::class, 'chat']);
        
        Route::get('/jobs/available', [JobController::class, 'index']);
        Route::post('/jobs/{job}/requirements', [JobController::class, 'addRequirement']); 
        Route::delete('/jobs/{job}/requirements/{req}', [JobController::class, 'removeRequirement']); 
        Route::post('/jobs/{job}/eligibility/check', [JobController::class, 'checkEligibilityAdmin']); 
        Route::get('/jobs/{job}/my-eligibility', [JobController::class, 'checkEligibility']);
        Route::post('/jobs/{job}/apply', [JobApplicationController::class, 'apply'])->middleware('role:STUDENT');

        Route::get('/drives/available', [DriveController::class, 'available']);
        Route::get('/drives/{drive}/candidates', [DriveController::class, 'candidates']);
        Route::post('/drives/{drive}/candidates', [DriveController::class, 'addCandidate']);
        Route::patch('/drives/{drive}/candidates/{candidate}', [DriveController::class, 'updateCandidate']);
        Route::post('/drives/{drive}/evaluate-eligibility', [DriveController::class, 'evaluate']);
        Route::post('/drives/{drive}/withdraw', [DriveController::class, 'withdraw']);
        Route::get('/students/{id}/resume/download', [\App\Http\Controllers\Api\StudentController::class, 'downloadResume']);

        Route::middleware('role:STUDENT')->prefix('students')->group(function () {
            Route::get('/me', [StudentController::class, 'getProfile']);
            Route::put('/me', [StudentController::class, 'updateBasicInfo']);
            Route::patch('/me/links', [StudentController::class, 'updateLinks']);
            Route::get('/me/full', [StudentController::class, 'getFullProfile']);
            Route::get('/me/completeness', [StudentController::class, 'completeness']);
            Route::get('/me/academic', [\App\Http\Controllers\Api\StudentAcademicController::class, 'index']);
            Route::post('/me/academic', [\App\Http\Controllers\Api\StudentAcademicController::class, 'store']);
            Route::put('/me/academic/{id}', [\App\Http\Controllers\Api\StudentAcademicController::class, 'update']);
            Route::delete('/me/academic/{id}', [\App\Http\Controllers\Api\StudentAcademicController::class, 'destroy']);
            Route::get('/me/skills', [\App\Http\Controllers\Api\StudentSkillController::class, 'index']);
            Route::post('/me/skills', [\App\Http\Controllers\Api\StudentSkillController::class, 'store']);
            Route::put('/me/skills/{id}', [\App\Http\Controllers\Api\StudentSkillController::class, 'update']);
            Route::delete('/me/skills/{id}', [\App\Http\Controllers\Api\StudentSkillController::class, 'destroy']);
            Route::get('/me/projects', [\App\Http\Controllers\Api\StudentProjectController::class, 'index']);
            Route::post('/me/projects', [\App\Http\Controllers\Api\StudentProjectController::class, 'store']);
            Route::put('/me/projects/{id}', [\App\Http\Controllers\Api\StudentProjectController::class, 'update']);
            Route::delete('/me/projects/{id}', [\App\Http\Controllers\Api\StudentProjectController::class, 'destroy']);
            Route::get('/me/certifications', [\App\Http\Controllers\Api\StudentCertificationController::class, 'index']);
            Route::post('/me/certifications', [\App\Http\Controllers\Api\StudentCertificationController::class, 'store']);
            Route::put('/me/certifications/{id}', [\App\Http\Controllers\Api\StudentCertificationController::class, 'update']);
            Route::delete('/me/certifications/{id}', [\App\Http\Controllers\Api\StudentCertificationController::class, 'destroy']);
            Route::post('/me/resume', [StudentController::class, 'uploadResume']);
            Route::delete('/me/resume', [StudentController::class, 'deleteResume']);
            Route::get('/me/drives', [StudentController::class, 'drives']);

            // Milestone 3: Student Placement Journey
            Route::get('/me/placement-dashboard', [StudentPlacementJourneyController::class, 'dashboard']);
            Route::get('/me/available-drives', [StudentPlacementJourneyController::class, 'availableDrives']);
            Route::post('/me/drives/{driveId}/register', [StudentPlacementJourneyController::class, 'registerForDrive']);
            Route::post('/me/drives/{driveId}/withdraw', [StudentPlacementJourneyController::class, 'withdrawFromDrive']);
            Route::get('/me/offers', [StudentPlacementJourneyController::class, 'offers']);
            Route::get('/me/offers/{offerId}', [StudentPlacementJourneyController::class, 'showOffer']);
            Route::get('/me/offers/{offerId}/letter', [StudentPlacementJourneyController::class, 'downloadOfferLetter']);
            Route::post('/me/offers/{offerId}/accept', [StudentPlacementJourneyController::class, 'acceptOffer']);
            Route::post('/me/offers/{offerId}/reject', [StudentPlacementJourneyController::class, 'rejectOffer']);
            Route::post('/me/offers/{offerId}/confirm-joining', [StudentPlacementJourneyController::class, 'confirmJoining']);

            // Milestone 8: Student Off-Campus Offer Submission & Document Uploads
            Route::post('/me/offers/off-campus', [\App\Http\Controllers\Api\StudentOfferSubmissionController::class, 'storeOffCampus']);
            Route::post('/me/offers/{offerId}/documents', [\App\Http\Controllers\Api\StudentOfferSubmissionController::class, 'uploadDocument']);
            Route::get('/me/offers/{offerId}/documents/{documentId}/download', [\App\Http\Controllers\Api\StudentOfferSubmissionController::class, 'downloadDocument']);

            // Milestone 4: AI Resume Builder & Job Customization
            Route::prefix('me/resumes')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'index']);
                Route::post('/', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'store']);
                Route::get('/{id}', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'show']);
                Route::put('/{id}', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'update']);
                Route::delete('/{id}', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'destroy']);
                Route::post('/{id}/set-primary', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'setPrimary']);
                Route::post('/{id}/versions', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'createVersion']);
                Route::get('/{id}/versions', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'versions']);
                Route::get('/{id}/versions/{versionNumber}', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'showVersion']);
                Route::post('/{id}/versions/{versionNumber}/restore', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'restoreVersion']);
                Route::post('/{id}/compare', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'compareVersions']);
                Route::post('/{id}/generate-summary', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'generateSummary']);
                Route::post('/{id}/improve-project', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'improveProject']);
                Route::post('/{id}/analyze-job', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'analyzeJobDescription']);
                Route::post('/{id}/analyze-quality', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'analyzeQuality']);
                Route::post('/{id}/approve', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'approve']);
                Route::post('/{id}/export-pdf', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'exportPdf']);
                Route::get('/{id}/download-pdf', [\App\Http\Controllers\Api\ResumeBuilderController::class, 'downloadPdf']);
            });

            // Milestone 5: Candidate Assessment Sessions
            Route::prefix('me/assessments')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\AssessmentController::class, 'studentAssessments']);
                Route::post('/{id}/start', [\App\Http\Controllers\Api\AssessmentController::class, 'startSession']);
                Route::get('/sessions/{sessionId}', [\App\Http\Controllers\Api\AssessmentController::class, 'showSession']);
                Route::post('/sessions/{sessionId}/save-answer', [\App\Http\Controllers\Api\AssessmentController::class, 'saveAnswer']);
                Route::post('/sessions/{sessionId}/run-code', [\App\Http\Controllers\Api\AssessmentController::class, 'runCode']);
                Route::post('/sessions/{sessionId}/submit', [\App\Http\Controllers\Api\AssessmentController::class, 'submit']);
                Route::post('/sessions/{sessionId}/telemetry', [\App\Http\Controllers\Api\AssessmentController::class, 'recordTelemetry']);
                Route::get('/sessions/{sessionId}/result', [\App\Http\Controllers\Api\AssessmentController::class, 'result']);
            });

            // Milestone 6: Candidate AI Interview Sessions
            Route::prefix('me/ai-interviews')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\AiInterviewController::class, 'studentInterviews']);
                Route::post('/{id}/start', [\App\Http\Controllers\Api\AiInterviewController::class, 'startCandidateSession']);
                Route::get('/sessions/{sessionId}', [\App\Http\Controllers\Api\AiInterviewController::class, 'showCandidateSession']);
                Route::post('/sessions/{sessionId}/answer', [\App\Http\Controllers\Api\AiInterviewController::class, 'answerQuestion']);
                Route::get('/sessions/{sessionId}/report', [\App\Http\Controllers\Api\AiInterviewController::class, 'sessionReport']);
            });

            // Milestone 7: AI Communication Skills Coach
            Route::prefix('me/communication-coach')->group(function () {
                Route::get('/categories', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'categories']);
                Route::get('/scenarios', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'scenarios']);
                Route::get('/scenarios/{id}', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'showScenario']);
                Route::post('/sessions/start', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'startSession']);
                Route::post('/sessions/{id}/revision', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'createRevision']);
                Route::get('/sessions/{id}', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'showSession']);
                Route::post('/sessions/{id}/submit', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'submit']);
                Route::post('/sessions/{id}/retry-evaluation', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'retryEvaluation']);
                Route::get('/sessions/{id}/feedback', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'feedback']);
                Route::get('/progress', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'progress']);
                Route::get('/history', [\App\Http\Controllers\Api\CommunicationCoachController::class, 'history']);
            });
        });

        Route::middleware('role:RECRUITER,SUPER_ADMIN,PLACEMENT_OFFICER')->prefix('recruiters')->group(function () {
            Route::get('/me', [RecruiterController::class, 'me']);
            Route::put('/me/company', [RecruiterController::class, 'updateCompany']);
            Route::get('/me/dashboard', [RecruiterController::class, 'dashboard']);
            Route::get('/me/shortlisted', [RecruiterController::class, 'shortlistedCandidates']);
            Route::get('/candidates/{id}', [RecruiterController::class, 'candidate']);
            
            Route::get('/me/jobs', [\App\Http\Controllers\Api\RecruiterJobController::class, 'index']);
            Route::post('/me/jobs', [\App\Http\Controllers\Api\RecruiterJobController::class, 'store']);
            Route::get('/me/jobs/{id}', [\App\Http\Controllers\Api\RecruiterJobController::class, 'show']);
            Route::put('/me/jobs/{id}', [\App\Http\Controllers\Api\RecruiterJobController::class, 'update']);
            Route::delete('/me/jobs/{id}', [\App\Http\Controllers\Api\RecruiterJobController::class, 'destroy']);
            Route::get('/me/drives', [\App\Http\Controllers\Api\RecruiterDriveController::class, 'index']);
            Route::post('/me/drives', [\App\Http\Controllers\Api\RecruiterDriveController::class, 'store']);
            Route::put('/me/drives/{id}', [\App\Http\Controllers\Api\RecruiterDriveController::class, 'update']);
            Route::delete('/me/drives/{id}', [\App\Http\Controllers\Api\RecruiterDriveController::class, 'destroy']);

            // Milestone 6: Recruiter AI Interview Candidate Review
            Route::get('/ai-interviews/{id}/sessions', [\App\Http\Controllers\Api\AiInterviewController::class, 'sessions']);
            Route::get('/ai-interviews/sessions/{sessionId}', [\App\Http\Controllers\Api\AiInterviewController::class, 'sessionDetail']);

            // Milestone 8: Recruiter Offer Issuance & Documents
            Route::post('/drives/{driveId}/candidates/{candidateId}/offer', [\App\Http\Controllers\Api\RecruiterOfferController::class, 'issueOffer']);
            Route::get('/offers/{offerId}/documents/{documentId}/download', [\App\Http\Controllers\Api\RecruiterOfferController::class, 'downloadDocument']);
        });

        Route::middleware('role:SUPER_ADMIN')->prefix('admin')->group(function () {
            Route::get('/users', [AdminController::class, 'index']);
            Route::get('/users/{id}', [AdminController::class, 'show']);
            Route::patch('/users/{id}/status', [AdminController::class, 'status']);
        });

        Route::middleware('role:SUPER_ADMIN,PLACEMENT_OFFICER')->prefix('skills')->group(function () {
            Route::post('/', [SkillController::class, 'store']);
            Route::put('/{id}', [SkillController::class, 'update']);
            Route::delete('/{id}', [SkillController::class, 'destroy']);
        });

        Route::middleware('role:SUPER_ADMIN,PLACEMENT_OFFICER')->prefix('officer')->group(function () {
            Route::get('/dashboard', [\App\Http\Controllers\Api\OfficerDashboardController::class, 'index']);
            Route::get('/students', [OfficerController::class, 'students']);
            Route::get('/students/{id}', [OfficerController::class, 'student']);
            Route::get('/companies', [OfficerController::class, 'companies']);
            Route::get('/drives/{drive}/ai-shortlist', [OfficerController::class, 'aiShortlist']);
            Route::post('/companies', [OfficerController::class, 'storeCompany']);

            // Milestone 5: Officer Assessment Management
            Route::prefix('assessments')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\AssessmentController::class, 'index']);
                Route::post('/', [\App\Http\Controllers\Api\AssessmentController::class, 'store']);
                Route::get('/{id}', [\App\Http\Controllers\Api\AssessmentController::class, 'show']);
                Route::put('/{id}', [\App\Http\Controllers\Api\AssessmentController::class, 'update']);
                Route::post('/{id}/publish', [\App\Http\Controllers\Api\AssessmentController::class, 'publish']);
                Route::post('/{id}/questions', [\App\Http\Controllers\Api\AssessmentController::class, 'addQuestions']);
                Route::post('/generate-questions', [\App\Http\Controllers\Api\AssessmentController::class, 'generateQuestions']);
                Route::post('/questions/{questionId}/approve', [\App\Http\Controllers\Api\AssessmentController::class, 'approveQuestion']);
                Route::match(['get', 'post'], '/question-banks', [\App\Http\Controllers\Api\AssessmentController::class, 'questionBanks']);
                Route::get('/{id}/submissions', [\App\Http\Controllers\Api\AssessmentController::class, 'submissions']);
                Route::post('/submissions/{sessionId}/evaluate-subjective', [\App\Http\Controllers\Api\AssessmentController::class, 'evaluateSubjective']);
            });

            // Milestone 6: Officer AI Interview Management
            Route::prefix('ai-interviews')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\AiInterviewController::class, 'index']);
                Route::post('/', [\App\Http\Controllers\Api\AiInterviewController::class, 'store']);
                Route::get('/{id}', [\App\Http\Controllers\Api\AiInterviewController::class, 'show']);
                Route::put('/{id}', [\App\Http\Controllers\Api\AiInterviewController::class, 'update']);
                Route::post('/{id}/publish', [\App\Http\Controllers\Api\AiInterviewController::class, 'publish']);
                Route::post('/{id}/generate-questions', [\App\Http\Controllers\Api\AiInterviewController::class, 'generateQuestions']);
                Route::post('/{id}/approve-question/{questionId}', [\App\Http\Controllers\Api\AiInterviewController::class, 'approveQuestion']);
                Route::put('/{id}/edit-question/{questionId}', [\App\Http\Controllers\Api\AiInterviewController::class, 'editQuestion']);
                Route::get('/{id}/sessions', [\App\Http\Controllers\Api\AiInterviewController::class, 'sessions']);
                Route::get('/sessions/{sessionId}', [\App\Http\Controllers\Api\AiInterviewController::class, 'sessionDetail']);
                Route::post('/sessions/{sessionId}/override', [\App\Http\Controllers\Api\AiInterviewController::class, 'overrideScore']);
            });

            // Milestone 8: Officer Offer Verification Desk & Workflows
            Route::prefix('offers')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'index']);
                Route::post('/manual', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'manualRegister']);
                Route::get('/{id}', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'show']);
                Route::post('/{id}/claim-review', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'claimReview']);
                Route::post('/{id}/release-claim', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'releaseClaim']);
                Route::post('/{id}/verify', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'verify']);
                Route::post('/{id}/reject', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'reject']);
                Route::post('/{id}/request-info', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'requestInfo']);
                Route::post('/{id}/documents', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'uploadDocument']);
                Route::get('/{id}/documents/{documentId}/download', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'downloadDocument']);
                Route::get('/{id}/history', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'history']);
            });

            // Milestone 8: Institutional Analytics
            Route::prefix('analytics')->group(function () {
                Route::get('/overview', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'overview']);
                Route::get('/funnel', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'funnel']);
                Route::get('/branch-comparison', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'branchComparison']);
                Route::get('/trends', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'trends']);
                Route::get('/drives', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'drives']);
                Route::get('/drives/{id}', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'driveDetail']);
                Route::get('/interviews', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'interviews']);
                Route::get('/compensation', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'compensation']);
            });
        });

        // Milestone 2: Placement Drive Management, Conflict Engine, and Institutional Scheduler
        Route::middleware('role:SUPER_ADMIN,PLACEMENT_OFFICER')->prefix('tpo')->group(function () {
            Route::get('/drives', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'index']);
            Route::post('/drives', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'store']);
            Route::get('/drives/{id}', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'show']);
            Route::put('/drives/{id}', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'update']);
            Route::post('/drives/{id}/rounds', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'addRound']);
            Route::post('/drives/{id}/schedules', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'scheduleInterviewSlot']);
            Route::post('/emergency-clearance/issue', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'issueEmergencyClearance'])->middleware('role:SUPER_ADMIN');
            Route::post('/drives/{id}/transition-candidate/{candidateId}', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'transitionCandidate']);
            Route::post('/drives/{id}/rounds/{roundNumber}/candidate-result/{candidateId}', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'recordRoundResult']);
            Route::get('/drives/{id}/candidate-histories', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'candidateHistories']);
            Route::post('/detect-conflicts', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'detectConflictsAdHoc']);
            Route::get('/scheduler/events', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'schedulerEvents']);
            Route::match(['get', 'post'], '/venues', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'venues']);
            Route::match(['get', 'post'], '/institutional-events', [\App\Http\Controllers\Api\PlacementDriveManagerController::class, 'institutionalEvents']);

            // Milestone 8: TPO Offer Verification Desk Alias
            Route::prefix('offers')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'index']);
                Route::post('/manual', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'manualRegister']);
                Route::get('/{id}', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'show']);
                Route::post('/{id}/claim-review', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'claimReview']);
                Route::post('/{id}/release-claim', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'releaseClaim']);
                Route::post('/{id}/verify', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'verify']);
                Route::post('/{id}/reject', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'reject']);
                Route::post('/{id}/request-info', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'requestInfo']);
                Route::post('/{id}/documents', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'uploadDocument']);
                Route::get('/{id}/documents/{documentId}/download', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'downloadDocument']);
                Route::get('/{id}/history', [\App\Http\Controllers\Api\OfficerOfferVerificationController::class, 'history']);
            });

            // Milestone 8: TPO Institutional Analytics Alias
            Route::prefix('analytics')->group(function () {
                Route::get('/overview', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'overview']);
                Route::get('/funnel', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'funnel']);
                Route::get('/branch-comparison', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'branchComparison']);
                Route::get('/trends', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'trends']);
                Route::get('/drives', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'drives']);
                Route::get('/drives/{id}', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'driveDetail']);
                Route::get('/interviews', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'interviews']);
                Route::get('/compensation', [\App\Http\Controllers\Api\InstitutionalAnalyticsController::class, 'compensation']);
            });
        });
        
        Route::prefix('readiness')->group(function () {
            Route::middleware('role:STUDENT')->group(function () {
                Route::get('/me', [ReadinessController::class, 'me']);
                Route::post('/me/recalculate', [ReadinessController::class, 'recalculate']);
                Route::get('/me/jobs/{id}/skill-gaps', [ReadinessController::class, 'gaps']);
                Route::post('/me/jobs/{id}/skill-gaps/analyze', [ReadinessController::class, 'analyze']);
            });
            Route::middleware('role:SUPER_ADMIN,PLACEMENT_OFFICER')->group(function () {
                Route::get('/students/{id}', [ReadinessController::class, 'studentReadiness']);
                Route::get('/students/{s_id}/jobs/{j_id}/skill-gaps', [ReadinessController::class, 'studentGaps']);
            });
        });

        // Milestone 3: Core Notification System
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
            Route::patch('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
            Route::get('/preferences', [NotificationController::class, 'getPreferences']);
            Route::put('/preferences', [NotificationController::class, 'updatePreferences']);
        });

        // Milestone 4: Authorized Officer / Recruiter Resume Document Access
        Route::middleware('role:SUPER_ADMIN,PLACEMENT_OFFICER,RECRUITER')->get(
            '/resumes/students/{studentId}/{id}/download-pdf',
            [\App\Http\Controllers\Api\ResumeBuilderController::class, 'authorizedDownload']
        );
    });
});


Route::get('/ollama-test', function () {
    $response = Http::timeout(120)->post(
        config('services.ollama.url', 'http://localhost:11434') . '/api/generate',
        [
            'model' => config('services.ollama.model', 'llama3.2'),
            'prompt' => 'Give me one interview question for a computer science student.',
            'stream' => false,
        ]
    );

    return $response->json();
});


