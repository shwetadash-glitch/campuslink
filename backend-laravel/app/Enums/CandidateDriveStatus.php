<?php

namespace App\Enums;

enum CandidateDriveStatus: string
{
    case REGISTERED = 'REGISTERED';
    case ELIGIBLE = 'ELIGIBLE';
    case INELIGIBLE = 'INELIGIBLE';
    case SHORTLISTED = 'SHORTLISTED';
    case INTERVIEWING = 'INTERVIEWING';
    case OFFERED = 'OFFERED';
    case OFFER_ACCEPTED = 'OFFER_ACCEPTED';
    case OFFER_REJECTED = 'OFFER_REJECTED';
    case JOINED = 'JOINED';
    case REJECTED = 'REJECTED';
    case WITHDRAWN = 'WITHDRAWN';
}
