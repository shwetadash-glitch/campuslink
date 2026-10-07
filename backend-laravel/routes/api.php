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
        });

        Route::middleware('role:RECRUITER,SUPER_ADMIN,PLACEMENT_OFFICER')->prefix('recruiters')->group(function () {
            Route::get('/me', [RecruiterController::class, 'me']);
            Route::put('/me/company', [RecruiterController::class, 'updateCompany']);
            Route::get('/me/dashboard', [RecruiterController::class, 'dashboard']);
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
            Route::get('/students', [OfficerController::class, 'students']);
            Route::get('/students/{id}', [OfficerController::class, 'student']);
            Route::get('/companies', [OfficerController::class, 'companies']);
            Route::get('/drives/{drive}/ai-shortlist', [OfficerController::class, 'aiShortlist']);
            Route::post('/companies', [OfficerController::class, 'storeCompany']);
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
    });
});


Route::get('/ollama-test', function () {
    $response = Http::timeout(120)->post(
        env('OLLAMA_URL') . '/api/generate',
        [
            'model' => env('OLLAMA_MODEL', 'llama3.2'),
            'prompt' => 'Give me one interview question for a computer science student.',
            'stream' => false,
        ]
    );

    return $response->json();
});
