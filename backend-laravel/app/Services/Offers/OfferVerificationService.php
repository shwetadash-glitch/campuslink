<?php

namespace App\Services\Offers;

use App\Models\Offer;
use App\Models\OfferDocument;
use App\Models\OfferVerificationHistory;
use App\Models\User;
use App\Enums\OfferVerificationStatus;
use App\Enums\OfferDocumentStatus;
use App\Exceptions\ReviewClaimConflictException;
use App\Exceptions\ReviewClaimExpiredException;
use App\Exceptions\OfferVerificationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;

class OfferVerificationService
{
    public const LEASE_DURATION_MINUTES = 15;
    public const MAX_FILE_SIZE_BYTES = 10485760; // 10 MB
    public const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/png',
        'image/jpeg',
    ];

    /**
     * Acquire a 15-minute review claim lease on an offer.
     * Prevents concurrent review by competing officers while safely recovering expired claims.
     */
    public function claimReview(Offer $offer, User $officer): Offer
    {
        $connectionName = $offer->getConnectionName();

        return DB::connection($connectionName)->transaction(function () use ($offer, $officer, $connectionName) {
            /** @var Offer $lockedOffer */
            $lockedOffer = Offer::on($connectionName)->where('id', $offer->id)->lockForUpdate()->firstOrFail();

            $now = Carbon::now();
            $previousClaimerId = $lockedOffer->review_claimed_by;
            $previousStatus = $lockedOffer->verification_status?->value ?? OfferVerificationStatus::PENDING_VERIFICATION->value;

            // 1. Check if an active lease is currently held
            if ($lockedOffer->isReviewClaimActive()) {
                if ((int) $lockedOffer->review_claimed_by === (int) $officer->id) {
                    // Already held by this officer; refresh lease expiration
                    $newClaimedUntil = $now->copy()->addMinutes(self::LEASE_DURATION_MINUTES);
                    $lockedOffer->update([
                        'review_claimed_until' => $newClaimedUntil,
                    ]);

                    // Append-only history entry for claim renewal
                    OfferVerificationHistory::on($connectionName)->create([
                        'offer_id' => $lockedOffer->id,
                        'actor_id' => $officer->id,
                        'actor_user_id' => $officer->id,
                        'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                        'actor_email' => $officer->email,
                        'action' => 'CLAIM_RENEWED',
                        'previous_status' => OfferVerificationStatus::UNDER_REVIEW->value,
                        'new_status' => OfferVerificationStatus::UNDER_REVIEW->value,
                        'review_claim_token' => $lockedOffer->review_claim_token,
                        'notes' => "Review lease renewed by {$officer->email} for another " . self::LEASE_DURATION_MINUTES . " minutes.",
                        'metadata' => [
                            'lease_duration_minutes' => self::LEASE_DURATION_MINUTES,
                            'review_claimed_until' => $newClaimedUntil->toIso8601String(),
                        ],
                    ]);

                    return $lockedOffer->fresh();
                }

                // Active claim held by another officer
                $claimerEmail = $lockedOffer->reviewClaimedBy?->email ?? "Officer #{$lockedOffer->review_claimed_by}";
                throw new ReviewClaimConflictException(
                    "This offer is currently under active review by {$claimerEmail} until {$lockedOffer->review_claimed_until->toIso8601String()}.",
                    409
                );
            }

            // 2. Either no previous claim or previous claim has expired
            $isReassignment = ($previousClaimerId !== null && (int) $previousClaimerId !== (int) $officer->id);
            $action = $isReassignment ? 'CLAIM_REASSIGNED' : 'CLAIM_ACQUIRED';
            $token = (string) Str::uuid();

            $lockedOffer->update([
                'review_claim_token' => $token,
                'review_claimed_at' => $now,
                'review_claimed_until' => $now->copy()->addMinutes(self::LEASE_DURATION_MINUTES),
                'review_claimed_by' => $officer->id,
                'verification_status' => OfferVerificationStatus::UNDER_REVIEW->value,
            ]);

            // Append-only verification history entry
            OfferVerificationHistory::on($connectionName)->create([
                'offer_id' => $lockedOffer->id,
                'actor_id' => $officer->id,
                'actor_user_id' => $officer->id,
                'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                'actor_email' => $officer->email,
                'action' => $action,
                'previous_status' => $previousStatus,
                'new_status' => OfferVerificationStatus::UNDER_REVIEW->value,
                'review_claim_token' => $token,
                'notes' => $isReassignment
                    ? "Review lease reassigned to {$officer->email} after previous claim expired."
                    : "Review lease acquired by {$officer->email}.",
                'metadata' => [
                    'lease_duration_minutes' => self::LEASE_DURATION_MINUTES,
                    'is_reassignment' => $isReassignment,
                    'previous_claimer_id' => $previousClaimerId,
                    'prior_unclaimed_status' => $previousStatus,
                ],
            ]);

            return $lockedOffer->fresh();
        });
    }

    /**
     * Voluntarily release an active review claim lease.
     */
    public function releaseClaim(Offer $offer, User $officer, ?string $token = null): Offer
    {
        $connectionName = $offer->getConnectionName();

        return DB::connection($connectionName)->transaction(function () use ($offer, $officer, $token, $connectionName) {
            /** @var Offer $lockedOffer */
            $lockedOffer = Offer::on($connectionName)->where('id', $offer->id)->lockForUpdate()->firstOrFail();

            if (! $lockedOffer->isReviewClaimActive() && empty($lockedOffer->review_claim_token)) {
                return $lockedOffer;
            }

            // Only the current claimer or SUPER_ADMIN may voluntarily release
            if ((int) $lockedOffer->review_claimed_by !== (int) $officer->id && $officer->role !== 'SUPER_ADMIN') {
                throw new ReviewClaimConflictException('You do not hold the active review claim on this offer.', 409);
            }

            if ($token !== null && $lockedOffer->review_claim_token !== $token) {
                throw new ReviewClaimExpiredException('Stale review claim token.', 409);
            }

            // Determine prior status from the last claim acquisition or reassignment event
            $lastClaimHistory = OfferVerificationHistory::on($connectionName)
                ->where('offer_id', $lockedOffer->id)
                ->whereIn('action', ['CLAIM_ACQUIRED', 'CLAIM_REASSIGNED'])
                ->latest('id')
                ->first();

            $priorStatus = $lastClaimHistory?->previous_status;
            $restoredStatus = ($priorStatus === OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value)
                ? OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value
                : OfferVerificationStatus::PENDING_VERIFICATION->value;

            $lockedOffer->update([
                'review_claim_token' => null,
                'review_claimed_at' => null,
                'review_claimed_until' => null,
                'review_claimed_by' => null,
                'verification_status' => $restoredStatus,
            ]);

            OfferVerificationHistory::on($connectionName)->create([
                'offer_id' => $lockedOffer->id,
                'actor_id' => $officer->id,
                'actor_user_id' => $officer->id,
                'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                'actor_email' => $officer->email,
                'action' => 'CLAIM_RELEASED',
                'previous_status' => OfferVerificationStatus::UNDER_REVIEW->value,
                'new_status' => $restoredStatus,
                'notes' => "Review claim lease voluntarily released by officer. Restored prior status: {$restoredStatus}.",
            ]);

            return $lockedOffer->fresh();
        });
    }

    /**
     * Formally approve and verify an offer, binding the decision to an exact reviewed document version.
     */
    public function verifyOffer(Offer $offer, User $officer, string $token, int $documentId, ?string $notes = null): Offer
    {
        $connectionName = $offer->getConnectionName();

        return DB::connection($connectionName)->transaction(function () use ($offer, $officer, $token, $documentId, $notes, $connectionName) {
            /** @var Offer $lockedOffer */
            $lockedOffer = Offer::on($connectionName)->where('id', $offer->id)->lockForUpdate()->firstOrFail();

            $this->validateReviewClaim($lockedOffer, $officer, $token);

            /** @var OfferDocument $document */
            $document = $lockedOffer->documents()->where('id', $documentId)->first();
            if (! $document) {
                throw new OfferVerificationException("Document [{$documentId}] does not belong to offer [{$lockedOffer->id}].", 'DOCUMENT_NOT_FOUND', 404);
            }

            // Accept the document as valid evidence
            $document->acceptAsValid($officer, $notes);

            // Supersede any older versions of this same document_type for this offer
            $lockedOffer->documents()
                ->where('document_type', $document->document_type)
                ->where('id', '!=', $document->id)
                ->where('document_status', '!=', OfferDocumentStatus::SUPERSEDED->value)
                ->update(['document_status' => OfferDocumentStatus::SUPERSEDED->value]);

            $previousStatus = $lockedOffer->verification_status?->value;

            // Update offer verification state and clear claim fields
            $lockedOffer->update([
                'verification_status' => OfferVerificationStatus::VERIFIED->value,
                'verified_at' => Carbon::now(),
                'verified_by' => $officer->id,
                'rejection_reason' => null,
                'review_claim_token' => null,
                'review_claimed_at' => null,
                'review_claimed_until' => null,
                'review_claimed_by' => null,
            ]);

            // Create immutable formal verification audit history
            OfferVerificationHistory::on($connectionName)->create([
                'offer_id' => $lockedOffer->id,
                'actor_id' => $officer->id,
                'actor_user_id' => $officer->id,
                'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                'actor_email' => $officer->email,
                'verified_by_user_id' => $officer->id,
                'reviewed_document_id' => $document->id,
                'reviewed_document_type' => $document->document_type,
                'reviewed_document_version' => $document->version_number,
                'action' => 'VERIFIED',
                'previous_status' => $previousStatus,
                'new_status' => OfferVerificationStatus::VERIFIED->value,
                'review_claim_token' => $token,
                'notes' => $notes ?? "Offer verified based on {$document->document_type} v{$document->version_number}.",
            ]);

            return $lockedOffer->fresh(['documents', 'verificationHistories']);
        });
    }

    /**
     * Formally reject an offer, documenting the mandatory reason.
     */
    public function rejectOffer(Offer $offer, User $officer, string $token, string $reason, ?int $documentId = null, ?string $notes = null): Offer
    {
        $connectionName = $offer->getConnectionName();

        return DB::connection($connectionName)->transaction(function () use ($offer, $officer, $token, $reason, $documentId, $notes, $connectionName) {
            /** @var Offer $lockedOffer */
            $lockedOffer = Offer::on($connectionName)->where('id', $offer->id)->lockForUpdate()->firstOrFail();

            $this->validateReviewClaim($lockedOffer, $officer, $token);

            $document = null;
            if ($documentId !== null) {
                $document = $lockedOffer->documents()->where('id', $documentId)->first();
                if (! $document) {
                    throw new OfferVerificationException("Document [{$documentId}] does not belong to offer [{$lockedOffer->id}].", 'DOCUMENT_NOT_FOUND', 404);
                }
                $document->rejectAsDefective($officer, $reason);
            }

            $previousStatus = $lockedOffer->verification_status?->value;

            $lockedOffer->update([
                'verification_status' => OfferVerificationStatus::REJECTED->value,
                'rejection_reason' => $reason,
                'review_claim_token' => null,
                'review_claimed_at' => null,
                'review_claimed_until' => null,
                'review_claimed_by' => null,
            ]);

            OfferVerificationHistory::on($connectionName)->create([
                'offer_id' => $lockedOffer->id,
                'actor_id' => $officer->id,
                'actor_user_id' => $officer->id,
                'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                'actor_email' => $officer->email,
                'verified_by_user_id' => null,
                'reviewed_document_id' => $document?->id,
                'reviewed_document_type' => $document?->document_type,
                'reviewed_document_version' => $document?->version_number,
                'action' => 'REJECTED',
                'previous_status' => $previousStatus,
                'new_status' => OfferVerificationStatus::REJECTED->value,
                'review_claim_token' => $token,
                'notes' => $notes ?? $reason,
                'metadata' => [
                    'rejection_reason' => $reason,
                ],
            ]);

            return $lockedOffer->fresh(['documents', 'verificationHistories']);
        });
    }

    /**
     * Request additional information from the student, transitioning the offer to NEEDS_ADDITIONAL_INFO.
     */
    public function requestAdditionalInfo(Offer $offer, User $officer, string $token, string $notes, ?int $documentId = null): Offer
    {
        $connectionName = $offer->getConnectionName();

        return DB::connection($connectionName)->transaction(function () use ($offer, $officer, $token, $notes, $documentId, $connectionName) {
            /** @var Offer $lockedOffer */
            $lockedOffer = Offer::on($connectionName)->where('id', $offer->id)->lockForUpdate()->firstOrFail();

            $this->validateReviewClaim($lockedOffer, $officer, $token);

            $document = null;
            if ($documentId !== null) {
                $document = $lockedOffer->documents()->where('id', $documentId)->first();
                if (! $document) {
                    throw new OfferVerificationException("Document [{$documentId}] does not belong to offer [{$lockedOffer->id}].", 'DOCUMENT_NOT_FOUND', 404);
                }
            }

            $previousStatus = $lockedOffer->verification_status?->value;

            $lockedOffer->update([
                'verification_status' => OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value,
                'review_claim_token' => null,
                'review_claimed_at' => null,
                'review_claimed_until' => null,
                'review_claimed_by' => null,
            ]);

            OfferVerificationHistory::on($connectionName)->create([
                'offer_id' => $lockedOffer->id,
                'actor_id' => $officer->id,
                'actor_user_id' => $officer->id,
                'actor_name' => $officer->name ?? explode('@', $officer->email)[0],
                'actor_email' => $officer->email,
                'verified_by_user_id' => null,
                'reviewed_document_id' => $document?->id,
                'reviewed_document_type' => $document?->document_type,
                'reviewed_document_version' => $document?->version_number,
                'action' => 'REQUESTED_INFO',
                'previous_status' => $previousStatus,
                'new_status' => OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value,
                'review_claim_token' => $token,
                'notes' => $notes,
            ]);

            return $lockedOffer->fresh(['documents', 'verificationHistories']);
        });
    }

    /**
     * Securely store an uploaded document, allocating a monotonic version per document_type.
     * Failed uploads are cleaned up cleanly without leaving orphaned storage files or broken records.
     */
    public function storeDocument(Offer $offer, UploadedFile $file, string $documentType, User $uploader): OfferDocument
    {
        // 1. Validate file size and MIME type via PHP file inspection
        if ($file->getSize() > self::MAX_FILE_SIZE_BYTES) {
            throw new OfferVerificationException('Document exceeds maximum allowed size of 10 MB.', 'FILE_TOO_LARGE', 422);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($file->getRealPath());
        if (! in_array($realMime, self::ALLOWED_MIME_TYPES, true)) {
            throw new OfferVerificationException("Invalid document MIME type [{$realMime}]. Only PDF, PNG, and JPEG files are accepted.", 'INVALID_FILE_TYPE', 422);
        }

        // 2. Server-side SHA-256 calculation
        $fileHash = hash_file('sha256', $file->getRealPath());
        $fileSize = $file->getSize();
        $originalFilename = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension() ?: 'bin';

        $storageDisk = $this->validateStorageConfig();
        $storageKey = "offer_documents/{$offer->id}/" . (string) Str::uuid() . ".{$extension}";

        // 3. Staging and atomic persistence with private visibility
        $storedSuccessfully = false;
        try {
            $storedSuccessfully = Storage::disk($storageDisk)->put(
                $storageKey,
                file_get_contents($file->getRealPath()),
                'private'
            );
            if (! $storedSuccessfully) {
                throw new OfferVerificationException('Failed to write document to secure storage disk.', 'STORAGE_WRITE_FAILED', 500);
            }

            $connectionName = $offer->getConnectionName();

            return DB::connection($connectionName)->transaction(function () use ($offer, $fileHash, $fileSize, $realMime, $originalFilename, $storageDisk, $storageKey, $documentType, $uploader, $connectionName) {
                // Lock offer to serialize concurrent version increments
                $lockedOffer = Offer::on($connectionName)->where('id', $offer->id)->lockForUpdate()->firstOrFail();

                // Allocate next monotonic version for this offer and document_type
                $maxVersion = (int) ($lockedOffer->documents()
                    ->where('document_type', $documentType)
                    ->max('version_number') ?? 0);
                $nextVersion = $maxVersion + 1;

                // Supersede existing active versions of this exact document_type (both PENDING_REVIEW and ACCEPTED_AS_VALID)
                $lockedOffer->documents()
                    ->where('document_type', $documentType)
                    ->where('document_status', '!=', OfferDocumentStatus::SUPERSEDED->value)
                    ->update(['document_status' => OfferDocumentStatus::SUPERSEDED->value]);

                $doc = OfferDocument::on($connectionName)->create([
                    'offer_id' => $lockedOffer->id,
                    'document_type' => $documentType,
                    'version_number' => $nextVersion,
                    'file_url' => $storageKey,
                    'storage_disk' => $storageDisk,
                    'storage_key' => $storageKey,
                    'file_hash' => $fileHash,
                    'file_size_bytes' => $fileSize,
                    'mime_type' => $realMime,
                    'original_filename' => $originalFilename,
                    'document_status' => OfferDocumentStatus::PENDING_REVIEW->value,
                    'uploaded_by' => $uploader->id,
                ]);

                $previousOfferStatus = $lockedOffer->verification_status?->value;
                $newOfferStatus = $previousOfferStatus;

                // Invalidation rule:
                // 1. If offer is VERIFIED and replacing previously accepted evidence or core offer letter:
                //    Re-verification is required. Previous approval fields are cleared.
                // 2. If offer is in NEEDS_ADDITIONAL_INFO or UNDER_REVIEW:
                //    New evidence returns offer to PENDING_VERIFICATION and clears active review claim.
                $isVerified = ($lockedOffer->verification_status === OfferVerificationStatus::VERIFIED);
                $replacesReviewedEvidence = $isVerified && (
                    $lockedOffer->verificationHistories()->where('action', 'VERIFIED')->where('reviewed_document_type', $documentType)->exists()
                    || $lockedOffer->documents()->where('document_type', $documentType)->where('id', '!=', $doc->id)->whereNotNull('verified_at')->exists()
                    || in_array($documentType, ['OFFER_LETTER', 'EMPLOYMENT_CONTRACT', 'INTERNSHIP_OFFER', 'INTENT_LETTER'], true)
                );

                if ($replacesReviewedEvidence) {
                    $newOfferStatus = OfferVerificationStatus::PENDING_VERIFICATION->value;
                    $lockedOffer->update([
                        'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                        'verified_at' => null,
                        'verified_by' => null,
                        'review_claim_token' => null,
                        'review_claimed_at' => null,
                        'review_claimed_until' => null,
                        'review_claimed_by' => null,
                    ]);
                } elseif (in_array($lockedOffer->verification_status, [OfferVerificationStatus::NEEDS_ADDITIONAL_INFO, OfferVerificationStatus::UNDER_REVIEW], true)) {
                    $newOfferStatus = OfferVerificationStatus::PENDING_VERIFICATION->value;
                    $lockedOffer->update([
                        'verification_status' => OfferVerificationStatus::PENDING_VERIFICATION->value,
                        'review_claim_token' => null,
                        'review_claimed_at' => null,
                        'review_claimed_until' => null,
                        'review_claimed_by' => null,
                    ]);
                }

                // Record history event for document intake
                OfferVerificationHistory::on($connectionName)->create([
                    'offer_id' => $lockedOffer->id,
                    'actor_id' => $uploader->id,
                    'actor_user_id' => $uploader->id,
                    'actor_name' => $uploader->name ?? explode('@', $uploader->email)[0],
                    'actor_email' => $uploader->email,
                    'reviewed_document_id' => $doc->id,
                    'reviewed_document_type' => $documentType,
                    'reviewed_document_version' => $nextVersion,
                    'action' => 'DOCUMENT_UPLOADED',
                    'previous_status' => $previousOfferStatus,
                    'new_status' => $newOfferStatus,
                    'notes' => $replacesReviewedEvidence
                        ? "Uploaded {$documentType} version {$nextVersion} replacing previously verified evidence. Previous verification cleared; re-verification required."
                        : "Uploaded {$documentType} version {$nextVersion} ({$originalFilename}).",
                    'metadata' => [
                        'file_hash' => $fileHash,
                        'file_size_bytes' => $fileSize,
                        'mime_type' => $realMime,
                        'replaces_reviewed_evidence' => $replacesReviewedEvidence,
                    ],
                ]);

                return $doc;
            });
        } catch (\Throwable $e) {
            // Clean up orphaned stored file on transaction failure
            if ($storedSuccessfully) {
                Storage::disk($storageDisk)->delete($storageKey);
            }
            throw $e;
        }
    }

    /**
     * Download or stream a document through an access-controlled authenticated pipeline.
     */
    public function downloadDocument(Offer $offer, int $documentId, User $requester)
    {
        /** @var OfferDocument $doc */
        $doc = $offer->documents()->where('id', $documentId)->first();
        if (! $doc) {
            abort(404, "Document [{$documentId}] not found for this offer.");
        }

        // Authorization rules:
        // 1. SUPER_ADMIN / PLACEMENT_OFFICER have institutional access
        // 2. STUDENT must own the offer
        // 3. RECRUITER must belong to the company that issued the offer
        $role = $requester->role;
        $isInstitutionalOfficer = in_array($role, ['SUPER_ADMIN', 'PLACEMENT_OFFICER'], true);

        if (! $isInstitutionalOfficer) {
            if ($role === 'STUDENT') {
                $studentProfile = $requester->studentProfile;
                if (! $studentProfile || (int) $offer->student_id !== (int) $studentProfile->id) {
                    abort(403, 'Unauthorized. You may only access documents associated with your own offers.');
                }
            } elseif ($role === 'RECRUITER') {
                $recruiterProfile = $requester->recruiterProfile;
                $isOwnOffer = $recruiterProfile && (
                    ((int) $offer->recruiter_id === (int) $recruiterProfile->id) ||
                    ($offer->job && (int) $offer->job->company_id === (int) $recruiterProfile->company_id)
                );
                if (! $isOwnOffer) {
                    abort(403, 'Unauthorized. Recruiters may only access documents for offers issued by their company.');
                }
            } else {
                abort(403, 'Unauthorized.');
            }
        }

        $disk = $doc->storage_disk ?: (string) config('filesystems.offer_document_disk', 'private');
        if (empty($doc->storage_key) || ! Storage::disk($disk)->exists($doc->storage_key)) {
            // Fallback: If not found on recorded disk, check alternate local private disk
            if (in_array($disk, ['private', 'local'], true)) {
                $fallbackDisk = ($disk === 'private') ? 'local' : 'private';
                if (Storage::disk($fallbackDisk)->exists($doc->storage_key)) {
                    $disk = $fallbackDisk;
                } else {
                    abort(404, 'The requested document file could not be found on storage.');
                }
            } else {
                abort(404, 'The requested document file could not be found on storage.');
            }
        }

        $filename = $doc->original_filename ?: "offer_doc_{$doc->id}.pdf";

        return Storage::disk($disk)->response(
            $doc->storage_key,
            $filename,
            ['Content-Type' => $doc->mime_type ?: 'application/octet-stream']
        );
    }

    /**
     * Validates that the storage disk configuration satisfies environment safety requirements.
     * In production, uploads fail closed if private cloud object storage is not properly configured.
     *
     * @throws OfferVerificationException
     */
    public function validateStorageConfig(): string
    {
        $disk = (string) config('filesystems.offer_document_disk', env('OFFER_DOCUMENT_DISK', 'private'));
        $isProduction = app()->environment('production');

        if ($isProduction) {
            $diskConfig = config("filesystems.disks.{$disk}");
            $driver = $diskConfig['driver'] ?? null;

            // Ephemeral local storage is strictly forbidden in production
            if ($driver !== 's3') {
                throw new OfferVerificationException(
                    'Private object storage is not configured for production document uploads.',
                    'STORAGE_NOT_CONFIGURED',
                    503
                );
            }

            // Public visibility is strictly forbidden for confidential document evidence
            if (($diskConfig['visibility'] ?? null) === 'public') {
                throw new OfferVerificationException(
                    'Offer document storage must strictly enforce private visibility.',
                    'STORAGE_CONFIG_INSECURE',
                    503
                );
            }

            // Verify non-empty S3 credentials and bucket
            $key = $diskConfig['key'] ?? null;
            $secret = $diskConfig['secret'] ?? null;
            $bucket = $diskConfig['bucket'] ?? null;

            if (empty($key) || empty($secret) || empty($bucket)) {
                throw new OfferVerificationException(
                    'Private object storage credentials or bucket are incomplete in production configuration.',
                    'STORAGE_CONFIG_INCOMPLETE',
                    503
                );
            }

            // Provider-specific validation (AWS S3 vs Cloudflare R2 / Custom S3)
            $provider = strtolower((string) ($diskConfig['provider'] ?? env('OFFER_DOCUMENT_PROVIDER', 'aws')));
            $endpoint = $diskConfig['endpoint'] ?? null;
            $isR2OrCustom = in_array($provider, ['r2', 'cloudflare', 'custom'], true)
                || (! empty($endpoint) && str_contains((string) $endpoint, 'r2.cloudflarestorage.com'));

            if ($isR2OrCustom) {
                // Cloudflare R2 / Custom S3 requires an explicit, valid HTTP/HTTPS endpoint
                if (empty($endpoint) || ! filter_var($endpoint, FILTER_VALIDATE_URL)) {
                    throw new OfferVerificationException(
                        'Cloudflare R2 or custom S3-compatible provider requires a valid endpoint URL.',
                        'STORAGE_CONFIG_INCOMPLETE',
                        503
                    );
                }
            } else {
                // AWS S3 requires a valid region (endpoint is optional as AWS SDK uses default regional endpoint)
                $region = $diskConfig['region'] ?? null;
                if (empty($region)) {
                    throw new OfferVerificationException(
                        'AWS S3 storage requires a valid region configuration.',
                        'STORAGE_CONFIG_INCOMPLETE',
                        503
                    );
                }
            }
        }

        return $disk;
    }

    /**
     * Validates that an officer holds a current, unexpired claim lease on the offer matching the provided token.
     */
    protected function validateReviewClaim(Offer $offer, User $officer, string $token): void
    {
        // 1. Token validation
        if (empty($offer->review_claim_token) || $offer->review_claim_token !== $token) {
            throw new ReviewClaimExpiredException('Stale or invalid review claim token. The claim may have expired or been reassigned.', 409);
        }

        // 2. Claimant identity validation
        if ((int) $offer->review_claimed_by !== (int) $officer->id) {
            throw new ReviewClaimConflictException('You are not the designated claimant for this offer review.', 409);
        }

        // 3. Expiration check
        if ($offer->review_claimed_until === null || $offer->review_claimed_until->isPast()) {
            throw new ReviewClaimExpiredException(
                "Review claim lease expired at {$offer->review_claimed_until?->toIso8601String()}. Please re-acquire the claim before submitting a decision.",
                409
            );
        }

        // 4. Current state check
        if ($offer->verification_status !== OfferVerificationStatus::UNDER_REVIEW) {
            throw new OfferVerificationException(
                "Offer is not currently under review (current status: {$offer->verification_status?->value}).",
                'INVALID_VERIFICATION_STATE',
                422
            );
        }
    }
}
