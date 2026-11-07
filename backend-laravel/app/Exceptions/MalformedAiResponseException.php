<?php

namespace App\Exceptions;

use Exception;

class MalformedAiResponseException extends Exception
{
    public function __construct(string $message = "The AI evaluation output was malformed or failed schema validation.")
    {
        parent::__construct($message, 502);
    }
}
