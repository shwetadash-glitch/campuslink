<?php

namespace App\Exceptions;

use RuntimeException;

class AiServiceUnavailableException extends RuntimeException
{
    protected int $retryAfter;
    protected string $featureContext;

    public function __construct(
        string $message = 'The AI service is temporarily unavailable. Core operations remain fully functional.',
        string $featureContext = 'general',
        int $retryAfter = 30,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, 503, $previous);
        $this->featureContext = $featureContext;
        $this->retryAfter = $retryAfter;
    }

    public function getRetryAfter(): int
    {
        return $this->retryAfter;
    }

    public function getFeatureContext(): string
    {
        return $this->featureContext;
    }
}
