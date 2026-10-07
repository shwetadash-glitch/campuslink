<?php
$user = \App\Models\User::where('role', 'PLACEMENT_OFFICER')->first();
$token = $user->createToken('test')->plainTextToken;
$response = Http::timeout(10)->withToken($token)->get('http://127.0.0.1:8001/api/v1/officer/drives/1/ai-shortlist?limit=100');
$data = $response->json();
echo 'Total Candidates: ' . ($data['total'] ?? 'N/A') . PHP_EOL;
if (isset($data['candidates']) && is_array($data['candidates'])) {
    foreach (array_slice($data['candidates'], 0, 5) as $c) {
        echo 'Candidate ' . $c['student_identifier'] . ' -> Score: ' . $c['readiness_score'] . ' | Tier: ' . $c['tier'] . PHP_EOL;
    }
} else {
    echo 'No candidates or malformed response: ' . $response->body() . PHP_EOL;
}

