<?php

namespace App\Exceptions;

use Exception;

class ReviewClaimConflictException extends Exception
{
    public function __construct(string $message = 'This offer is currently under active review by another officer.', int $code = 409)
    {
        parent::__construct($message, $code);
    }

    public function render($request)
    {
        return response()->json([
            'error' => 'Review claim conflict.',
            'code' => 'REVIEW_CLAIM_CONFLICT',
            'message' => $this->getMessage(),
        ], 409);
    }
}
