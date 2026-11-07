<?php

namespace App\Services\AI;

interface AiProviderInterface
{
    /**
     * Conduct multi-turn chat completion.
     *
     * @param array<int, array{role: string, content: string}> $messages
     * @param array<string, mixed> $options
     * @return array{role: string, content: string, metadata?: array}
     */
    public function chat(array $messages, array $options = []): array;

    /**
     * Generate structured or freeform output from a prompt.
     *
     * @param string $prompt
     * @param array<string, mixed>|null $jsonSchema
     * @param array<string, mixed> $options
     * @return array<string, mixed>|string
     */
    public function generate(string $prompt, ?array $jsonSchema = null, array $options = []): array|string;

    /**
     * Check whether the provider endpoint is healthy and reachable.
     */
    public function isAvailable(): bool;

    /**
     * Get the descriptive name of the provider.
     */
    public function getProviderName(): string;
}
