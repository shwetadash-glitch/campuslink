<?php

namespace App\Exceptions;

use Exception;

class InferenceTimeoutException extends Exception
{
    public function __construct(string $message = "The AI evaluation service timed out while processing your response.")
    {
        parent::__construct($message, 504);
    }
}
