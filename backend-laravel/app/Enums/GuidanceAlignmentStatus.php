<?php

namespace App\Enums;

enum GuidanceAlignmentStatus: string
{
    case SUPPORTED_BY_GUIDANCE = 'SUPPORTED_BY_GUIDANCE';
    case CONTRADICTS_GUIDANCE = 'CONTRADICTS_GUIDANCE';
    case UNVERIFIED = 'UNVERIFIED';
    case NOT_APPLICABLE = 'NOT_APPLICABLE';

    public function label(): string
    {
        return match ($this) {
            self::SUPPORTED_BY_GUIDANCE => 'Supported by Guidance',
            self::CONTRADICTS_GUIDANCE => 'Contradicts Guidance',
            self::UNVERIFIED => 'Unverified Claim',
            self::NOT_APPLICABLE => 'Not Applicable',
        };
    }
}
