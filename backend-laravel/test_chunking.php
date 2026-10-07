<?php
$request = \Illuminate\Http\Request::create('/api/v1/officer/drives/1/ai-shortlist', 'GET', ['limit' => 100]);
$controller = app()->make(\App\Http\Controllers\Api\OfficerController::class);

echo 'Starting AI Shortlist processing (50 candidates)...' . PHP_EOL;
$start = microtime(true);

$response = $controller->aiShortlist(
    $request,
    1,
    app()->make(\App\Services\EligibilityService::class),
    app()->make(\App\Services\SkillGapService::class),
    app()->make(\App\Services\ReadinessScoringService::class)
);

$end = microtime(true);
$data = $response->getData(true);
$candidates = $data['candidates'] ?? [];
$total = count($candidates);

$fallbackCount = 0;
$aiCount = 0;
$fallbackText = 'Student tier calculated based on readiness score and eligibility (AI currently unavailable).';

foreach ($candidates as $c) {
    if ($c['justification'] === $fallbackText) {
        $fallbackCount++;
    } else {
        $aiCount++;
    }
}

echo '----------------------------------------' . PHP_EOL;
echo 'Time taken: ' . round($end - $start, 2) . ' seconds' . PHP_EOL;
echo 'Total Candidates Returned: ' . $total . PHP_EOL;
echo 'AI Justifications Received: ' . $aiCount . PHP_EOL;
echo 'Fallback Justifications Used: ' . $fallbackCount . PHP_EOL;
echo '----------------------------------------' . PHP_EOL;

if ($total > 0) {
    echo 'Sample Output (First 3 candidates):' . PHP_EOL;
    foreach (array_slice($candidates, 0, 3) as $c) {
        echo '- ' . $c['student_name'] . ' (Score: ' . $c['readiness_score'] . ', Tier: ' . $c['tier'] . ')' . PHP_EOL;
        echo '  Justification: ' . $c['justification'] . PHP_EOL;
    }
}

