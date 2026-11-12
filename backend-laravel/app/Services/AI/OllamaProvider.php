<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OllamaProvider implements AiProviderInterface
{
    protected string $baseUrl;
    protected string $model;
    protected int $timeout;

    public function __construct(?string $baseUrl = null, ?string $model = null, ?int $timeout = null)
    {
        $this->baseUrl = rtrim($baseUrl ?: config('services.ollama.url', 'http://localhost:11434'), '/');
        $this->model = $model ?: config('services.ollama.model', 'llama3.2');
        $this->timeout = $timeout ?: (int) config('services.ollama.timeout', 30);
    }

    public function chat(array $messages, array $options = []): array
    {
        $formattedMessages = [];
        foreach ($messages as $msg) {
            $role = ($msg['role'] ?? '') === 'ai' ? 'assistant' : ($msg['role'] ?? 'user');
            $formattedMessages[] = [
                'role' => $role,
                'content' => $msg['content'] ?? '',
            ];
        }

        $url = $this->baseUrl . '/api/chat';
        $payload = [
            'model' => $options['model'] ?? $this->model,
            'messages' => $formattedMessages,
            'stream' => false,
        ];

        if (!empty($options['format'])) {
            $payload['format'] = $options['format'];
        }

        try {
            $timeout = (int) ($options['timeout'] ?? $this->timeout);
            $response = Http::timeout($timeout)->post($url, $payload);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['message']['content'] ?? '';

                return [
                    'role' => 'ai',
                    'content' => $content,
                    'metadata' => [
                        'provider' => 'ollama',
                        'model' => $this->model,
                        'total_duration' => $data['total_duration'] ?? null,
                    ]
                ];
            }

            Log::error("Ollama API responded with HTTP error: " . $response->status(), [
                'body' => $response->body()
            ]);
            throw new \RuntimeException("Ollama API returned HTTP " . $response->status() . ": " . $response->body());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error("Ollama chat connection failed: " . $e->getMessage());
            throw new \RuntimeException("Unable to connect to Ollama at {$this->baseUrl}. Please verify that the Ollama service is running.", 0, $e);
        } catch (\Exception $e) {
            Log::error("Ollama chat request failed: " . $e->getMessage());
            throw $e;
        }
    }

    public function generate(string $prompt, ?array $jsonSchema = null, array $options = []): array|string
    {
        $url = $this->baseUrl . '/api/generate';
        $payload = [
            'model' => $options['model'] ?? $this->model,
            'prompt' => $prompt,
            'stream' => false,
        ];

        if ($jsonSchema !== null || ($options['format'] ?? null) === 'json') {
            $payload['format'] = 'json';
        }

        try {
            $timeout = (int) ($options['timeout'] ?? $this->timeout);
            $response = Http::timeout($timeout)->post($url, $payload);

            if ($response->successful()) {
                $raw = $response->json('response');
                if ($jsonSchema !== null || ($options['format'] ?? null) === 'json') {
                    $cleaned = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', trim($raw));
                    $decoded = json_decode($cleaned, true);
                    if ($decoded === null) {
                        // Attempt to extract JSON block if there was commentary around it
                        if (preg_match('/(\{.*\}|\[.*\])/s', $cleaned, $matches)) {
                            $decoded = json_decode($matches[1], true);
                        }
                    }
                    if ($decoded === null) {
                        throw new \RuntimeException("Ollama returned invalid JSON response: " . substr($raw, 0, 500));
                    }
                    return $decoded;
                }
                return $raw;
            }

            throw new \RuntimeException("Ollama generate failed with HTTP " . $response->status() . ": " . $response->body());
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error("Ollama generate connection failed: " . $e->getMessage());
            throw new \RuntimeException("Unable to connect to Ollama at {$this->baseUrl}. Please verify that the Ollama service is running.", 0, $e);
        } catch (\Exception $e) {
            Log::error("Ollama generate request failed: " . $e->getMessage());
            throw $e;
        }
    }

    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(2)->get($this->baseUrl . '/api/tags');
            return $response->successful();
        } catch (\Exception) {
            return false;
        }
    }

    public function getProviderName(): string
    {
        return 'ollama';
    }
}
