<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$text = file_get_contents('dummy_resume.txt');
$prompt = "You are a highly accurate AI resume parser. Extract the following information from the provided resume text and format it STRICTLY as a JSON object with no markdown wrappers, no backticks, and no extra text.\nThe JSON must follow this exact schema:\n{\n  \"bio\": \"A concise 2-sentence summary...\",\n  \"cgpa\": 9.0,\n  \"skills\": [\"Python\", \"React\"],\n  \"projects\": [\n    { \"title\": \"Project Name\", \"description\": \"Brief project description\" }\n  ]\n}\n\nRESUME TEXT:\n" . $text;
$response = \Illuminate\Support\Facades\Http::timeout(120)->post(env('OLLAMA_URL', 'http://localhost:11434') . '/api/generate', [
    'model' => env('OLLAMA_MODEL', 'llama3.2'),
    'prompt' => $prompt,
    'stream' => false,
    'format' => 'json'
]);
echo $response->body();
