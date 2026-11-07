<?php

namespace App\Services\Sandbox;

class MockSandboxAdapter implements CodeSandboxInterface
{
    /**
     * Execute candidate code against a single stdin input.
     * NEVER executes arbitrary or untrusted code in local PHP/host process.
     */
    public function execute(string $language, string $sourceCode, string $stdin, array $limits = []): array
    {
        $cpuLimit = $limits['cpu_time_limit'] ?? 2.0;
        $memoryLimitMb = $limits['memory_limit_mb'] ?? 128;

        // Simulated Compilation Error
        if (str_contains($sourceCode, '// SIMULATE_COMPILE_ERROR') || str_contains($sourceCode, '# SIMULATE_COMPILE_ERROR') || str_contains($sourceCode, 'SYNTAX_ERROR')) {
            return [
                'status' => 'COMPILE_ERROR',
                'stdout' => '',
                'stderr' => "SyntaxError: Unexpected token near line 1 in {$language} compilation.",
                'exit_code' => 1,
                'time_ms' => 12.5,
                'memory_kb' => 15400,
            ];
        }

        // Simulated Time Limit Exceeded
        if (str_contains($sourceCode, '// SIMULATE_TIMEOUT') || str_contains($sourceCode, '# SIMULATE_TIMEOUT') || str_contains($sourceCode, 'while(true)') || str_contains($sourceCode, 'while true:')) {
            return [
                'status' => 'TIMEOUT',
                'stdout' => '',
                'stderr' => "Execution timed out. Exceeded maximum allowed CPU time ({$cpuLimit}s).",
                'exit_code' => 124,
                'time_ms' => ($cpuLimit * 1000) + 50,
                'memory_kb' => 24500,
            ];
        }

        // Simulated Memory Limit Exceeded
        if (str_contains($sourceCode, '// SIMULATE_MEMORY_LIMIT') || str_contains($sourceCode, '# SIMULATE_MEMORY_LIMIT')) {
            return [
                'status' => 'MEMORY_EXCEEDED',
                'stdout' => '',
                'stderr' => "Out of Memory. Allocated memory exceeded limit ({$memoryLimitMb}MB).",
                'exit_code' => 137,
                'time_ms' => 450.0,
                'memory_kb' => ($memoryLimitMb * 1024) + 1024,
            ];
        }

        // Simulated Runtime Error
        if (str_contains($sourceCode, '// SIMULATE_RUNTIME_ERROR') || str_contains($sourceCode, 'throw new Exception') || str_contains($sourceCode, 'raise Exception')) {
            return [
                'status' => 'RUNTIME_ERROR',
                'stdout' => '',
                'stderr' => "Fatal Error: Uncaught Exception in candidate submission.",
                'exit_code' => 255,
                'time_ms' => 28.0,
                'memory_kb' => 18200,
            ];
        }

        // Deterministic simulation for common programming logic problems
        $simulatedOutput = $this->simulateDeterministicOutput($language, $sourceCode, $stdin);

        return [
            'status' => 'SUCCESS',
            'stdout' => $simulatedOutput,
            'stderr' => '',
            'exit_code' => 0,
            'time_ms' => 48.2,
            'memory_kb' => 21450,
        ];
    }

    /**
     * Evaluate submission across all test cases.
     */
    public function evaluateSubmission(string $language, string $sourceCode, array $testCases, array $limits = []): array
    {
        $results = [];
        $passedCount = 0;
        $totalCount = count($testCases);

        foreach ($testCases as $idx => $testCase) {
            $input = $testCase['input'] ?? '';
            $expected = trim($testCase['expected_output'] ?? '');
            $isHidden = !empty($testCase['is_hidden']);

            $exec = $this->execute($language, $sourceCode, $input, $limits);

            $actualOutput = trim($exec['stdout']);
            $isMatch = ($exec['status'] === 'SUCCESS') && ($actualOutput === $expected || $this->fuzzyMatch($actualOutput, $expected, $sourceCode));

            if ($isMatch) {
                $passedCount++;
            }

            $testCaseResult = [
                'test_case_number' => $idx + 1,
                'is_hidden' => $isHidden,
                'passed' => $isMatch,
                'status' => $isMatch ? 'PASSED' : $exec['status'],
                'execution_time_ms' => $exec['time_ms'],
                'memory_kb' => $exec['memory_kb'],
            ];

            // Only expose detailed stdin/stdout for non-hidden sample test cases
            if (!$isHidden) {
                $testCaseResult['input'] = $input;
                $testCaseResult['expected_output'] = $expected;
                $testCaseResult['actual_output'] = $actualOutput;
                $testCaseResult['stderr'] = $exec['stderr'];
            }

            $results[] = $testCaseResult;

            // Fail fast on compilation error
            if ($exec['status'] === 'COMPILE_ERROR') {
                break;
            }
        }

        $passPercentage = $totalCount > 0 ? (float) round(($passedCount / $totalCount) * 100, 2) : 0.0;
        $allPassed = ($passedCount === $totalCount) && ($totalCount > 0);

        return [
            'adapter' => $this->getAdapterName(),
            'is_simulated' => true,
            'status' => $allPassed ? 'ALL_TESTS_PASSED' : ($passedCount > 0 ? 'PARTIAL_PASS' : 'FAILED'),
            'passed_test_cases' => $passedCount,
            'total_test_cases' => $totalCount,
            'pass_percentage' => $passPercentage,
            'test_case_results' => $results,
        ];
    }

    public function getAdapterName(): string
    {
        return 'mock';
    }

    public function isAvailable(): bool
    {
        return true;
    }

    /**
     * Deterministic output simulation for standard algorithm questions.
     */
    protected function simulateDeterministicOutput(string $language, string $sourceCode, string $stdin): string
    {
        $input = trim($stdin);

        // Sum problem: e.g. "2 3" -> "5" or "10 20" -> "30"
        if (preg_match('/^(\-?\d+)\s+(\-?\d+)$/', $input, $m)) {
            return (string) ((int) $m[1] + (int) $m[2]);
        }

        // Array sum / comma separated numbers: e.g. "1, 2, 3, 4" -> "10"
        if (preg_match('/^[\d\s,]+$/', $input) && str_contains($input, ',')) {
            $nums = array_map('intval', explode(',', $input));
            return (string) array_sum($nums);
        }

        // Reverse String: e.g. "campuslink" -> "knilsupmac"
        if (str_contains(strtolower($sourceCode), 'reverse') || str_contains(strtolower($sourceCode), 'strrev')) {
            return strrev($input);
        }

        // Factorial: single integer e.g. "5" -> "120"
        if (ctype_digit($input) && (int) $input <= 12 && (str_contains(strtolower($sourceCode), 'factorial') || str_contains(strtolower($sourceCode), 'fact'))) {
            $n = (int) $input;
            $res = 1;
            for ($i = 2; $i <= $n; $i++) $res *= $i;
            return (string) $res;
        }

        // Echo / Identity fallback
        return $input;
    }

    /**
     * Fuzzy matching for candidate outputs where code contains appropriate logic structure.
     */
    protected function fuzzyMatch(string $actual, string $expected, string $sourceCode): bool
    {
        if (empty($expected)) return true;
        if (strcasecmp($actual, $expected) === 0) return true;

        // If candidate submitted a clean non-empty function and it returned expected
        return !empty($sourceCode) && strlen($sourceCode) > 20 && $actual === $expected;
    }
}
