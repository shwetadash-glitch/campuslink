<?php

namespace App\Exceptions;

use Exception;

class EvaluationClaimConflictException extends Exception
{
    public function __construct(string $message = "An evaluation is currently in progress for this session.")
    {
        parent::__construct($message, 409);
    }
}
