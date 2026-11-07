<?php

namespace App\Enums;

enum OfferDocumentStatus: string
{
    case PENDING_REVIEW = 'PENDING_REVIEW';
    case ACCEPTED_AS_VALID = 'ACCEPTED_AS_VALID';
    case REJECTED_DEFECTIVE = 'REJECTED_DEFECTIVE';
    case SUPERSEDED = 'SUPERSEDED';

    public function isValid(): bool
    {
        return $this === self::ACCEPTED_AS_VALID;
    }

    public function isReviewed(): bool
    {
        return in_array($this, [self::ACCEPTED_AS_VALID, self::REJECTED_DEFECTIVE, self::SUPERSEDED], true);
    }
}
