<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Job;

class RecruiterJobController extends Controller {
    public function index(Request $request) {
        $recruiter = $request->user()->recruiterProfile;
        if ($recruiter) {
            return $recruiter->company->jobs()->with('requirements.skill')->get();
        }
        return \App\Models\Job::with('requirements.skill')->get();
    }
    public function store(Request $request) {
        $validated = $request->validate([
            'title' => 'required|string|min:3|max:150',
            'description' => 'required|string|min:10|max:5000',
            'employment_type' => 'required|string|min:2|max:50',
            'location' => 'nullable|string|max:100',
            'remote_type' => 'nullable|string|max:50',
            'salary_range' => 'nullable|string|max:100',
            'experience_requirement' => 'nullable|string|max:100',
            'application_deadline' => 'nullable|date',
            'openings' => 'nullable|integer|min:1',
            'job_code' => 'nullable|string|max:50',
            'job_description_json' => 'nullable|array',
            'eligibility_config' => 'nullable|array',
            'status' => 'nullable|string'
        ]);

        $validated['status'] = $validated['status'] ?? 'DRAFT';
        $validated['posted_by_id'] = $request->user()->recruiterProfile->id;
        
        $job = $request->user()->recruiterProfile->company->jobs()->create($validated);
        return response()->json($job, 201);
    }
    public function show(Request $request, $id) {
        return $request->user()->recruiterProfile->company->jobs()->findOrFail($id);
    }
    public function update(Request $request, $id) {
        $job = $request->user()->recruiterProfile->company->jobs()->findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'sometimes|string|min:3|max:150',
            'description' => 'sometimes|string|min:10|max:5000',
            'employment_type' => 'sometimes|string|min:2|max:50',
            'location' => 'nullable|string|max:100',
            'remote_type' => 'nullable|string|max:50',
            'salary_range' => 'nullable|string|max:100',
            'experience_requirement' => 'nullable|string|max:100',
            'application_deadline' => 'nullable|date',
            'openings' => 'nullable|integer|min:1',
            'job_code' => 'nullable|string|max:50',
            'job_description_json' => 'nullable|array',
            'eligibility_config' => 'nullable|array',
            'status' => 'sometimes|string'
        ]);
        
        if (isset($validated['status']) && $validated['status'] !== $job->status) {
            if (in_array($job->status, ['CLOSED', 'CANCELLED']) && $validated['status'] === 'DRAFT') {
                return response()->json(['detail' => 'Cannot revert a closed or cancelled job to draft.'], 400);
            }
        }
        
        $job->update($validated);
        return response()->json($job);
    }
    public function destroy(Request $request, $id) {
        $request->user()->recruiterProfile->company->jobs()->findOrFail($id)->delete();
        return response()->noContent();
    }
}
