<?php
$ollamaUrl = env('OLLAMA_URL', 'http://172.20.216.88:11434');
$ollamaModel = env('OLLAMA_MODEL', 'llama3.2');
$systemPrompt = "You are an AI assistant. I will provide students with their stats and IDs. For EACH student, write EXACTLY 1 short sentence justifying their tier. Output MUST be valid JSON where the keys are the EXACT numeric student IDs provided, and the values are the 1-sentence justifications. Example: {\"123\": \"Justification here\"}.";
$batchContext = "ID: 100 | Student Alice. Score: 80. Eligible: Yes. Missing: Docker. Matched: React. Tier: HIGHLY_EMPLOYABLE.\nID: 105 | Student Bob. Score: 40. Eligible: No. Missing: Java. Matched: . Tier: NOT_READY.";
$response = Http::timeout(10)->post($ollamaUrl . '/api/chat', [
    'model' => $ollamaModel,
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $batchContext]
    ],
    'stream' => false,
    'format' => 'json'
]);
echo "Status: " . $response->status() . "\n";
echo "Content: " . $response->json('message.content') . "\n";
