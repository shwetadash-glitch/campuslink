<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\Student;
use App\Services\EligibilityService;

class DriveController extends Controller {
    public function available(Request $request) {
        $drives = PlacementDrive::with(['company', 'job'])
            ->whereIn('status', ['PUBLISHED', 'REGISTRATION_OPEN', 'IN_PROGRESS'])
            ->orderBy('start_date', 'asc')
            ->get();
            
        $results = $drives->map(function ($d) {
            return [
                'id' => $d->id,
                'company_id' => $d->company_id,
                'company_name' => $d->company ? $d->company->name : "Unknown Company",
                'job_id' => $d->job_id,
                'job_title' => $d->job ? $d->job->title : null,
                'name' => $d->name,
                'date' => $d->start_date ? $d->start_date->toDateString() : null,
                'status' => $d->status,
                'venue' => $d->metadata_json['venue'] ?? null
            ];
        });
        return response()->json($results);
    }
    
        public function candidates(Request $request, $driveId) {
        if ($request->user()->role !== 'RECRUITER') return response()->json(['detail' => 'Unauthorized'], 403);
        $recruiter = $request->user()->recruiterProfile;
        $drive = PlacementDrive::where('id', $driveId)->where('company_id', $recruiter->company_id)->first();
        if (!$drive) return response()->json(['detail' => 'Drive not found or access denied'], 404);
        
        $candidates = DriveCandidate::with('student')->where('drive_id', $driveId)->get();
        $results = $candidates->map(function ($c) {
            return [
                'id' => $c->id,
                'drive_id' => $c->drive_id,
                'student_id' => $c->student_id,
                'student_name' => $c->student ? $c->student->first_name . ' ' . $c->student->last_name : "Unknown",
                'student_identifier' => $c->student ? $c->student->student_identifier : "N/A",
                'branch' => $c->student ? $c->student->branch : "N/A",
                'cgpa' => $c->student ? $c->student->cgpa : 0.0,
                'status' => $c->status,
                'eligibility_status' => ($c->status === 'ELIGIBLE' || $c->status === 'SHORTLISTED'),
                'shortlist_status' => $c->status === 'SHORTLISTED',
                'eligibility_score' => $c->eligibility_score,
                'registered_at' => $c->registered_at
            ];
        });
        return response()->json($results);
    }
    
    public function addCandidate(Request $request, $driveId) {
        $user = $request->user();
        $validated = $request->validate(['student_id' => 'required|integer']);
        $studentId = $validated['student_id'];
        
        if ($user->role === 'STUDENT') {
            $student = $user->studentProfile;
            if (!$student || $student->id != $studentId) return response()->json(['detail' => 'You can only register yourself'], 403);
        } elseif ($user->role === 'RECRUITER') {
            $recruiter = $user->recruiterProfile;
            $drive = PlacementDrive::where('id', $driveId)->where('company_id', $recruiter->company_id)->first();
            if (!$drive) return response()->json(['detail' => 'Drive not found or access denied'], 404);
        } else {
            return response()->json(['detail' => 'Unauthorized'], 403);
        }
        
        $existing = DriveCandidate::where('drive_id', $driveId)->where('student_id', $studentId)->first();
        if ($existing) return response()->json(['detail' => 'Already registered'], 400);
        
        $candidate = DriveCandidate::create([
            'drive_id' => $driveId,
            'student_id' => $studentId,
            'status' => 'REGISTERED'
        ]);
        
        return response()->json($candidate, 201); // Assuming 201 created. Wait, return it.
    }
    
    public function updateCandidate(Request $request, $driveId, $candidateId) {
        if ($request->user()->role !== 'RECRUITER') return response()->json(['detail' => 'Unauthorized'], 403);
        $recruiter = $request->user()->recruiterProfile;
        $drive = PlacementDrive::where('id', $driveId)->where('company_id', $recruiter->company_id)->first();
        if (!$drive) return response()->json(['detail' => 'Drive not found or access denied'], 404);
        
        $candidate = DriveCandidate::where('id', $candidateId)->where('drive_id', $driveId)->first();
        if (!$candidate) return response()->json(['detail' => 'Candidate not found'], 404);
        
        $validated = $request->validate(['status' => 'sometimes|string', 'shortlist_status' => 'sometimes|boolean']);
        if (isset($validated['shortlist_status']) && $validated['shortlist_status']) {
            $candidate->status = 'SHORTLISTED';
        } elseif (isset($validated['status'])) {
            $candidate->status = $validated['status'];
        }
        $candidate->save();
        return response()->json(['status' => 'success', 'candidate' => $candidate]);
    }
    
        public function evaluate(Request $request, $driveId, EligibilityService $service) {
        if ($request->user()->role !== 'RECRUITER') return response()->json(['detail' => 'Unauthorized'], 403);
        $recruiter = $request->user()->recruiterProfile;
        $drive = PlacementDrive::with('job')->where('id', $driveId)->where('company_id', $recruiter->company_id)->first();
        if (!$drive) return response()->json(['detail' => 'Drive not found or access denied'], 404);
        if (!$drive->job_id) return response()->json(['detail' => 'Drive has no associated job posting to evaluate against'], 400);
        
        $candidates = DriveCandidate::with('student')->where('drive_id', $driveId)->get();
        $evaluated = 0;
        $eligibleCount = 0;
        $ineligibleCount = 0;
        $breakdown = [];
        
        foreach ($candidates as $c) {
            $result = $service->checkHardEligibility($c->student, $drive->job);
            $c->eligibility_score = $result['is_eligible'] ? 100 : 0;
            $c->eligibility_details = $result;
            $c->status = $result['is_eligible'] ? 'ELIGIBLE' : 'INELIGIBLE';
            $c->save();
            $evaluated++;
            
            if ($result['is_eligible']) {
                $eligibleCount++;
            } else {
                $ineligibleCount++;
                foreach ($result['failed_criteria'] as $reason) {
                    if (!isset($breakdown[$reason])) {
                        $breakdown[$reason] = 0;
                    }
                    $breakdown[$reason]++;
                }
            }
        }
        
        return response()->json([
            'drive_id' => $drive->id,
            'drive_name' => $drive->name,
            'total_candidates' => $evaluated,
            'eligible_count' => $eligibleCount,
            'ineligible_count' => $ineligibleCount,
            'failure_breakdown' => $breakdown
        ]);
    }
    
    public function withdraw(Request $request, $driveId) {
        $user = $request->user();
        if ($user->role !== 'STUDENT') return response()->json(['detail' => 'Only students can withdraw registrations'], 403);
        $student = $user->studentProfile;
        
        $candidate = DriveCandidate::where('drive_id', $driveId)->where('student_id', $student->id)->first();
        if (!$candidate) return response()->json(['detail' => 'You are not registered for this drive'], 404);
        
        $candidate->status = 'WITHDRAWN';
        $candidate->save();
        
        return response()->json(['status' => 'success']);
    }
}

