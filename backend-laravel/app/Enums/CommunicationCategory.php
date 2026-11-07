<?php

namespace App\Enums;

enum CommunicationCategory: string
{
    case HR_INTERVIEW = 'HR_INTERVIEW';
    case TECHNICAL_EXPLANATION = 'TECHNICAL_EXPLANATION';
    case GROUP_DISCUSSION = 'GROUP_DISCUSSION';
    case PROFESSIONAL_EMAIL = 'PROFESSIONAL_EMAIL';
    case STRUCTURED_SPEAKING = 'STRUCTURED_SPEAKING';

    public function label(): string
    {
        return match ($this) {
            self::HR_INTERVIEW => 'HR Interview Communication',
            self::TECHNICAL_EXPLANATION => 'Technical Explanation',
            self::GROUP_DISCUSSION => 'Group Discussion Responses',
            self::PROFESSIONAL_EMAIL => 'Professional Email Writing',
            self::STRUCTURED_SPEAKING => 'Presentation & Structured Speaking',
        };
    }
}
