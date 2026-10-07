<?php
$user = \App\Models\User::where('role', 'PLACEMENT_OFFICER')->first();
$token = $user->createToken('test')->plainTextToken;
$response = Http::timeout(120)->withToken($token)->get('http://127.0.0.1:8001/api/v1/officer/drives/1/ai-shortlist?limit=100');
$data = $response->json();
echo 'Total Candidates: ' . ($data['total'] ?? 'N/A') . PHP_EOL;
echo 'Sample Tier: ' . ($data['candidates'][0]['tier'] ?? 'N/A') . PHP_EOL;
echo 'Sample Justif: ' . ($data['candidates'][0]['justification'] ?? 'N/A') . PHP_EOL;

