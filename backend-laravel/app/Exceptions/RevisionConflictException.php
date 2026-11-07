<?php

namespace App\Exceptions;

use Exception;

class RevisionConflictException extends Exception
{
    public ?int $existingChildId;

    public function __construct(?int $existingChildId = null, string $message = "A follow-up revision already exists for this practice attempt.")
    {
        parent::__construct($message, 409);
        $this->existingChildId = $existingChildId;
    }
}
