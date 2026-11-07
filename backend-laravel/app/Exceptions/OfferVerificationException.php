<?php

namespace App\Exceptions;

use Exception;

class OfferVerificationException extends Exception
{
    protected string $errorCode;

    public function __construct(string $message, string $errorCode = 'OFFER_VERIFICATION_ERROR', int $code = 422)
    {
        parent::__construct($message, $code);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function render($request)
    {
        return response()->json([
            'error' => $this->getMessage(),
            'code' => $this->errorCode,
            'message' => $this->getMessage(),
        ], $this->getCode() ?: 422);
    }
}
