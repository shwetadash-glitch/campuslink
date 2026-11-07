<?php

namespace App\Services\Sandbox;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Judge0SandboxAdapter implements CodeSandboxInterface
{
    protected string $apiUrl;
    protected ?string $apiKey;
    protected ?string $apiHost;
    protected bool $liveEnabled;

    /**
     * Map of common language identifiers to Judge0 language IDs.
     */
    protected array $languageMap = [
        'php' => 68,        // PHP 8.1+
        'python' => 71,     // Python 3.8+
        'javascript' => 63, // Node.js
        'cpp' => 54,        // C++ (GCC 9.2.0)
        'java' => 62,       // Java (OpenJDK 13)
        'c' => 50,          // C (GCC 9.2.0)
    ];

    public function __construct(
        ?string $apiUrl = null,
        ?string $apiKey = null,
        ?string $apiHost = null,
        bool $liveEnabled = false
    ) {
        $this->apiUrl = rtrim($apiUrl ?: config('services.judge0.url', 'http://localhost:2358'), '/');
        $this->apiKey = $apiKey ?: config('services.judge0.key', null);
        $this->apiHost = $apiHost ?: config('services.judge0.host', null);
        $this->liveEnabled = $liveEnabled ?: config('services.judge0.live_enabled', false);
    }

    /**
     * Execute code in Judge0 sandbox.
     * Enforces CPU limits (default 2.0s), Memory limits (default 128MB), Wall-clock (5.0s),
     * and network isolation.
     */
    public function execute(string $language, string $sourceCode, string $stdin, array $limits = []): array
    {
        // Strict Security Guard: Live submissions are disabled by default
        if (!$this->isLiveEnabled()) {
            throw new \RuntimeException("CRITICAL: Live Judge0 execution is disabled. Candidate source code is held locally until live sandbox authorization is approved.");
        }

        $languageId = $this->resolveLanguageId($language);
        $cpuTimeLimit = (float) ($limits['cpu_time_limit'] ?? 2.0);
        $memoryLimitKb = (int) (($limits['memory_limit_mb'] ?? 128) * 1024);
        $wallTimeLimit = (float) ($limits['wall_time_limit'] ?? 5.0);

        $payload = [
            'language_id' => $languageId,
            'source_code' => base64_encode($sourceCode),
            'stdin' => base64_encode($stdin),
            'cpu_time_limit' => $cpuTimeLimit,
            'memory_limit' => $memoryLimitKb,
            'wall_time_limit' => $wallTimeLimit,
            'enable_network' => false, // Strictly block all network egress
        ];

        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if ($this->apiKey) {
            $headers['X-RapidAPI-Key'] = $this->apiKey;
            if ($this->apiHost) {
                $headers['X-RapidAPI-Host'] = $this->apiHost;
            }
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout((int) ceil($wallTimeLimit + 3))
                ->post("{$this->apiUrl}/submissions?base64_encoded=true&wait=true", $payload);

            if (!$response->successful()) {
                Log::error("Judge0 API returned error: " . $response->body());
                return [
                    'status' => 'RUNTIME_ERROR',
                    'stdout' => '',
                    'stderr' => 'Judge0 sandbox service rejected execution request.',
                    'exit_code' => 1,
                    'time_ms' => 0,
                    'memory_kb' => 0,
                ];
            }

            $data = $response->json();
            $statusId = $data['status']['id'] ?? 0;
            $statusDescription = $data['status']['description'] ?? 'Unknown';

            $stdout = !empty($data['stdout']) ? base64_decode($data['stdout']) : '';
            $stderr = !empty($data['stderr']) ? base64_decode($data['stderr']) : (!empty($data['compile_output']) ? base64_decode($data['compile_output']) : '');
            $timeMs = (float) ($data['time'] ?? 0) * 1000;
            $memoryKb = (int) ($data['memory'] ?? 0);
            $exitCode = (int) ($data['exit_code'] ?? ($statusId === 3 ? 0 : 1));

            $mappedStatus = match ($statusId) {
                3 => 'SUCCESS',               // Accepted
                4 => 'FAILED',                // Wrong Answer
                5 => 'TIMEOUT',               // Time Limit Exceeded
                6 => 'COMPILE_ERROR',         // Compilation Error
                11 => 'RUNTIME_ERROR',        // Runtime Error (NZEC)
                12 => 'MEMORY_EXCEEDED',      // Other Runtime Error / Memory
                default => 'RUNTIME_ERROR',
            };

            return [
                'status' => $mappedStatus,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'exit_code' => $exitCode,
                'time_ms' => $timeMs,
                'memory_kb' => $memoryKb,
            ];
        } catch (\Exception $e) {
            Log::error("Judge0 execution exception: " . $e->getMessage());
            throw new \RuntimeException("Judge0 sandbox connection failed: " . $e->getMessage(), 0, $e);
        }
    }

    public function evaluateSubmission(string $language, string $sourceCode, array $testCases, array $limits = []): array
    {
        if (!$this->isLiveEnabled()) {
            throw new \RuntimeException("CRITICAL: Live Judge0 execution is disabled.");
        }

        $results = [];
        $passedCount = 0;
        $totalCount = count($testCases);

        foreach ($testCases as $idx => $tc) {
            $input = $tc['input'] ?? '';
            $expected = trim($tc['expected_output'] ?? '');
            $isHidden = !empty($tc['is_hidden']);

            $exec = $this->execute($language, $sourceCode, $input, $limits);
            $actual = trim($exec['stdout']);
            $isMatch = ($exec['status'] === 'SUCCESS') && ($actual === $expected);

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

            if (!$isHidden) {
                $testCaseResult['input'] = $input;
                $testCaseResult['expected_output'] = $expected;
                $testCaseResult['actual_output'] = $actual;
                $testCaseResult['stderr'] = $exec['stderr'];
            }

            $results[] = $testCaseResult;

            if ($exec['status'] === 'COMPILE_ERROR') {
                break;
            }
        }

        $passPercentage = $totalCount > 0 ? (float) round(($passedCount / $totalCount) * 100, 2) : 0.0;
        $allPassed = ($passedCount === $totalCount) && ($totalCount > 0);

        return [
            'adapter' => $this->getAdapterName(),
            'is_simulated' => false,
            'status' => $allPassed ? 'ALL_TESTS_PASSED' : ($passedCount > 0 ? 'PARTIAL_PASS' : 'FAILED'),
            'passed_test_cases' => $passedCount,
            'total_test_cases' => $totalCount,
            'pass_percentage' => $passPercentage,
            'test_case_results' => $results,
        ];
    }

    public function getAdapterName(): string
    {
        return 'judge0';
    }

    public function isAvailable(): bool
    {
        return $this->liveEnabled;
    }

    public function isLiveEnabled(): bool
    {
        return $this->liveEnabled;
    }

    protected function resolveLanguageId(string $language): int
    {
        $lang = strtolower(trim($language));
        return $this->languageMap[$lang] ?? 68; // Default PHP
    }
}
