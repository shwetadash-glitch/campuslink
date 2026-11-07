<?php

namespace App\Services\Sandbox;

interface CodeSandboxInterface
{
    /**
     * Execute candidate code against a single stdin input.
     *
     * @param string $language Programming language identifier (e.g. php, python, javascript, cpp, java)
     * @param string $sourceCode Source code submitted by student
     * @param string $stdin Standard input stream
     * @param array $limits Resource limits ['cpu_time_limit' => 2.0, 'memory_limit_mb' => 128, 'wall_time_limit' => 5.0]
     * @return array ['status' => 'SUCCESS'|'COMPILE_ERROR'|'TIMEOUT'|'MEMORY_EXCEEDED'|'RUNTIME_ERROR', 'stdout' => string, 'stderr' => string, 'exit_code' => int, 'time_ms' => float, 'memory_kb' => int]
     */
    public function execute(string $language, string $sourceCode, string $stdin, array $limits = []): array;

    /**
     * Evaluate a submission across multiple test cases (visible sample + hidden validation test cases).
     *
     * @param string $language
     * @param string $sourceCode
     * @param array $testCases Array of ['input' => '...', 'expected_output' => '...', 'is_hidden' => bool]
     * @param array $limits
     * @return array Summary with pass rate, execution details, and test case breakdown
     */
    public function evaluateSubmission(string $language, string $sourceCode, array $testCases, array $limits = []): array;

    /**
     * Get adapter identifier.
     */
    public function getAdapterName(): string;

    /**
     * Check if the adapter is available and configured.
     */
    public function isAvailable(): bool;
}
