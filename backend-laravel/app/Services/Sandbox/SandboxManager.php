<?php

namespace App\Services\Sandbox;

class SandboxManager
{
    protected ?CodeSandboxInterface $adapter = null;

    public function __construct(?CodeSandboxInterface $adapter = null)
    {
        $this->adapter = $adapter;
    }

    public function resolveAdapter(): CodeSandboxInterface
    {
        if ($this->adapter !== null) {
            return $this->adapter;
        }

        $driver = config('services.sandbox.driver', 'mock');

        if ($driver === 'judge0') {
            $this->adapter = new Judge0SandboxAdapter(
                config('services.judge0.url'),
                config('services.judge0.key'),
                config('services.judge0.host'),
                (bool) config('services.judge0.live_enabled', false)
            );
            return $this->adapter;
        }

        $this->adapter = new MockSandboxAdapter();
        return $this->adapter;
    }

    public function setAdapter(CodeSandboxInterface $adapter): void
    {
        $this->adapter = $adapter;
    }

    public function execute(string $language, string $sourceCode, string $stdin, array $limits = []): array
    {
        return $this->resolveAdapter()->execute($language, $sourceCode, $stdin, $limits);
    }

    public function evaluateSubmission(string $language, string $sourceCode, array $testCases, array $limits = []): array
    {
        return $this->resolveAdapter()->evaluateSubmission($language, $sourceCode, $testCases, $limits);
    }

    public function getAdapterName(): string
    {
        return $this->resolveAdapter()->getAdapterName();
    }
}
