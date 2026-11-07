<?php

namespace App\Exceptions;

use Exception;

class ReviewClaimExpiredException extends Exception
{
    public function __construct(string $message = 'Review claim lease has expired or the token is stale.', int $code = 409)
    {
        parent::__construct($message, $code);
    }

    public function render($request)
    {
        return response()->json([
            'error' => 'Review claim lease expired or token stale.',
            'code' => 'REVIEW_CLAIM_EXPIRED',
            'message' => $this->getMessage(),
        ], 409);
    }
}
