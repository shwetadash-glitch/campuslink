<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveSchedule;
use App\Models\DriveCandidate;
use App\Models\DriveCandidateStatusHistory;
use App\Models\InstitutionalEvent;
use App\Models\Venue;
use App\Models\AuditLog;
use App\Models\EmergencyClearance;
use App\Exceptions\ClearanceValidationException;
use App\Services\ConflictDetectionService;
use App\Services\EligibilityService;
use App\Services\SchedulingLockManager;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlacementDriveManagerController extends Controller
{
    protected ConflictDetectionService $conflictService;
    protected EligibilityService $eligibilityService;
    protected SchedulingLockManager $lockManager;

    public function __construct(
        ConflictDetectionService $conflictService,
        EligibilityService $eligibilityService,
        SchedulingLockManager $lockManager
    ) {
        $this->conflictService = $conflictService;
        $this->eligibilityService = $eligibilityService;
        $this->lockManager = $lockManager;
    }

    /**
     * List all placement drives with filter support.
     */
    public function index(Request $request)
    {
        $query = PlacementDrive::with(['company', 'job', 'rounds', 'venue']);

        if ($request->has('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        if ($request->has('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        $drives = $query->orderBy('start_date', 'asc')->get();

        $result = $drives->map(function ($d) {
            return [
                'id' => $d->id,
                'name' => $d->name,
                'company_id' => $d->company_id,
                'company_name' => $d->company ? $d->company->name : 'N/A',
                'job_id' => $d->job_id,
                'job_title' => $d->job ? $d->job->title : 'N/A',
                'drive_type' => $d->drive_type ?? 'ON_CAMPUS',
                'status' => is_object($d->status) ? $d->status->value : $d->status,
                'start_date' => $d->start_date ? $d->start_date->toIso8601String() : null,
                'end_date' => $d->end_date ? $d->end_date->toIso8601String() : null,
                'date' => $d->start_date ? $d->start_date->format('M d, Y') : 'TBD',
                'venue' => $d->venue ? $d->venue->name : ($d->metadata_json['venue'] ?? null),
                'capacity' => $d->capacity,
                'lock_version' => $d->lock_version,
                'candidates_count' => $d->candidates()->count(),
                'rounds_count' => $d->rounds()->count(),
            ];
        });

        return response()->json($result);
    }

    /**
     * Show a single placement drive with full detail.
     */
    public function show($id)
    {
        $drive = PlacementDrive::with(['company', 'job.requirements.skill', 'rounds.venueModel', 'venue', 'candidates.student'])->findOrFail($id);

        return response()->json([
            'id' => $drive->id,
            'name' => $drive->name,
            'company' => $drive->company,
            'job' => $drive->job,
            'drive_type' => $drive->drive_type,
            'status' => is_object($drive->status) ? $drive->status->value : $drive->status,
            'start_date' => $drive->start_date ? $drive->start_date->toIso8601String() : null,
            'end_date' => $drive->end_date ? $drive->end_date->toIso8601String() : null,
            'venue' => $drive->venue ? $drive->venue->name : ($drive->metadata_json['venue'] ?? null),
            'capacity' => $drive->capacity,
            'lock_version' => $drive->lock_version,
            'rounds' => $drive->rounds,
            'candidates_count' => $drive->candidates->count(),
            'metadata_json' => $drive->metadata_json,
        ]);
    }

    /**
     * Create a placement drive with conflict detection, hard blackout enforcement, and emergency overrides.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_id' => 'required|exists:companies,id',
            'job_id' => 'required|exists:jobs,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'drive_type' => 'nullable|string|in:ON_CAMPUS,VIRTUAL,HYBRID',
            'venue' => 'nullable|string|max:255',
            'venue_id' => 'nullable|exists:venues,id',
            'capacity' => 'nullable|integer|min:1',
            'branches' => 'nullable|array',
            'force' => 'nullable|boolean',
            'override_justification' => 'required_if:force,true|nullable|string|min:10',
            'emergency_clearance_code' => 'nullable|string',
        ]);

        $force = (bool) ($validated['force'] ?? false);
        $overrideJustification = $validated['override_justification'] ?? null;
        $emergencyCode = $validated['emergency_clearance_code'] ?? null;

        return DB::transaction(function () use ($validated, $force, $overrideJustification, $emergencyCode, $request) {
            // 1. Pessimistic Locking: Lock stable venue resource row to prevent concurrent race conditions
            $venueRef = $validated['venue_id'] ?? $validated['venue'] ?? null;
            if ($venueRef) {
                $this->lockManager->lockVenue($venueRef);
            }

            // 2. Perform Conflict Detection INSIDE the protected transaction
            $conflictReport = $this->conflictService->detectConflicts([
                'start_time' => $validated['start_date'],
                'end_time' => $validated['end_date'],
                'venue' => $validated['venue'] ?? null,
                'venue_id' => $validated['venue_id'] ?? null,
                'branches' => $validated['branches'] ?? ['ALL'],
            ]);

            $clearanceRecord = null;

            if ($conflictReport['has_conflict']) {
                if (!$force) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'SCHEDULE_CONFLICT',
                        'message' => 'Scheduling collision detected with existing institutional events or venues.',
                        'conflict_count' => $conflictReport['conflict_count'],
                        'conflicts' => $conflictReport['conflicts'],
                        'alternative_slots' => $conflictReport['alternative_slots'],
                    ], 409);
                }

                // Strict Rule: Ordinary administrative force=true CANNOT bypass hard blackouts
                if ($conflictReport['has_hard_blackout']) {
                    if (empty($emergencyCode)) {
                        return response()->json([
                            'status' => 'error',
                            'code' => 'HARD_BLACKOUT_VIOLATION',
                            'message' => 'Hard institutional blackouts (e.g. university examinations) cannot be overridden by standard administrative force flags. Institutional emergency authorization is required.',
                            'conflicts' => array_values(array_filter($conflictReport['conflicts'], fn($c) => $c['is_hard_blackout'])),
                            'alternative_slots' => $conflictReport['alternative_slots'],
                        ], 403);
                    }

                    $hardConflict = collect($conflictReport['conflicts'])->firstWhere('is_hard_blackout', true);
                    $eventId = $hardConflict['entity_id'] ?? null;

                    try {
                        $clearanceRecord = EmergencyClearance::validateAndConsume(
                            $emergencyCode,
                            (int) $eventId,
                            null,
                            $validated['name'],
                            $request->user()
                        );
                    } catch (ClearanceValidationException $e) {
                        return response()->json([
                            'status' => 'error',
                            'code' => $e->getErrorCode(),
                            'message' => $e->getMessage(),
                        ], 403);
                    }
                }
            }

            $drive = PlacementDrive::create([
                'name' => $validated['name'],
                'company_id' => $validated['company_id'],
                'job_id' => $validated['job_id'],
                'start_date' => Carbon::parse($validated['start_date']),
                'end_date' => Carbon::parse($validated['end_date']),
                'drive_type' => $validated['drive_type'] ?? 'ON_CAMPUS',
                'venue_id' => $validated['venue_id'] ?? null,
                'capacity' => $validated['capacity'] ?? null,
                'status' => 'PUBLISHED',
                'lock_version' => 1,
                'metadata_json' => [
                    'venue' => $validated['venue'] ?? null,
                    'branches' => $validated['branches'] ?? ['ALL'],
                ],
            ]);

            if ($clearanceRecord) {
                $clearanceRecord->update(['consumed_drive_id' => $drive->id]);
            }

            // Mandatory Audit Logging on Overrides (Clearance code is REDACTED)
            if ($conflictReport['has_conflict']) {
                $isEmergency = !empty($clearanceRecord);
                AuditLog::create([
                    'user_id' => $request->user() ? $request->user()->id : null,
                    'entity_type' => 'PlacementDrive',
                    'entity_id' => $drive->id,
                    'action' => $isEmergency ? 'EMERGENCY_HARD_BLACKOUT_OVERRIDE' : 'SCHEDULE_CONFLICT_OVERRIDE',
                    'old_values' => ['conflicts' => $conflictReport['conflicts']],
                    'new_values' => [
                        'drive_id' => $drive->id,
                        'override_justification' => $overrideJustification,
                        'is_emergency_clearance' => $isEmergency,
                        'forced_by_user' => $request->user() ? $request->user()->email : 'System',
                        'requesting_user_id' => $request->user() ? $request->user()->id : null,
                        'approving_authority' => $clearanceRecord ? $clearanceRecord->approving_authority_name : null,
                        'approving_role' => $clearanceRecord ? $clearanceRecord->approving_authority_role : null,
                        'approved_by_user_id' => $clearanceRecord ? $clearanceRecord->approved_by_user_id : null,
                        'clearance_reason' => $clearanceRecord ? $clearanceRecord->reason : null,
                        'institutional_event_id' => $clearanceRecord ? $clearanceRecord->institutional_event_id : null,
                        'clearance_id' => $clearanceRecord ? $clearanceRecord->id : null,
                        'token_redacted' => true,
                        'scheduled_slot' => [
                            'start' => $drive->start_date->toIso8601String(),
                            'end' => $drive->end_date->toIso8601String(),
                        ],
                    ],
                    'timestamp' => now(),
                ]);
            }

            return response()->json([
                'status' => 'success',
                'drive' => $drive,
                'overridden' => $conflictReport['has_conflict'],
            ], 201);
        });
    }

    /**
     * Update drive attributes with Optimistic Concurrency Control (OCC).
     */
    public function update(Request $request, $id)
    {
        $drive = PlacementDrive::findOrFail($id);

        $validated = $request->validate([
            'lock_version' => 'required|integer',
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'venue' => 'sometimes|nullable|string',
            'capacity' => 'sometimes|nullable|integer|min:1',
            'drive_type' => 'sometimes|string|in:ON_CAMPUS,VIRTUAL,HYBRID',
            'delivery_mode_confirmed' => 'sometimes|boolean',
        ]);

        // Explicit authorization required for delivery mode change
        if (isset($validated['drive_type']) && $validated['drive_type'] !== $drive->drive_type) {
            if (empty($validated['delivery_mode_confirmed'])) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'DELIVERY_MODE_CONFIRMATION_REQUIRED',
                    'message' => "Changing drive delivery mode from {$drive->drive_type} to {$validated['drive_type']} requires explicit authorized confirmation (delivery_mode_confirmed: true).",
                ], 422);
            }
        }

        $expectedVersion = (int) $validated['lock_version'];
        unset($validated['lock_version'], $validated['delivery_mode_confirmed']);

        try {
            $drive->updateWithOptimisticLock($validated, $expectedVersion);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'CONCURRENT_MODIFICATION_DETECTED',
                'message' => $e->getMessage(),
                'current_lock_version' => $drive->fresh()->lock_version,
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'drive' => $drive,
        ]);
    }

    /**
     * Add a selection round to a placement drive with transaction locking.
     */
    public function addRound(Request $request, $id)
    {
        $drive = PlacementDrive::findOrFail($id);

        $validated = $request->validate([
            'round_number' => 'required|integer|min:1',
            'name' => 'required|string|max:255',
            'round_type' => 'required|string|in:ASSESSMENT,INTERVIEW,GD,CODING,HR',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'venue' => 'nullable|string|max:255',
            'venue_id' => 'nullable|exists:venues,id',
            'capacity' => 'nullable|integer',
            'instructions' => 'nullable|string',
            'force' => 'nullable|boolean',
            'override_justification' => 'required_if:force,true|nullable|string|min:10',
            'emergency_clearance_code' => 'nullable|string',
        ]);

        $force = (bool) ($validated['force'] ?? false);
        $overrideJustification = $validated['override_justification'] ?? null;
        $emergencyCode = $validated['emergency_clearance_code'] ?? null;

        return DB::transaction(function () use ($validated, $drive, $force, $overrideJustification, $emergencyCode, $request) {
            // 1. Lock drive and venue stable resource rows
            $this->lockManager->lockDrive($drive->id);
            $venueRef = $validated['venue_id'] ?? $validated['venue'] ?? null;
            if ($venueRef) {
                $this->lockManager->lockVenue($venueRef);
            }

            // 2. Conflict check inside transaction
            $conflictReport = $this->conflictService->detectConflicts([
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'venue' => $validated['venue'] ?? null,
                'venue_id' => $validated['venue_id'] ?? null,
                'drive_id' => $drive->id,
                'branches' => $drive->metadata_json['branches'] ?? ['ALL'],
            ]);

            $clearanceRecord = null;

            if ($conflictReport['has_conflict']) {
                if (!$force) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'SCHEDULE_CONFLICT',
                        'message' => 'Proposed round slot collides with existing events or venue bookings.',
                        'conflicts' => $conflictReport['conflicts'],
                        'alternative_slots' => $conflictReport['alternative_slots'],
                    ], 409);
                }

                if ($conflictReport['has_hard_blackout']) {
                    if (empty($emergencyCode)) {
                        return response()->json([
                            'status' => 'error',
                            'code' => 'HARD_BLACKOUT_VIOLATION',
                            'message' => 'Hard institutional blackouts cannot be overridden by standard administrative force flags. Institutional emergency authorization is required.',
                            'conflicts' => array_values(array_filter($conflictReport['conflicts'], fn($c) => $c['is_hard_blackout'])),
                            'alternative_slots' => $conflictReport['alternative_slots'],
                        ], 403);
                    }

                    $hardConflict = collect($conflictReport['conflicts'])->firstWhere('is_hard_blackout', true);
                    $eventId = $hardConflict['entity_id'] ?? null;

                    try {
                        $clearanceRecord = EmergencyClearance::validateAndConsume(
                            $emergencyCode,
                            (int) $eventId,
                            $drive->id,
                            $drive->name,
                            $request->user()
                        );
                    } catch (ClearanceValidationException $e) {
                        return response()->json([
                            'status' => 'error',
                            'code' => $e->getErrorCode(),
                            'message' => $e->getMessage(),
                        ], 403);
                    }
                }
            }

            $round = DriveRound::create([
                'drive_id' => $drive->id,
                'round_number' => $validated['round_number'],
                'name' => $validated['name'],
                'round_type' => $validated['round_type'],
                'start_time' => Carbon::parse($validated['start_time']),
                'end_time' => Carbon::parse($validated['end_time']),
                'venue' => $validated['venue'] ?? null,
                'venue_id' => $validated['venue_id'] ?? null,
                'capacity' => $validated['capacity'] ?? null,
                'instructions' => $validated['instructions'] ?? null,
                'status' => 'PENDING',
            ]);

            if ($conflictReport['has_conflict']) {
                $isEmergency = !empty($clearanceRecord);
                AuditLog::create([
                    'user_id' => $request->user() ? $request->user()->id : null,
                    'entity_type' => 'DriveRound',
                    'entity_id' => $round->id,
                    'action' => $isEmergency ? 'EMERGENCY_HARD_BLACKOUT_OVERRIDE' : 'ROUND_SCHEDULE_OVERRIDE',
                    'old_values' => ['conflicts' => $conflictReport['conflicts']],
                    'new_values' => [
                        'round_id' => $round->id,
                        'drive_id' => $drive->id,
                        'override_justification' => $overrideJustification,
                        'is_emergency_clearance' => $isEmergency,
                        'scheduled_by' => $request->user() ? $request->user()->email : 'System',
                        'requesting_user_id' => $request->user() ? $request->user()->id : null,
                        'approving_authority' => $clearanceRecord ? $clearanceRecord->approving_authority_name : null,
                        'approving_role' => $clearanceRecord ? $clearanceRecord->approving_authority_role : null,
                        'approved_by_user_id' => $clearanceRecord ? $clearanceRecord->approved_by_user_id : null,
                        'clearance_reason' => $clearanceRecord ? $clearanceRecord->reason : null,
                        'institutional_event_id' => $clearanceRecord ? $clearanceRecord->institutional_event_id : null,
                        'clearance_id' => $clearanceRecord ? $clearanceRecord->id : null,
                        'token_redacted' => true,
                    ],
                    'timestamp' => now(),
                ]);
            }

            return response()->json($round, 201);
        });
    }

    /**
     * Schedule an individual candidate interview slot with full conflict detection and resource locking.
     */
    public function scheduleInterviewSlot(Request $request, $id)
    {
        $drive = PlacementDrive::findOrFail($id);

        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'interviewer_ref' => 'nullable|string|max:255',
            'venue' => 'nullable|string|max:255',
            'venue_id' => 'nullable|exists:venues,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'force' => 'nullable|boolean',
            'override_justification' => 'required_if:force,true|nullable|string|min:10',
            'emergency_clearance_code' => 'nullable|string',
        ]);

        $force = (bool) ($validated['force'] ?? false);
        $overrideJustification = $validated['override_justification'] ?? null;
        $emergencyCode = $validated['emergency_clearance_code'] ?? null;

        return DB::transaction(function () use ($validated, $drive, $force, $overrideJustification, $emergencyCode, $request) {
            // 1. Lock all stable resource rows
            $this->lockManager->lockDrive($drive->id);
            $this->lockManager->lockStudent($validated['student_id']);
            $this->lockManager->lockInterviewer($validated['interviewer_ref'] ?? null);
            $venueRef = $validated['venue_id'] ?? $validated['venue'] ?? null;
            if ($venueRef) {
                $this->lockManager->lockVenue($venueRef);
            }

            // 2. Conflict check inside transaction
            $conflictReport = $this->conflictService->detectConflicts([
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'venue' => $validated['venue'] ?? null,
                'venue_id' => $validated['venue_id'] ?? null,
                'drive_id' => $drive->id,
                'student_ids' => [$validated['student_id']],
                'interviewer_ref' => $validated['interviewer_ref'] ?? null,
            ]);

            $clearanceRecord = null;

            if ($conflictReport['has_conflict']) {
                if (!$force) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'SCHEDULE_CONFLICT',
                        'message' => 'Interview slot collides with existing commitments or blackouts.',
                        'conflicts' => $conflictReport['conflicts'],
                        'alternative_slots' => $conflictReport['alternative_slots'],
                    ], 409);
                }

                if ($conflictReport['has_hard_blackout']) {
                    if (empty($emergencyCode)) {
                        return response()->json([
                            'status' => 'error',
                            'code' => 'HARD_BLACKOUT_VIOLATION',
                            'message' => 'Hard institutional blackouts cannot be overridden by standard administrative force flags.',
                            'conflicts' => array_values(array_filter($conflictReport['conflicts'], fn($c) => $c['is_hard_blackout'])),
                            'alternative_slots' => $conflictReport['alternative_slots'],
                        ], 403);
                    }

                    $hardConflict = collect($conflictReport['conflicts'])->firstWhere('is_hard_blackout', true);
                    $eventId = $hardConflict['entity_id'] ?? null;

                    try {
                        $clearanceRecord = EmergencyClearance::validateAndConsume(
                            $emergencyCode,
                            (int) $eventId,
                            $drive->id,
                            $drive->name,
                            $request->user()
                        );
                    } catch (ClearanceValidationException $e) {
                        return response()->json([
                            'status' => 'error',
                            'code' => $e->getErrorCode(),
                            'message' => $e->getMessage(),
                        ], 403);
                    }
                }
            }

            $schedule = DriveSchedule::create([
                'drive_id' => $drive->id,
                'student_id' => $validated['student_id'],
                'interviewer_ref' => $validated['interviewer_ref'] ?? null,
                'venue' => $validated['venue'] ?? null,
                'start_time' => Carbon::parse($validated['start_time']),
                'end_time' => Carbon::parse($validated['end_time']),
                'status' => 'SCHEDULED',
            ]);

            if ($conflictReport['has_conflict']) {
                $isEmergency = !empty($clearanceRecord);
                AuditLog::create([
                    'user_id' => $request->user() ? $request->user()->id : null,
                    'entity_type' => 'DriveSchedule',
                    'entity_id' => $schedule->id,
                    'action' => $isEmergency ? 'EMERGENCY_HARD_BLACKOUT_OVERRIDE' : 'INTERVIEW_SCHEDULE_OVERRIDE',
                    'old_values' => ['conflicts' => $conflictReport['conflicts']],
                    'new_values' => [
                        'schedule_id' => $schedule->id,
                        'drive_id' => $drive->id,
                        'student_id' => $validated['student_id'],
                        'interviewer_ref' => $validated['interviewer_ref'] ?? null,
                        'override_justification' => $overrideJustification,
                        'is_emergency_clearance' => $isEmergency,
                        'token_redacted' => true,
                    ],
                    'timestamp' => now(),
                ]);
            }

            return response()->json([
                'status' => 'success',
                'schedule' => $schedule,
                'overridden' => $conflictReport['has_conflict'],
            ], 201);
        });
    }

    /**
     * Issue an emergency clearance code by Super Admin / Executive Authority.
     */
    public function issueEmergencyClearance(Request $request)
    {
        $validated = $request->validate([
            'institutional_event_id' => 'required|exists:institutional_events,id',
            'placement_drive_id' => 'nullable|exists:placement_drives,id',
            'target_drive_name' => 'nullable|string|max:255',
            'reason' => 'required|string|min:10',
            'approving_authority_name' => 'required|string|max:255',
            'approving_authority_role' => 'required|string|max:255',
            'valid_minutes' => 'nullable|integer|min:1|max:1440',
        ]);

        $result = EmergencyClearance::issue([
            'institutional_event_id' => $validated['institutional_event_id'],
            'placement_drive_id' => $validated['placement_drive_id'] ?? null,
            'target_drive_name' => $validated['target_drive_name'] ?? null,
            'approved_by_user_id' => $request->user()->id,
            'approving_authority_name' => $validated['approving_authority_name'],
            'approving_authority_role' => $validated['approving_authority_role'],
            'reason' => $validated['reason'],
            'valid_minutes' => $validated['valid_minutes'] ?? 120,
        ]);

        return response()->json([
            'status' => 'success',
            'clearance_id' => $result['clearance']->id,
            'raw_clearance_code' => $result['raw_clearance_code'],
            'expires_at' => $result['clearance']->expires_at->toIso8601String(),
            'bound_event_id' => $result['clearance']->institutional_event_id,
            'bound_drive_id' => $result['clearance']->placement_drive_id,
            'target_drive_name' => $result['clearance']->target_drive_name,
        ], 201);
    }

    /**
     * Run ad-hoc conflict detection for date/time/venue planning.
     */
    public function detectConflictsAdHoc(Request $request)
    {
        $validated = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'venue' => 'nullable|string',
            'venue_id' => 'nullable|integer',
            'branches' => 'nullable|array',
            'drive_id' => 'nullable|integer',
            'student_ids' => 'nullable|array',
            'interviewer_ref' => 'nullable|string',
        ]);

        $report = $this->conflictService->detectConflicts($validated);

        return response()->json($report);
    }

    /**
     * Transition candidate to a new canonical status with immutable history recording.
     */
    public function transitionCandidate(Request $request, $driveId, $candidateId)
    {
        $candidate = DriveCandidate::where('id', $candidateId)->where('drive_id', $driveId)->firstOrFail();

        $validated = $request->validate([
            'new_status' => 'required|string',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $candidate->transitionTo(
                $validated['new_status'],
                $request->user() ? $request->user()->id : null,
                $validated['reason'] ?? 'Status updated via placement drive manager.'
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_STATUS_TRANSITION',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'candidate' => $candidate->load('statusHistories'),
        ]);
    }

    /**
     * Record round-level result without corrupting canonical global application status.
     */
    public function recordRoundResult(Request $request, $driveId, $roundNumber, $candidateId)
    {
        $candidate = DriveCandidate::where('id', $candidateId)->where('drive_id', $driveId)->firstOrFail();

        $validated = $request->validate([
            'round_number' => 'nullable|integer|min:1',
            'result' => 'required|string|in:PASSED,FAILED,PENDING,ABSENT',
            'score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $roundNum = (int) ($validated['round_number'] ?? $roundNumber);

        try {
            $candidate->recordRoundResult(
                $roundNum,
                $validated['result'],
                $validated['score'] ?? null,
                $request->user() ? $request->user()->id : null,
                $validated['notes'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_ROUND_RESULT',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'candidate' => $candidate->load('statusHistories'),
        ]);
    }

    /**
     * Get candidate status histories for a drive.
     */
    public function candidateHistories($driveId)
    {
        $histories = DriveCandidateStatusHistory::where('drive_id', $driveId)
            ->with(['student', 'changedByUser'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($histories);
    }

    /**
     * Calendar events feed for the Scheduler frontend (aggregates drives, rounds, institutional events).
     */
    public function schedulerEvents(Request $request)
    {
        $startDate = $request->query('start_date') ? Carbon::parse($request->query('start_date'))->startOfDay() : now()->subDays(30);
        $endDate = $request->query('end_date') ? Carbon::parse($request->query('end_date'))->endOfDay() : now()->addDays(60);

        $events = [];

        // 1. Institutional Events (Exams, holidays, symposiums)
        $instEvents = InstitutionalEvent::where('start_time', '<=', $endDate)
            ->where('end_time', '>=', $startDate)
            ->get();

        foreach ($instEvents as $ie) {
            $events[] = [
                'id' => 'inst-' . $ie->id,
                'name' => $ie->title,
                'type' => $ie->event_type,
                'date' => $ie->start_time->format('M d, Y'),
                'time' => $ie->start_time->format('h:i A') . ' - ' . $ie->end_time->format('h:i A'),
                'start_iso' => $ie->start_time->toIso8601String(),
                'end_iso' => $ie->end_time->toIso8601String(),
                'location' => 'Campus-Wide',
                'conflict' => false,
                'is_blackout' => $ie->is_hard_blackout,
                'description' => $ie->notes ?: "Institutional calendar event: {$ie->event_type}",
            ];
        }

        // 2. Drive Rounds
        $rounds = DriveRound::with('drive.company')
            ->whereNotNull('start_time')
            ->where('start_time', '<=', $endDate)
            ->where('end_time', '>=', $startDate)
            ->get();

        foreach ($rounds as $r) {
            $companyName = $r->drive && $r->drive->company ? $r->drive->company->name : 'Corporate';
            $conflictCheck = $this->conflictService->detectConflicts([
                'start_time' => $r->start_time,
                'end_time' => $r->end_time,
                'venue' => $r->venue,
                'drive_id' => $r->drive_id,
                'round_id' => $r->id,
            ]);

            $events[] = [
                'id' => 'round-' . $r->id,
                'name' => "{$companyName} - {$r->name}",
                'type' => $r->round_type,
                'date' => $r->start_time->format('M d, Y'),
                'time' => $r->start_time->format('h:i A') . ' - ' . $r->end_time->format('h:i A'),
                'start_iso' => $r->start_time->toIso8601String(),
                'end_iso' => $r->end_time->toIso8601String(),
                'location' => $r->venue ?: 'Virtual',
                'conflict' => $conflictCheck['has_conflict'],
                'conflict_details' => $conflictCheck['conflicts'],
                'description' => $r->instructions ?: "Round {$r->round_number} for {$companyName} drive.",
            ];
        }

        return response()->json($events);
    }

    /**
     * Venues management.
     */
    public function venues(Request $request)
    {
        if ($request->isMethod('post')) {
            $validated = $request->validate([
                'name' => 'required|string|unique:venues,name',
                'building' => 'nullable|string',
                'capacity' => 'nullable|integer',
                'is_virtual' => 'nullable|boolean',
            ]);
            $venue = Venue::create($validated);
            return response()->json($venue, 201);
        }

        return response()->json(Venue::where('is_active', true)->orderBy('name')->get());
    }

    /**
     * Institutional events management.
     */
    public function institutionalEvents(Request $request)
    {
        if ($request->isMethod('post')) {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'event_type' => 'required|string|in:EXAMINATION,SYMPOSIUM,HOLIDAY,INSTITUTIONAL_BLACKOUT',
                'start_time' => 'required|date',
                'end_time' => 'required|date|after:start_time',
                'affects_branches' => 'nullable|array',
                'is_hard_blackout' => 'nullable|boolean',
                'notes' => 'nullable|string',
            ]);
            $event = InstitutionalEvent::create($validated);
            return response()->json($event, 201);
        }

        return response()->json(InstitutionalEvent::orderBy('start_time', 'asc')->get());
    }
}
