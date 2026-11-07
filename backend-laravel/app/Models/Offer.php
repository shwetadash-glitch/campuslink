<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\CandidateDriveStatus;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class Offer extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $attributes = [
        'verification_status' => 'PENDING_VERIFICATION',
        'is_off_campus' => false,
    ];

    protected $casts = [
        'offer_date' => 'datetime',
        'acceptance_date' => 'datetime',
        'joining_date' => 'datetime',
        'verified_at' => 'datetime',
        'review_claimed_at' => 'datetime',
        'review_claimed_until' => 'datetime',
        'status' => OfferStatus::class,
        'verification_status' => OfferVerificationStatus::class,
        'ctc' => 'float',
        'is_off_campus' => 'boolean',
    ];

    public function getAcceptedAtAttribute()
    {
        return $this->acceptance_date;
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function recruiter()
    {
        return $this->belongsTo(Recruiter::class);
    }

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function application()
    {
        return $this->belongsTo(Application::class);
    }

    public function placementDrive()
    {
        return $this->belongsTo(PlacementDrive::class, 'placement_drive_id');
    }

    public function driveCandidate()
    {
        return $this->belongsTo(DriveCandidate::class, 'drive_candidate_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function reviewClaimedBy()
    {
        return $this->belongsTo(User::class, 'review_claimed_by');
    }

    public function documents()
    {
        return $this->hasMany(OfferDocument::class)->orderBy('document_type')->orderBy('version_number', 'desc');
    }

    public function verificationHistories()
    {
        return $this->hasMany(OfferVerificationHistory::class, 'offer_id')->orderBy('created_at', 'asc');
    }

    public function latestDocument(string $documentType)
    {
        return $this->documents()->where('document_type', $documentType)->orderBy('version_number', 'desc')->first();
    }

    public function isVerified(): bool
    {
        $status = is_object($this->verification_status)
            ? $this->verification_status
            : OfferVerificationStatus::tryFrom((string) $this->verification_status);

        return $status === OfferVerificationStatus::VERIFIED;
    }

    public function isReviewClaimActive(): bool
    {
        return $this->review_claimed_until !== null && $this->review_claimed_until->isFuture();
    }

    public function isClaimedBy(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : (int) $user;

        return $this->isReviewClaimActive() && (int) $this->review_claimed_by === $userId;
    }

    public function canBeClaimedBy(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : (int) $user;

        return ! $this->isReviewClaimActive() || (int) $this->review_claimed_by === $userId;
    }

    // Scopes
    public function scopeVerified($query)
    {
        return $query->where('verification_status', OfferVerificationStatus::VERIFIED->value);
    }

    public function scopePendingVerification($query)
    {
        return $query->where('verification_status', OfferVerificationStatus::PENDING_VERIFICATION->value);
    }

    public function scopeUnderReview($query)
    {
        return $query->where('verification_status', OfferVerificationStatus::UNDER_REVIEW->value);
    }

    public function scopeNeedsAdditionalInfo($query)
    {
        return $query->where('verification_status', OfferVerificationStatus::NEEDS_ADDITIONAL_INFO->value);
    }

    public function scopeVerifiedPlacement($query)
    {
        return $query->where('verification_status', OfferVerificationStatus::VERIFIED->value)
            ->whereIn('status', [OfferStatus::ACCEPTED->value, OfferStatus::JOINED->value]);
    }

    public function scopeOffCampus($query)
    {
        return $query->where('is_off_campus', true);
    }

    public function scopeOnCampus($query)
    {
        return $query->where('is_off_campus', false);
    }

    /**
     * Accept the offer, synchronizing CandidateDriveStatus and immutable audit logs.
     */
    public function accept(User $user, ?string $notes = null): self
    {
        $currentStatus = is_object($this->status) ? $this->status->value : (string) $this->status;
        if ($currentStatus !== OfferStatus::PENDING->value) {
            throw new \InvalidArgumentException("Only PENDING offers can be accepted. Current status is [{$currentStatus}].");
        }

        DB::transaction(function () use ($user, $notes) {
            $this->update([
                'status' => OfferStatus::ACCEPTED->value,
                'acceptance_date' => Carbon::now(),
            ]);

            // Synchronize associated DriveCandidate if linked
            if ($this->drive_candidate_id) {
                $candidate = DriveCandidate::find($this->drive_candidate_id);
                if ($candidate) {
                    $candidate->transitionTo(
                        CandidateDriveStatus::OFFER_ACCEPTED->value,
                        $user->id,
                        $notes ?? "Offer accepted by candidate for {$this->job?->title} at {$this->job?->company?->name}."
                    );
                }
            }
        });

        return $this;
    }

    /**
     * Reject/Decline the offer, synchronizing CandidateDriveStatus.
     */
    public function reject(User $user, ?string $reason = null): self
    {
        $currentStatus = is_object($this->status) ? $this->status->value : (string) $this->status;
        if ($currentStatus !== OfferStatus::PENDING->value) {
            throw new \InvalidArgumentException("Only PENDING offers can be rejected. Current status is [{$currentStatus}].");
        }

        DB::transaction(function () use ($user, $reason) {
            $this->update([
                'status' => OfferStatus::DECLINED->value,
                'rejection_reason' => $reason,
            ]);

            if ($this->drive_candidate_id) {
                $candidate = DriveCandidate::find($this->drive_candidate_id);
                if ($candidate) {
                    $candidate->transitionTo(
                        CandidateDriveStatus::OFFER_REJECTED->value,
                        $user->id,
                        $reason ? "Offer declined by candidate: {$reason}" : "Offer declined by candidate."
                    );
                }
            }
        });

        return $this;
    }

    /**
     * Confirm joining date and status.
     */
    public function confirmJoining(?User $user = null, ?string $joiningDate = null, ?string $notes = null): self
    {
        $currentStatus = is_object($this->status) ? $this->status->value : (string) $this->status;
        if ($currentStatus !== OfferStatus::ACCEPTED->value) {
            throw new \InvalidArgumentException("Joining can only be confirmed for ACCEPTED offers. Current status is [{$currentStatus}].");
        }

        if (! $this->isVerified()) {
            throw new \App\Exceptions\OfferVerificationException(
                "Joining can only be confirmed for VERIFIED offers. Current verification status is [{$this->verification_status?->value}].",
                'OFFER_NOT_VERIFIED',
                422
            );
        }

        DB::transaction(function () use ($user, $joiningDate, $notes) {
            $this->update([
                'status' => OfferStatus::JOINED->value,
                'joining_date' => $joiningDate ? Carbon::parse($joiningDate) : Carbon::now(),
            ]);

            if ($this->drive_candidate_id) {
                $candidate = DriveCandidate::find($this->drive_candidate_id);
                if ($candidate) {
                    $candidate->transitionTo(
                        CandidateDriveStatus::JOINED->value,
                        $user->id,
                        $notes ?? 'Joining confirmed on ' . ($this->joining_date?->format('Y-m-d') ?? now()->format('Y-m-d'))
                    );
                }
            }
        });

        return $this;
    }
}
