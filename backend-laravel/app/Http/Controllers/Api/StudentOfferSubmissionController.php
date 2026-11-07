<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\OfferVerificationHistory;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Services\Offers\OfferVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentOfferSubmissionController extends Controller
{
    public function __construct(
        protected OfferVerificationService $verificationService
    ) {}

    /**
     * Student self-reporting an off-campus offer with document evidence.
     * POST /api/v1/students/me/offers/off-campus
     */
    public function storeOffCampus(Request $request)
    {
        $student = $request->user()->studentProfile;
        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'No student profile found for authenticated user.',
            ], 403);
        }

        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'designation' => 'required|string|max:255',
            'ctc' => 'required|numeric|min:0.1|max:1000.0',
            'offer_date' => 'required|date',
            'joining_date' => 'nullable|date',
            'document' => 'nullable|file|max:10240',
            'document_type' => 'nullable|string|in:OFFER_LETTER,INTERNSHIP_OFFER,INTENT_LETTER,EMPLOYMENT_CONTRACT,SALARY_BREAKUP,OTHER',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        $offer = DB::transaction(function () use ($validated, $student, $user, $request) {
            $offer = Offer::create([
                'student_id' => $student->id,
                'recruiter_id' => null,
                'job_id' => null,
                'placement_drive_id' => null,
                'drive_candidate_id' => null,
                'status' => OfferStatus::PENDING->value,
                'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                'is_off_campus' => true,
                'company_name' => $validated['company_name'],
                'designation' => $validated['designation'],
                'ctc' => $validated['ctc'],
                'offer_date' => $validated['offer_date'],
                'joining_date' => $validated['joining_date'] ?? null,
            ]);

            OfferVerificationHistory::create([
                'offer_id' => $offer->id,
                'actor_id' => $user->id,
                'actor_user_id' => $user->id,
                'actor_name' => $user->name ?? explode('@', $user->email)[0],
                'actor_email' => $user->email,
                'action' => 'STUDENT_SUBMITTED',
                'previous_status' => null,
                'new_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                'notes' => $validated['notes'] ?? 'Off-campus offer submitted by student.',
                'metadata' => [
                    'source' => 'STUDENT_OFF_CAMPUS_PORTAL',
                    'student_id' => $student->id,
                ],
            ]);

            // Store the initial evidence document version if uploaded
            if ($request->hasFile('document')) {
                $docType = $validated['document_type'] ?? 'OFFER_LETTER';
                $this->verificationService->storeDocument(
                    $offer,
                    $request->file('document'),
                    $docType,
                    $user
                );
            }

            return $offer;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Off-campus offer submitted successfully and queued for institutional verification.',
            'offer' => $offer->fresh(['documents', 'verificationHistories']),
        ], 201);
    }

    /**
     * Upload an additional or replacement document version for a student's own offer.
     * POST /api/v1/students/me/offers/{offerId}/documents
     */
    public function uploadDocument(Request $request, $offerId)
    {
        $student = $request->user()->studentProfile;
        if (! $student) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $offer = Offer::where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $validated = $request->validate([
            'document' => 'required|file',
            'document_type' => 'required|string|in:OFFER_LETTER,INTERNSHIP_OFFER,INTENT_LETTER,EMPLOYMENT_CONTRACT,SALARY_BREAKUP,OTHER',
        ]);

        $doc = $this->verificationService->storeDocument(
            $offer,
            $request->file('document'),
            $validated['document_type'],
            $request->user()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Document version uploaded successfully.',
            'document' => $doc,
            'offer' => $offer->fresh(['documents']),
        ], 201);
    }

    /**
     * Authenticated download of a document for a student's own offer.
     * GET /api/v1/students/me/offers/{offerId}/documents/{documentId}/download
     */
    public function downloadDocument(Request $request, $offerId, $documentId)
    {
        $student = $request->user()->studentProfile;
        if (! $student) {
            abort(403, 'Unauthorized.');
        }

        $offer = Offer::where('id', $offerId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        return $this->verificationService->downloadDocument($offer, (int) $documentId, $request->user());
    }
}
