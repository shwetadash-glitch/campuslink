<?php
$file = 'app/Http/Controllers/Api/OfficerController.php';
$content = file_get_contents($file);

$search = <<<'EOD'
        try {
            $ollamaUrl = env('OLLAMA_URL');
            $ollamaModel = env('OLLAMA_MODEL', 'llama3.2');
            if ($ollamaUrl) {
                $batchContext = "";
                foreach ($results as $id => $data) {
                    $batchContext .= "ID: {$id} | " . $data['_context'] . "\n";
                }
                $systemPrompt = "You are an AI assistant. I will provide a list of students with their stats. For EACH student ID, write EXACTLY 1 short sentence justifying their tier based only on the provided stats. Output MUST be valid JSON in this exact format: {\"ID\": \"1-sentence justification\", \"ID2\": \"...\"}. Do NOT output anything other than JSON.";
                
                $response = Http::timeout(60)->post($ollamaUrl . '/api/chat', [
                    'model' => $ollamaModel,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $batchContext]
                    ],
                    'stream' => false,
                    'format' => 'json'
                ]);
                
                if ($response->successful()) {
                    $content = json_decode($response->json('message.content'), true);
                    if (is_array($content)) {
                        foreach ($content as $id => $justification) {
                            if (isset($results[$id])) {
                                $results[$id]['justification'] = is_string($justification) ? $justification : json_encode($justification);
                            }
                        }
                    }
                } else {
                    Log::error("Ollama AI Shortlist returned status: " . $response->status());
                }
            }
        } catch (\Exception $e) {
            Log::error("Ollama AI Shortlist failed: " . $e->getMessage());
        }
EOD;

$replace = <<<'EOD'
        $ollamaUrl = env('OLLAMA_URL');
        $ollamaModel = env('OLLAMA_MODEL', 'llama3.2');

        if ($ollamaUrl) {
            $chunks = array_chunk($results, 10, true);
            foreach ($chunks as $chunkIndex => $chunk) {
                try {
                    $batchContext = "";
                    foreach ($chunk as $id => $data) {
                        $batchContext .= "ID: {$id} | " . $data['_context'] . "\n";
                    }
                    $systemPrompt = "You are an AI assistant. I will provide a list of students with their stats. For EACH student ID, write EXACTLY 1 short sentence justifying their tier based only on the provided stats. Output MUST be valid JSON in this exact format: {\"ID\": \"1-sentence justification\", \"ID2\": \"...\"}. Do NOT output anything other than JSON.";
                    
                    $response = Http::timeout(60)->post($ollamaUrl . '/api/chat', [
                        'model' => $ollamaModel,
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $batchContext]
                        ],
                        'stream' => false,
                        'format' => 'json'
                    ]);
                    
                    if ($response->successful()) {
                        $content = json_decode($response->json('message.content'), true);
                        if (is_array($content)) {
                            foreach ($content as $id => $justification) {
                                if (isset($results[$id])) {
                                    $results[$id]['justification'] = is_string($justification) ? $justification : json_encode($justification);
                                }
                            }
                        }
                    } else {
                        Log::error("Ollama AI Shortlist batch {$chunkIndex} returned status: " . $response->status());
                    }
                } catch (\Exception $e) {
                    Log::error("Ollama AI Shortlist batch {$chunkIndex} failed: " . $e->getMessage());
                }
            }
        }
EOD;

if (strpos($content, '$chunks = array_chunk') === false) {
    $newContent = str_replace($search, $replace, $content);
    if ($newContent !== $content) {
        file_put_contents($file, $newContent);
        echo "Controller updated successfully.\n";
    } else {
        echo "Could not find the block to replace. The content may have changed.\n";
    }
} else {
    echo "Controller already contains the chunking logic.\n";
}
