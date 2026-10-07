const fs = require("fs");
const path = "C:\\Users\\dashs\\campuselink\\backend-laravel\\app\\Http\\Controllers\\Api\\RecruiterController.php";
let lines = fs.readFileSync(path, "utf8").split("\n");

// 1. Fix me()
const meIdx = lines.findIndex(l => l.includes("public function me("));
lines.splice(meIdx + 1, 2, ...`
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
`.split("\n").filter(Boolean));

// 2. Fix updateCompany()
const updateIdx = lines.findIndex(l => l.includes("public function updateCompany("));
lines.splice(updateIdx + 1, 1, ...`
        $recruiter = $request->user()->recruiterProfile;
        $company = $recruiter ? $recruiter->company : null;
`.split("\n").filter(Boolean));

const companyUpdateIdx = lines.findIndex(l => l.includes("$company->update($validated);"));
lines.splice(companyUpdateIdx, 2, ...`
        if (!$recruiter || !$company) {
            return response()->json($validated);
        }
        $company->update($validated);
        return response()->json($company);
`.split("\n").filter(Boolean));

// 3. Fix dashboard()
const dashIdx = lines.findIndex(l => l.includes("public function dashboard("));
lines.splice(dashIdx + 1, 15, ...`
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
`.split("\n").filter(Boolean));

fs.writeFileSync(path, lines.join("\n"));
