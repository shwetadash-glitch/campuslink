<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Job;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\Student;

class RecruiterController extends Controller {
    public function me(Request $request) {
        $recruiter = $request->user()->recruiterProfile;
        if (!$recruiter) {
            return response()->json([
                'id' => '9283-TA',
                'contact_name' => 'System Admin',
                'contact_phone' => '+1 (555) 019-2831',
                'designation' => 'Global Campus Talent Lead',
                'company' => [
                    'name' => 'System Administrator',
                    'website' => 'https://www.examplecorp.com',
                    'headquarters' => 'San Francisco, CA (Global HQ)',
                    'size' => '10,000+',
                    'industry' => 'Administration',
                    'description' => 'You are viewing the Placement Operations portal in Super Admin mode. This allows you to oversee all jobs, drives, and candidates system-wide.'
                ]
            ]);
        }
        return response()->json($recruiter->load('company'));
    }

    public function updateCompany(Request $request) {
        $recruiter = $request->user()->recruiterProfile;
        $company = $recruiter ? $recruiter->company : null;
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'website' => 'nullable|string',
            'description' => 'nullable|string',
            'industry' => 'nullable|string',
            'size' => 'nullable|string',
            'headquarters' => 'nullable|string'
        ]);
        
        if (!$recruiter || !$company) {
            return response()->json($validated);
        }
        $company->update($validated);
        return response()->json($company);
    }
    
    public function dashboard(Request $request) {
        $recruiter = $request->user()->recruiterProfile;
        
        $active_jobs = Job::where('status', 'PUBLISHED');
        $upcoming_drives = PlacementDrive::where('status', '!=', 'CANCELLED')
                                         ->whereDate('start_date', '>=', now()->toDateString());
        $drives_query = PlacementDrive::query();
        
        if ($recruiter) {
            $active_jobs->where('company_id', $recruiter->company_id);
            $upcoming_drives->where('company_id', $recruiter->company_id);
            $drives_query->where('company_id', $recruiter->company_id);
        }
        
        $drive_ids = $drives_query->pluck('id');
        $total_candidates = DriveCandidate::whereIn('drive_id', $drive_ids)->count();
        $shortlisted_candidates = DriveCandidate::whereIn('drive_id', $drive_ids)
                                                ->where('status', 'SHORTLISTED')
                                                ->count();
                                                
        return response()->json([
            'active_jobs_count' => $active_jobs->count(),
            'upcoming_drives_count' => $upcoming_drives->count(),
            'total_candidates_count' => $total_candidates,
            'shortlisted_candidates_count' => $shortlisted_candidates
        ]);
    }
    
    public function candidate(Request $request, $id) {
        $student = Student::with(['skills.skill', 'projects', 'certifications', 'academicHistory', 'assessments', 'user'])->find($id);
        if (!$student) return response()->json(['detail' => 'Candidate not found'], 404);
        
        return response()->json([
            'id' => $student->id,
            'student_identifier' => $student->student_identifier,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'branch' => $student->branch,
            'graduation_year' => $student->graduation_year,
            'cgpa' => $student->cgpa ? (float) $student->cgpa : null,
            'backlogs_current' => $student->backlogs_current,
            'backlogs_history' => $student->backlogs_history,
            'phone' => $student->phone,
            'email' => $student->user ? $student->user->email : null,
            'resume_url' => $student->resume_url,
            'profile_metadata' => $student->profile_metadata,
            'skills' => $student->skills->map(function ($s) {
                return [
                    'id' => $s->id,
                    'skill_name' => $s->skill ? $s->skill->name : 'Skill',
                    'proficiency_level' => $s->proficiency_level,
                    'months_experience' => $s->months_experience
                ];
            }),
            'projects' => $student->projects->map(function ($p) {
                return [
                    'id' => $p->id,
                    'title' => $p->title,
                    'description' => $p->description,
                    'technologies' => $p->technologies,
                    'project_url' => $p->project_url
                ];
            }),
            'certifications' => $student->certifications->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'issuing_org' => $c->issuing_organization ?? $c->issuing_org ?? null,
                    'issue_date' => $c->issue_date ? $c->issue_date->toIso8601String() : null,
                    'expiry_date' => $c->expiry_date ? $c->expiry_date->toIso8601String() : null,
                    'credential_id' => $c->credential_id
                ];
            }),
            'academic_history' => $student->academicHistory->map(function ($a) {
                return [
                    'id' => $a->id,
                    'qualification' => $a->degree ?? $a->qualification ?? null,
                    'institution' => $a->institution_name ?? $a->institution ?? null,
                    'specialization' => $a->field_of_study ?? $a->specialization ?? null,
                    'start_year' => $a->start_date ? date('Y', strtotime($a->start_date)) : ($a->start_year ?? null),
                    'end_year' => $a->end_date ? date('Y', strtotime($a->end_date)) : ($a->end_year ?? null),
                    'score_type' => $a->grade_type ?? $a->score_type ?? 'CGPA',
                    'score_value' => (float) ($a->grade ?? $a->score_value ?? 0)
                ];
            }),
            'assessments' => $student->assessments->map(function ($a) {
                return [
                    'id' => $a->id,
                    'assessment_type' => $a->assessment_type,
                    'score' => (float) $a->score,
                    'max_score' => (float) $a->max_score,
                    'assessment_date' => $a->assessment_date ? $a->assessment_date->toIso8601String() : null
                ];
            })
        ]);
    }
}
