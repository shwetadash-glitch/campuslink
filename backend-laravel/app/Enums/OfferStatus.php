<?php

namespace App\Enums;

enum OfferStatus: string
{
    case PENDING = 'PENDING';
    case ACCEPTED = 'ACCEPTED';
    case DECLINED = 'DECLINED';
    case REJECTED = 'REJECTED';
    case DEFERRED = 'DEFERRED';
    case WITHDRAWN = 'WITHDRAWN';
    case JOINED = 'JOINED';
}
