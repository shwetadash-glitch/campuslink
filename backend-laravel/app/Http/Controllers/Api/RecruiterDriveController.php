<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RecruiterDriveController extends Controller {
    public function index(Request $request) {
        $recruiter = $request->user()->recruiterProfile;
        if ($recruiter) {
            return $recruiter->company->drives;
        }
        return \App\Models\PlacementDrive::all();
    }
    
    public function store(Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|min:3|max:150',
            'description' => 'nullable|string|max:2000',
            'job_id' => 'required|integer|exists:jobs,id',
            'date' => 'required|date',
            'registration_start' => 'nullable|date',
            'registration_deadline' => 'nullable|date',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'mode' => 'nullable|string|max:50',
            'venue' => 'nullable|string|max:200',
            'capacity' => 'nullable|integer|min:1',
            'coordinator_info' => 'nullable|string|max:200',
            'notes' => 'nullable|string|max:1000'
        ]);
        
        $job = $request->user()->recruiterProfile->company->jobs()->find($validated['job_id']);
        if (!$job) {
            return response()->json(['detail' => 'Invalid job ID: Job does not exist or does not belong to your company'], 400);
        }

        $startDate = Carbon::parse($validated['date'] . ' ' . $validated['start_time']);
        $endDate = Carbon::parse($validated['date'] . ' ' . $validated['end_time']);

        $drive = $request->user()->recruiterProfile->company->drives()->create([
            'name' => $validated['name'],
            'job_id' => $validated['job_id'],
            'status' => 'DRAFT',
            'drive_type' => $validated['mode'] ?? 'OFFLINE',
            'capacity' => $validated['capacity'] ?? null,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'registration_deadline' => $validated['registration_deadline'] ?? null,
            'metadata_json' => [
                'description' => $validated['description'] ?? null,
                'venue' => $validated['venue'] ?? null,
                'coordinator_info' => $validated['coordinator_info'] ?? null,
                'notes' => $validated['notes'] ?? null
            ]
        ]);
        
        return response()->json($drive, 201);
    }
    
    public function update(Request $request, $id) {
        $drive = $request->user()->recruiterProfile->company->drives()->findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|min:3|max:150',
            'description' => 'nullable|string|max:2000',
            'job_id' => 'sometimes|integer|exists:jobs,id',
            'date' => 'sometimes|date',
            'registration_start' => 'nullable|date',
            'registration_deadline' => 'nullable|date',
            'start_time' => 'sometimes|string',
            'end_time' => 'sometimes|string',
            'mode' => 'nullable|string|max:50',
            'venue' => 'nullable|string|max:200',
            'capacity' => 'nullable|integer|min:1',
            'coordinator_info' => 'nullable|string|max:200',
            'notes' => 'nullable|string|max:1000',
            'status' => 'sometimes|string'
        ]);
        
        if (isset($validated['job_id'])) {
            $job = $request->user()->recruiterProfile->company->jobs()->find($validated['job_id']);
            if (!$job) {
                return response()->json(['detail' => 'Invalid job ID: Job does not exist or does not belong to your company'], 400);
            }
        }
        
        if (isset($validated['status']) && $validated['status'] !== $drive->status) {
            if (in_array($drive->status->value ?? $drive->status, ['COMPLETED', 'CANCELLED']) && in_array($validated['status'], ['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN'])) {
                return response()->json(['detail' => 'Cannot reopen a completed or cancelled drive.'], 400);
            }
        }

        $updateData = [];
        if (isset($validated['name'])) $updateData['name'] = $validated['name'];
        if (isset($validated['job_id'])) $updateData['job_id'] = $validated['job_id'];
        if (isset($validated['mode'])) $updateData['drive_type'] = $validated['mode'];
        if (isset($validated['capacity'])) $updateData['capacity'] = $validated['capacity'];
        if (isset($validated['status'])) $updateData['status'] = $validated['status'];
        if (isset($validated['registration_deadline'])) $updateData['registration_deadline'] = $validated['registration_deadline'];
        
        // Handle dates
        $currentDate = $validated['date'] ?? ($drive->start_date ? $drive->start_date->format('Y-m-d') : Carbon::now()->format('Y-m-d'));
        $currentStartTime = $validated['start_time'] ?? ($drive->start_date ? $drive->start_date->format('H:i') : '09:00');
        $currentEndTime = $validated['end_time'] ?? ($drive->end_date ? $drive->end_date->format('H:i') : '17:00');
        
        if (isset($validated['date']) || isset($validated['start_time']) || isset($validated['end_time'])) {
            $updateData['start_date'] = Carbon::parse($currentDate . ' ' . $currentStartTime);
            $updateData['end_date'] = Carbon::parse($currentDate . ' ' . $currentEndTime);
        }

        $meta = $drive->metadata_json ?? [];
        if (isset($validated['description'])) $meta['description'] = $validated['description'];
        if (isset($validated['venue'])) $meta['venue'] = $validated['venue'];
        if (isset($validated['coordinator_info'])) $meta['coordinator_info'] = $validated['coordinator_info'];
        if (isset($validated['notes'])) $meta['notes'] = $validated['notes'];
        $updateData['metadata_json'] = $meta;

        $drive->update($updateData);
        return response()->json($drive);
    }
    
    public function destroy(Request $request, $id) {
        $drive = $request->user()->recruiterProfile->company->drives()->findOrFail($id);
        $drive->delete();
        return response()->json(null, 204);
    }
}
