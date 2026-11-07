<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\DriveSchedule;
use App\Models\Offer;
use App\Models\AuditLog;
use App\Enums\CandidateDriveStatus;
use App\Enums\OfferStatus;
use App\Services\EligibilityService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class StudentPlacementJourneyController extends Controller
{
    protected EligibilityService $eligibilityService;
    protected NotificationService $notificationService;

    public function __construct(
        EligibilityService $eligibilityService,
        NotificationService $notificationService
    ) {
        $this->eligibilityService = $eligibilityService;
        $this->notificationService = $notificationService;
    }

    private function getStudent(Request $request): Student
    {
        $student = $request->user()->studentProfile;
        if (!$student) {
            abort(403, 'Authenticated user does not have an associated student profile.');
        }
        return $student;
    }

    /**
     * Unified Student Placement Dashboard.
     */
    public function dashboard(Request $request)
    {
        $student = $this->getStudent($request);

        // 1. Applications & Drives
        $candidates = DriveCandidate::with(['drive.company', 'drive.job', 'drive.rounds', 'statusHistories'])
            ->where('student_id', $student->id)
            ->get();

        // 2. Offers
        $offers = Offer::with(['job.company', 'placementDrive'])
            ->where('student_id', $student->id)
            ->get();

        // 3. Upcoming Scheduled Interviews
        $upcomingSchedules = DriveSchedule::with(['drive.company'])
            ->where('student_id', $student->id)
            ->where('start_time', '>=', Carbon::now()->subHours(2))
            ->orderBy('start_time', 'asc')
            ->get();

        // 4. Genuine Placement Aggregations
        $registeredDrivesCount = $candidates->count();
        $activeInterviewsCount = $candidates->whereIn('status', [
            CandidateDriveStatus::SHORTLISTED->value,
            CandidateDriveStatus::INTERVIEWING->value,
        ])->count();
        $pendingOffersCount = $offers->where('status', OfferStatus::PENDING)->count();
        $acceptedOffersCount = $offers->whereIn('status', [
            OfferStatus::ACCEPTED,
            OfferStatus::JOINED,
        ])->count();

        $overallStatus = 'NOT_REGISTERED';
        if ($acceptedOffersCount > 0) {
            $overallStatus = 'PLACED';
        } elseif ($pendingOffersCount > 0) {
            $overallStatus = 'OFFER_RECEIVED';
        } elseif ($activeInterviewsCount > 0) {
            $overallStatus = 'INTERVIEWING';
        } elseif ($registeredDrivesCount > 0) {
            $overallStatus = 'REGISTERED';
        }

        // 5. Action Items & Reminders
        $actionItems = [];
        foreach ($offers->where('status', OfferStatus::PENDING) as $pendingOffer) {
            $actionItems[] = [
                'type' => 'PENDING_OFFER_DECISION',
                'priority' => 'HIGH',
                'title' => "Respond to Offer: {$pendingOffer->job?->company?->name}",
                'description' => "Offer for {$pendingOffer->job?->title} with {$pendingOffer->ctc} LPA requires your response.",
                'offer_id' => $pendingOffer->id,
                'offer_date' => $pendingOffer->offer_date->toIso8601String(),
            ];
        }

        foreach ($upcomingSchedules->take(3) as $sched) {
            $actionItems[] = [
                'type' => 'UPCOMING_INTERVIEW',
                'priority' => 'MEDIUM',
                'title' => "Scheduled Interview: {$sched->drive?->company?->name}",
                'description' => "Slot scheduled on {$sched->start_time->format('M d, H:i')} - {$sched->end_time->format('H:i')} at {$sched->venue}.",
                'start_time' => $sched->start_time->toIso8601String(),
                'venue' => $sched->venue,
            ];
        }

        // 6. Placement History
        $placementHistory = $candidates->map(function ($c) {
            return [
                'candidate_id' => $c->id,
                'drive_id' => $c->drive_id,
                'drive_name' => $c->drive?->name,
                'company_name' => $c->drive?->company?->name,
                'job_title' => $c->drive?->job?->title,
                'current_status' => $c->status,
                'current_round_number' => $c->current_round_number,
                'round_results' => $c->round_results,
                'registered_at' => $c->registered_at?->toIso8601String(),
                'status_history' => $c->statusHistories->map(fn($h) => [
                    'from' => $h->from_status,
                    'to' => $h->to_status,
                    'reason' => $h->reason,
                    'timestamp' => $h->timestamp->toIso8601String(),
                ]),
            ];
        });

        return response()->json([
            'status' => 'success',
            'student' => [
                'id' => $student->id,
                'student_identifier' => $student->student_identifier,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'branch' => $student->branch,
                'cgpa' => (float) $student->cgpa,
                'backlogs_current' => $student->backlogs_current,
                'graduation_year' => $student->graduation_year,
            ],
            'placement_summary' => [
                'overall_status' => $overallStatus,
                'registered_drives_count' => $registeredDrivesCount,
                'active_interviews_count' => $activeInterviewsCount,
                'pending_offers_count' => $pendingOffersCount,
                'accepted_offers_count' => $acceptedOffersCount,
            ],
            'action_items' => $actionItems,
            'upcoming_schedules' => $upcomingSchedules,
            'active_applications' => $placementHistory,
            'offers' => $offers,
        ]);
    }

    /**
     * Available Drives for this Student with Eligibility Evaluation.
     */
    public function availableDrives(Request $request)
    {
        $student = $this->getStudent($request);

        $drives = PlacementDrive::with(['company', 'job.requirements', 'venue'])
            ->whereIn('status', ['PUBLISHED', 'REGISTRATION_OPEN', 'IN_PROGRESS'])
            ->orderBy('start_date', 'asc')
            ->get();

        $existingRegistrations = DriveCandidate::where('student_id', $student->id)
            ->get()
            ->keyBy('drive_id');

        $results = $drives->map(function ($drive) use ($student, $existingRegistrations) {
            $candidateRecord = $existingRegistrations->get($drive->id);
            $isRegistered = $candidateRecord !== null;

            // Check eligibility against drive's job criteria
            $eligibilityResult = ['is_eligible' => true, 'failed_criteria' => []];
            if ($drive->job) {
                $eligibilityResult = $this->eligibilityService->checkHardEligibility($student, $drive->job);
            }

            $isEligible = (bool) ($eligibilityResult['is_eligible'] ?? true);
            $deadline = $drive->registration_deadline ?? $drive->start_date;
            $isPastDeadline = $deadline ? Carbon::now()->isAfter($deadline) : false;

            return [
                'drive_id' => $drive->id,
                'drive_name' => $drive->name,
                'company_name' => $drive->company ? $drive->company->name : 'N/A',
                'company_id' => $drive->company_id,
                'job_id' => $drive->job_id,
                'job_title' => $drive->job ? $drive->job->title : 'N/A',
                'start_date' => $drive->start_date?->toIso8601String(),
                'end_date' => $drive->end_date?->toIso8601String(),
                'venue' => $drive->venue ? $drive->venue->name : ($drive->metadata_json['venue'] ?? null),
                'drive_type' => $drive->drive_type ?? 'ON_CAMPUS',
                'drive_status' => $drive->status,
                'registration_deadline' => $drive->registration_deadline?->toIso8601String(),
                'is_eligible' => $isEligible,
                'eligibility_reasons' => $eligibilityResult['failed_criteria'] ?? $eligibilityResult['reasons'] ?? [],
                'is_registered' => $isRegistered,
                'candidate_status' => $candidateRecord ? $candidateRecord->status : null,
                'candidate_id' => $candidateRecord ? $candidateRecord->id : null,
                'can_register' => $isEligible && !$isRegistered && !$isPastDeadline,
            ];
        });

        return response()->json([
            'status' => 'success',
            'drives' => $results,
        ]);
    }

    /**
     * Register for a Placement Drive.
     */
    public function registerForDrive(Request $request, $driveId)
    {
        $student = $this->getStudent($request);

        try {
            return DB::transaction(function () use ($student, $driveId, $request) {
                // Re-fetch drive with lock inside transaction
                $drive = PlacementDrive::with('job')->lockForUpdate()->findOrFail($driveId);

                // 1. Revalidate registration deadline inside transaction
                $deadline = $drive->registration_deadline ?? $drive->start_date;
                if ($deadline && Carbon::now()->isAfter($deadline)) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'REGISTRATION_DEADLINE_EXPIRED',
                        'message' => 'Registration deadline for this drive has expired.',
                    ], 422);
                }

                // 2. Lock & check existing candidate registration
                $existing = DriveCandidate::where('drive_id', $drive->id)
                    ->where('student_id', $student->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'ALREADY_REGISTERED',
                        'message' => 'You are already registered for this placement drive.',
                        'candidate' => $existing,
                    ], 409);
                }

                // 3. Revalidate student eligibility inside transaction
                $currentStudent = $student->fresh() ?? $student;
                $isEligible = true;
                $eligibilityReasons = [];
                if ($drive->job) {
                    $eval = $this->eligibilityService->checkHardEligibility($currentStudent, $drive->job);
                    $isEligible = (bool) $eval['is_eligible'];
                    $eligibilityReasons = $eval['failed_criteria'] ?? $eval['reasons'] ?? [];
                }

                if (!$isEligible) {
                    return response()->json([
                        'status' => 'error',
                        'code' => 'INELIGIBLE_FOR_DRIVE',
                        'message' => 'Student does not satisfy eligibility criteria for this drive.',
                        'reasons' => $eligibilityReasons,
                    ], 422);
                }

                // 4. Create registered candidate record
                $candidate = DriveCandidate::create([
                    'drive_id' => $drive->id,
                    'student_id' => $currentStudent->id,
                    'status' => CandidateDriveStatus::REGISTERED->value,
                    'registered_at' => Carbon::now(),
                    'eligibility_details' => [
                        'criteria_passed' => true,
                        'reasons' => $eligibilityReasons,
                    ],
                ]);

                // 5. Auditable status history
                $candidate->statusHistories()->create([
                    'student_id' => $currentStudent->id,
                    'drive_id' => $drive->id,
                    'from_status' => null,
                    'to_status' => CandidateDriveStatus::REGISTERED->value,
                    'changed_by_user_id' => $request->user()->id,
                    'reason' => 'Student self-registered for placement drive.',
                    'timestamp' => Carbon::now(),
                ]);

                // 6. Dispatch registration confirmation notification
                $this->notificationService->notifyRegistrationConfirmation($currentStudent, $drive, $candidate);

                return response()->json([
                    'status' => 'success',
                    'message' => "Successfully registered for {$drive->name}.",
                    'candidate' => $candidate,
                ], 201);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle race condition hitting database unique constraint on (drive_id, student_id)
            $msg = $e->getMessage();
            if (str_contains($msg, '23505') || str_contains($msg, 'UNIQUE') || str_contains($msg, 'unique') || str_contains($msg, 'drive_candidates_drive_id_student_id_unique')) {
                $existing = DriveCandidate::where('drive_id', $driveId)
                    ->where('student_id', $student->id)
                    ->first();

                return response()->json([
                    'status' => 'error',
                    'code' => 'ALREADY_REGISTERED',
                    'message' => 'You are already registered for this placement drive.',
                    'candidate' => $existing,
                ], 409);
            }
            throw $e;
        }
    }

    /**
     * Withdraw from a Placement Drive.
     */
    public function withdrawFromDrive(Request $request, $driveId)
    {
        $student = $this->getStudent($request);
        $candidate = DriveCandidate::where('drive_id', $driveId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $candidate->transitionTo(
                CandidateDriveStatus::WITHDRAWN->value,
                $request->user()->id,
                $validated['reason'] ?? 'Candidate voluntarily withdrew from drive.'
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'WITHDRAWAL_FAILED',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Successfully withdrawn from placement drive.',
            'candidate' => $candidate->fresh(),
        ]);
    }

    /**
     * Student Offers List.
     */
    public function offers(Request $request)
    {
        $student = $this->getStudent($request);
        $offers = Offer::with(['job.company', 'placementDrive', 'documents'])
            ->where('student_id', $student->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'offers' => $offers,
        ]);
    }

    /**
     * View a single offer (strictly scoped to owner).
     */
    public function showOffer(Request $request, $offerId)
    {
        $student = $this->getStudent($request);
        $offer = Offer::with(['job.company', 'placementDrive', 'documents'])
            ->where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'offer' => $offer,
        ]);
    }

    /**
     * Securely access offer letter document URL.
     */
    public function downloadOfferLetter(Request $request, $offerId)
    {
        $student = $this->getStudent($request);
        $offer = Offer::where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        if (empty($offer->offer_letter_url)) {
            return response()->json([
                'status' => 'error',
                'code' => 'DOCUMENT_NOT_FOUND',
                'message' => 'No official offer letter document is associated with this offer.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'offer_letter_url' => $offer->offer_letter_url,
        ]);
    }

    /**
     * Accept Offer.
     */
    public function acceptOffer(Request $request, $offerId)
    {
        $student = $this->getStudent($request);
        $offer = Offer::with(['job.company', 'placementDrive'])
            ->where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $offer->accept($request->user(), $validated['notes'] ?? null);
            $this->notificationService->notifyOfferResponse($offer, 'ACCEPTED');
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_OFFER_ACTION',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Offer from {$offer->job?->company?->name} accepted successfully.",
            'offer' => $offer->fresh(['job.company', 'placementDrive', 'driveCandidate']),
        ]);
    }

    /**
     * Reject Offer.
     */
    public function rejectOffer(Request $request, $offerId)
    {
        $student = $this->getStudent($request);
        $offer = Offer::with(['job.company', 'placementDrive'])
            ->where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:5|max:500',
        ]);

        try {
            $offer->reject($request->user(), $validated['rejection_reason']);
            $this->notificationService->notifyOfferResponse($offer, 'DECLINED');
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_OFFER_ACTION',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Offer declined.",
            'offer' => $offer->fresh(['job.company', 'placementDrive', 'driveCandidate']),
        ]);
    }

    /**
     * Confirm Joining.
     */
    public function confirmJoining(Request $request, $offerId)
    {
        $student = $this->getStudent($request);
        $offer = Offer::with(['job.company', 'placementDrive'])
            ->where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'joining_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $offer->confirmJoining($request->user(), $validated['joining_date'] ?? null, $validated['notes'] ?? null);
        } catch (\App\Exceptions\OfferVerificationException $e) {
            return response()->json([
                'status' => 'error',
                'code' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_OFFER_ACTION',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Joining confirmed.",
            'offer' => $offer->fresh(['job.company', 'placementDrive', 'driveCandidate']),
        ]);
    }
}
