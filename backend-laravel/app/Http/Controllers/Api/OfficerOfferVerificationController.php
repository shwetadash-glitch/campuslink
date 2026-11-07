<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\Student;
use App\Models\OfferVerificationHistory;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Services\Offers\OfferVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OfficerOfferVerificationController extends Controller
{
    public function __construct(
        protected OfferVerificationService $verificationService
    ) {}

    /**
     * List all offers with multi-dimensional filtering for the verification desk.
     */
    public function index(Request $request)
    {
        $query = Offer::with(['student', 'job.company', 'documents', 'reviewClaimedBy', 'verifiedBy'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('verification_status')) {
            $query->where('verification_status', $request->input('verification_status'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('is_off_campus')) {
            $query->where('is_off_campus', filter_var($request->input('is_off_campus'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('batch')) {
            $batch = $request->input('batch');
            $query->whereHas('student', fn ($q) => $q->where('graduation_year', $batch));
        }

        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'ilike', $search)
                    ->orWhere('designation', 'ilike', $search)
                    ->orWhereHas('student', function ($sq) use ($search) {
                        $sq->where('first_name', 'ilike', $search)
                            ->orWhere('last_name', 'ilike', $search)
                            ->orWhere('student_identifier', 'ilike', $search);
                    });
            });
        }

        $perPage = min((int) ($request->input('per_page', 15)), 100);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Get offer details including all documents and immutable verification history.
     */
    public function show(Request $request, $id)
    {
        $offer = Offer::with([
            'student.user',
            'job.company',
            'placementDrive',
            'documents.uploadedBy',
            'documents.verifiedBy',
            'verificationHistories.actor',
            'verificationHistories.reviewedDocument',
            'reviewClaimedBy',
            'verifiedBy',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'offer' => $offer,
        ]);
    }

    /**
     * TPO manual registration of an offer.
     * MANDATORY: Offers ALWAYS enter PENDING_VERIFICATION. Zero bypass.
     */
    public function manualRegister(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'company_name' => 'required|string|max:255',
            'designation' => 'required|string|max:255',
            'ctc' => 'required|numeric|min:0.1|max:1000.0',
            'offer_date' => 'required|date',
            'joining_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
            'document' => 'nullable|file|max:10240|mimes:pdf,png,jpg,jpeg',
            'document_type' => 'nullable|string|max:100',
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $officer = $request->user();

        $offer = DB::transaction(function () use ($validated, $student, $officer, $request) {
            $offer = Offer::create([
                'student_id' => $student->id,
                'recruiter_id' => null,
                'job_id' => null,
                'placement_drive_id' => null,
                'drive_candidate_id' => null,
                'status' => OfferStatus::PENDING->value,
                'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value, // Zero bypass!
                'is_off_campus' => true,
                'company_name' => $validated['company_name'],
                'designation' => $validated['designation'],
                'ctc' => $validated['ctc'],
                'offer_date' => $validated['offer_date'],
                'joining_date' => $validated['joining_date'] ?? null,
            ]);

            OfferVerificationHistory::create([
                'offer_id' => $offer->id,
                'actor_id' => $officer->id,
                'actor_user_id' => $officer->id,
                'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                'actor_email' => $officer->email,
                'action' => 'TPO_MANUALLY_REGISTERED',
                'previous_status' => null,
                'new_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                'notes' => $validated['notes'] ?? 'Manually registered by placement officer.',
                'metadata' => [
                    'source' => 'TPO_MANUAL_INTAKE',
                    'registered_by_officer_id' => $officer->id,
                ],
            ]);

            if ($request->hasFile('document')) {
                $docType = $validated['document_type'] ?? 'OFFER_LETTER';
                $this->verificationService->storeDocument($offer, $request->file('document'), $docType, $officer);
            }

            return $offer;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Offer manually registered in PENDING_VERIFICATION state.',
            'offer' => $offer->fresh(['student', 'documents', 'verificationHistories']),
        ], 201);
    }

    /**
     * Acquire a 15-minute review claim lease.
     */
    public function claimReview(Request $request, $id)
    {
        $offer = Offer::findOrFail($id);
        $updatedOffer = $this->verificationService->claimReview($offer, $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Review claim lease acquired for 15 minutes.',
            'offer' => $updatedOffer,
            'review_claim_token' => $updatedOffer->review_claim_token,
            'review_claimed_until' => $updatedOffer->review_claimed_until->toIso8601String(),
        ]);
    }

    /**
     * Voluntarily release review claim lease.
     */
    public function releaseClaim(Request $request, $id)
    {
        $offer = Offer::findOrFail($id);
        $token = $request->input('review_claim_token');
        $updatedOffer = $this->verificationService->releaseClaim($offer, $request->user(), $token);

        return response()->json([
            'status' => 'success',
            'message' => 'Review claim lease released.',
            'offer' => $updatedOffer,
        ]);
    }

    /**
     * Formally verify an offer based on reviewed document evidence.
     */
    public function verify(Request $request, $id)
    {
        $validated = $request->validate([
            'review_claim_token' => 'required|uuid',
            'reviewed_document_id' => 'required|integer|exists:offer_documents,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        $offer = Offer::findOrFail($id);
        $verifiedOffer = $this->verificationService->verifyOffer(
            $offer,
            $request->user(),
            $validated['review_claim_token'],
            $validated['reviewed_document_id'],
            $validated['notes'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Offer successfully verified.',
            'offer' => $verifiedOffer,
        ]);
    }

    /**
     * Formally reject an offer, requiring a documented reason.
     */
    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'review_claim_token' => 'required|uuid',
            'reason' => 'required|string|min:5|max:1000',
            'reviewed_document_id' => 'nullable|integer|exists:offer_documents,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        $offer = Offer::findOrFail($id);
        $rejectedOffer = $this->verificationService->rejectOffer(
            $offer,
            $request->user(),
            $validated['review_claim_token'],
            $validated['reason'],
            $validated['reviewed_document_id'] ?? null,
            $validated['notes'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Offer verification rejected.',
            'offer' => $rejectedOffer,
        ]);
    }

    /**
     * Request additional information from student.
     */
    public function requestInfo(Request $request, $id)
    {
        $validated = $request->validate([
            'review_claim_token' => 'required|uuid',
            'notes' => 'required|string|min:5|max:1000',
            'reviewed_document_id' => 'nullable|integer|exists:offer_documents,id',
        ]);

        $offer = Offer::findOrFail($id);
        $updatedOffer = $this->verificationService->requestAdditionalInfo(
            $offer,
            $request->user(),
            $validated['review_claim_token'],
            $validated['notes'],
            $validated['reviewed_document_id'] ?? null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Additional information requested from student.',
            'offer' => $updatedOffer,
        ]);
    }

    /**
     * Upload an additional or replacement document version.
     */
    public function uploadDocument(Request $request, $id)
    {
        $validated = $request->validate([
            'document' => 'required|file|max:10240',
            'document_type' => 'required|string|max:100',
        ]);

        $offer = Offer::findOrFail($id);
        $doc = $this->verificationService->storeDocument(
            $offer,
            $request->file('document'),
            $validated['document_type'],
            $request->user()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Document uploaded successfully.',
            'document' => $doc,
        ], 201);
    }

    /**
     * Authenticated download of an offer document.
     */
    public function downloadDocument(Request $request, $id, $documentId)
    {
        $offer = Offer::findOrFail($id);

        return $this->verificationService->downloadDocument($offer, (int) $documentId, $request->user());
    }

    /**
     * Audit trail history for an offer.
     */
    public function history(Request $request, $id)
    {
        $offer = Offer::findOrFail($id);
        $history = $offer->verificationHistories()->with(['actor', 'reviewedDocument'])->get();

        return response()->json([
            'status' => 'success',
            'history' => $history,
        ]);
    }
}
