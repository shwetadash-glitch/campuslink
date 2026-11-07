<?php

namespace App\Exceptions;

use Exception;

class ClearanceValidationException extends Exception
{
    protected string $errorCode;

    public function __construct(string $errorCode, string $message = "")
    {
        parent::__construct($message);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}
