<?php

namespace App\Enums;

enum OfferVerificationStatus: string
{
    case PENDING_VERIFICATION = 'PENDING_VERIFICATION';
    case UNDER_REVIEW = 'UNDER_REVIEW';
    case NEEDS_ADDITIONAL_INFO = 'NEEDS_ADDITIONAL_INFO';
    case VERIFIED = 'VERIFIED';
    case REJECTED = 'REJECTED';

    public function isVerified(): bool
    {
        return $this === self::VERIFIED;
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::VERIFIED, self::REJECTED], true);
    }

    public function canBeClaimed(): bool
    {
        return in_array($this, [self::PENDING_VERIFICATION, self::UNDER_REVIEW, self::NEEDS_ADDITIONAL_INFO], true);
    }
}
