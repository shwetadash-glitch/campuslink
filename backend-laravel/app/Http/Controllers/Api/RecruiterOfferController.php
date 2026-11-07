<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\DriveCandidate;
use App\Models\PlacementDrive;
use App\Models\OfferVerificationHistory;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\CandidateDriveStatus;
use App\Services\Offers\OfferVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RecruiterOfferController extends Controller
{
    public function __construct(
        protected OfferVerificationService $verificationService
    ) {}

    /**
     * Issue an on-campus offer to a candidate within an authorized drive.
     * POST /api/v1/recruiters/drives/{driveId}/candidates/{candidateId}/offer
     */
    public function issueOffer(Request $request, $driveId, $candidateId)
    {
        $recruiter = $request->user()->recruiterProfile;
        if (! $recruiter || ! $recruiter->company) {
            return response()->json(['message' => 'Unauthorized. Recruiter profile required.'], 403);
        }

        // Verify drive belongs to recruiter's company
        $drive = PlacementDrive::where('id', $driveId)
            ->where('company_id', $recruiter->company_id)
            ->firstOrFail();

        // Verify candidate belongs to this drive
        $candidate = DriveCandidate::where('id', $candidateId)
            ->where(function ($q) use ($drive) {
                $q->where('drive_id', $drive->id);
            })
            ->firstOrFail();

        $validated = $request->validate([
            'ctc' => 'required|numeric|min:0.1|max:1000.0',
            'offer_date' => 'required|date',
            'joining_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
            'document' => 'nullable|file|max:10240',
            'document_type' => 'nullable|string|max:100',
        ]);

        $user = $request->user();

        $offer = DB::transaction(function () use ($validated, $drive, $candidate, $recruiter, $user, $request) {
            $offer = Offer::create([
                'student_id' => $candidate->student_id,
                'recruiter_id' => $recruiter->id,
                'job_id' => $drive->job_id,
                'placement_drive_id' => $drive->id,
                'drive_candidate_id' => $candidate->id,
                'status' => OfferStatus::PENDING->value,
                'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value, // Always PENDING_VERIFICATION!
                'is_off_campus' => false,
                'company_name' => $recruiter->company->name,
                'designation' => $drive->job?->title ?? 'Campus Hire',
                'ctc' => $validated['ctc'],
                'offer_date' => $validated['offer_date'],
                'joining_date' => $validated['joining_date'] ?? null,
            ]);

            // Transition candidate drive status to OFFERED
            $candidate->transitionTo(
                CandidateDriveStatus::OFFERED->value,
                $user->id,
                $validated['notes'] ?? "Offer issued by {$recruiter->company->name}."
            );

            OfferVerificationHistory::create([
                'offer_id' => $offer->id,
                'actor_id' => $user->id,
                'actor_user_id' => $user->id,
                'actor_name' => $user->name ?? explode('@', $user->email)[0],
                'actor_email' => $user->email,
                'action' => 'RECRUITER_ISSUED',
                'previous_status' => null,
                'new_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                'notes' => $validated['notes'] ?? "Offer issued by recruiter ({$recruiter->company->name}).",
                'metadata' => [
                    'source' => 'RECRUITER_DRIVE_PORTAL',
                    'recruiter_id' => $recruiter->id,
                    'placement_drive_id' => $drive->id,
                    'drive_candidate_id' => $candidate->id,
                ],
            ]);

            if ($request->hasFile('document')) {
                $docType = $validated['document_type'] ?? 'OFFER_LETTER';
                $this->verificationService->storeDocument($offer, $request->file('document'), $docType, $user);
            }

            return $offer;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Offer issued successfully in PENDING_VERIFICATION status.',
            'offer' => $offer->fresh(['student', 'job.company', 'placementDrive', 'documents']),
        ], 201);
    }

    /**
     * Authenticated download of an offer document for recruiter's company offers.
     * GET /api/v1/recruiters/offers/{offerId}/documents/{documentId}/download
     */
    public function downloadDocument(Request $request, $offerId, $documentId)
    {
        $recruiter = $request->user()->recruiterProfile;
        if (! $recruiter) {
            abort(403, 'Unauthorized.');
        }

        $offer = Offer::where('id', $offerId)
            ->where(function ($q) use ($recruiter) {
                $q->where('recruiter_id', $recruiter->id)
                    ->orWhereHas('job', fn ($jq) => $jq->where('company_id', $recruiter->company_id));
            })
            ->firstOrFail();

        return $this->verificationService->downloadDocument($offer, (int) $documentId, $request->user());
    }
}
