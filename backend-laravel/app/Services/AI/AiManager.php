<?php

namespace App\Services\AI;

use App\Exceptions\AiServiceUnavailableException;
use Illuminate\Support\Facades\Log;

class AiManager
{
    protected ?AiProviderInterface $provider = null;
    protected string $environment;

    public function __construct(?string $environment = null)
    {
        $this->environment = $environment ?: config('app.env', 'production');
    }

    /**
     * Resolve the active AI provider based on configuration and environment constraints.
     */
    public function resolveProvider(): AiProviderInterface
    {
        if ($this->provider !== null) {
            return $this->provider;
        }

        $configuredProvider = env('AI_PROVIDER') ?: config('services.ai.provider', $this->environment === 'production' ? 'ollama' : 'mock');
        if (empty($configuredProvider)) {
            $configuredProvider = ($this->environment === 'production') ? 'ollama' : 'mock';
        }

        // Production Guard 1: Prevent accidental selection of MockAiProvider in production
        if ($this->environment === 'production' && $configuredProvider === 'mock') {
            throw new \RuntimeException("CRITICAL: MockAiProvider cannot be selected in production environments.");
        }

        // Production Guard 2: Require an explicit, non-localhost endpoint when Ollama is selected in production
        if ($this->environment === 'production' && $configuredProvider === 'ollama') {
            $ollamaUrl = config('services.ollama.url') ?: env('OLLAMA_URL');
            if (empty($ollamaUrl)) {
                throw new \RuntimeException("CRITICAL: OLLAMA_URL must be explicitly configured in production when Ollama provider is selected.");
            }
            $host = parse_url($ollamaUrl, PHP_URL_HOST);
            if ($host === 'localhost' || $host === '127.0.0.1' || str_starts_with($host, '172.20.') || str_starts_with($host, '192.168.')) {
                throw new \RuntimeException("CRITICAL: OLLAMA_URL cannot use localhost/127.0.0.1 or unroutable private IPs in production environments.");
            }
        }

        if ($configuredProvider === 'mock') {
            $this->provider = new MockAiProvider();
            return $this->provider;
        }

        if ($configuredProvider === 'ollama') {
            $url = config('services.ollama.url') ?: env('OLLAMA_URL', 'http://localhost:11434');
            $model = config('services.ollama.model') ?: env('OLLAMA_MODEL', 'llama3.2');
            $timeout = (int) (config('services.ollama.timeout') ?: env('AI_TIMEOUT_SECONDS', 30));
            $this->provider = new OllamaProvider($url, $model, $timeout);
            return $this->provider;
        }

        throw new \InvalidArgumentException("Unsupported AI provider configured: {$configuredProvider}");
    }

    /**
     * Set a custom provider instance (used for unit testing).
     */
    public function setProvider(AiProviderInterface $provider): void
    {
        $this->provider = $provider;
    }

    public function getProviderName(): string
    {
        return $this->resolveProvider()->getProviderName();
    }

    public function getModelName(): string
    {
        return config('services.ollama.model', 'llama3.2');
    }

    /**
     * Execute a chat completion with environment-aware failure handling.
     */
    public function chat(array $messages, array $options = []): array
    {
        $provider = $this->resolveProvider();

        try {
            return $provider->chat($messages, $options);
        } catch (\Exception $e) {
            Log::error("AI Chat failed on provider [{$provider->getProviderName()}]: " . $e->getMessage());

            if ($this->environment === 'production') {
                throw new AiServiceUnavailableException(
                    "The AI evaluation service is temporarily unavailable. Core operations continue uninterrupted.",
                    'chat',
                    30,
                    $e
                );
            }

            // In local/testing mode: report live provider failures honestly; do not silently mask with MockAiProvider
            throw new \RuntimeException(
                "Live AI Provider [{$provider->getProviderName()}] chat failed in {$this->environment} mode: " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Execute a prompt generation with environment-aware failure handling.
     */
    public function generate(string $prompt, ?array $jsonSchema = null, array $options = []): array|string
    {
        $provider = $this->resolveProvider();

        try {
            return $provider->generate($prompt, $jsonSchema, $options);
        } catch (\Exception $e) {
            Log::error("AI Generate failed on provider [{$provider->getProviderName()}]: " . $e->getMessage());

            if ($this->environment === 'production') {
                throw new AiServiceUnavailableException(
                    "The AI generation service is temporarily unavailable. Core operations continue uninterrupted.",
                    'generate',
                    30,
                    $e
                );
            }

            // In local/testing mode: report live provider failures honestly; do not silently mask with MockAiProvider
            throw new \RuntimeException(
                "Live AI Provider [{$provider->getProviderName()}] generate failed in {$this->environment} mode: " . $e->getMessage(),
                0,
                $e
            );
        }
    }
}
