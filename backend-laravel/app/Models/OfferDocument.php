<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Enums\OfferDocumentStatus;

class OfferDocument extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $attributes = [
        'version_number' => 1,
        'storage_disk' => 'private',
        'document_status' => 'PENDING_REVIEW',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'document_status' => OfferDocumentStatus::class,
        'version_number' => 'integer',
        'file_size_bytes' => 'integer',
        'extracted_metadata' => 'array',
    ];

    protected static function booted()
    {
        static::updating(function ($doc) {
            // Guard all core document evidence fields from in-place modification
            $immutableAttributes = [
                'offer_id',
                'document_type',
                'version_number',
                'storage_disk',
                'storage_key',
                'file_hash',
                'mime_type',
                'file_size_bytes',
            ];

            if ($doc->isDirty($immutableAttributes)) {
                throw new \LogicException('Uploaded document metadata and file evidence are immutable. Create a new document version instead.');
            }
        });
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class, 'offer_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isValid(): bool
    {
        $status = is_object($this->document_status)
            ? $this->document_status
            : OfferDocumentStatus::tryFrom((string) $this->document_status);

        return $status === OfferDocumentStatus::ACCEPTED_AS_VALID;
    }

    public function isVerified(): bool
    {
        return $this->isValid();
    }

    public function isLegacy(): bool
    {
        return empty($this->storage_key) && ! empty($this->file_url);
    }

    public function acceptAsValid(User $officer, ?string $notes = null): self
    {
        $this->update([
            'document_status' => OfferDocumentStatus::ACCEPTED_AS_VALID->value,
            'verification_status' => 'VERIFIED',
            'verified_at' => now(),
            'verified_by' => $officer->id,
            'rejection_reason' => null,
        ]);

        return $this;
    }

    public function rejectAsDefective(User $officer, ?string $reason = null): self
    {
        $this->update([
            'document_status' => OfferDocumentStatus::REJECTED_DEFECTIVE->value,
            'verification_status' => 'REJECTED',
            'verified_at' => now(),
            'verified_by' => $officer->id,
            'rejection_reason' => $reason,
        ]);

        return $this;
    }
}
