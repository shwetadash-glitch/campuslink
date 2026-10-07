<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Job;
use App\Models\Skill;
use App\Models\JobRequirement;
use App\Services\EligibilityService;
use App\Services\SkillGapService;
use App\Models\Student;

class JobController extends Controller {
    public function index() { 
        $jobs = Job::where('status', 'PUBLISHED')->orderBy('created_at', 'desc')->get();
        return response()->json($jobs);
    }
    
    public function show(Job $job) { 
        return response()->json($job->load(['company', 'requirements.skill'])); 
    }
    
    public function checkEligibility(Request $request, Job $job, EligibilityService $service) {
        $student = $request->user()->studentProfile;
        if (!$student) return response()->json(['message' => 'Student profile not found'], 404);
        return response()->json($service->checkHardEligibility($student, $job));
    }
    
    public function calculateSkillGap(Request $request, Job $job, SkillGapService $service) {
        return response()->json($service->analyzeSkillGaps($request->user()->studentProfile, $job));
    }
    
    public function skillsAll() {
        return response()->json(Skill::orderBy('name')->get(['id', 'name', 'category']));
    }
    
    public function requirements(Job $job) {
        return response()->json($job->requirements);
    }
    
    public function addRequirement(Request $request, Job $job) {
        if ($request->user()->role !== 'RECRUITER' || $job->company_id !== $request->user()->recruiterProfile->company_id) {
            return response()->json(['detail' => 'Job not found'], 404);
        }
        
        $validated = $request->validate([
            'skill_id' => 'required|integer',
            'required_proficiency' => 'required|string',
            'is_mandatory' => 'boolean',
            'weight' => 'numeric|min:0.1|max:10.0',
            'minimum_experience' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:500'
        ]);
        
        if (!Skill::find($validated['skill_id'])) {
            return response()->json(['detail' => 'Skill not found'], 404);
        }
        
        if ($job->requirements()->where('skill_id', $validated['skill_id'])->exists()) {
            return response()->json(['detail' => 'Requirement for this skill already exists'], 400);
        }
        
        $req = $job->requirements()->create($validated);
        return response()->json($req, 200);
    }
    
    public function removeRequirement(Request $request, Job $job, $reqId) {
        if ($request->user()->role !== 'RECRUITER' || $job->company_id !== $request->user()->recruiterProfile->company_id) {
            return response()->json(['detail' => 'Job not found'], 404);
        }
        
        $req = $job->requirements()->find($reqId);
        if (!$req) {
            return response()->json(['detail' => 'Requirement not found'], 404);
        }
        
        $req->delete();
        return response()->json(null, 204);
    }
    
    public function checkEligibilityAdmin(Request $request, Job $job, EligibilityService $service) {
        if ($request->user()->role !== 'RECRUITER' || $job->company_id !== $request->user()->recruiterProfile->company_id) {
            return response()->json(['detail' => 'Job not found'], 404);
        }
        
        $validated = $request->validate(['student_id' => 'required|integer']);
        $student = Student::find($validated['student_id']);
        if (!$student) return response()->json(['detail' => 'Student not found'], 404);
        
        $result = $service->checkHardEligibility($student, $job);
        return response()->json($result);
    }
}
