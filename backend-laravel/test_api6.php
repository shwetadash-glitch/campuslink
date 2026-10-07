<?php
$request = \Illuminate\Http\Request::create('/api/v1/officer/drives/1/ai-shortlist', 'GET', ['limit' => 100]);
$controller = app()->make(\App\Http\Controllers\Api\OfficerController::class);
$response = $controller->aiShortlist(
    $request,
    1,
    app()->make(\App\Services\EligibilityService::class),
    app()->make(\App\Services\SkillGapService::class),
    app()->make(\App\Services\ReadinessScoringService::class)
);
$data = $response->getData(true);
echo 'Total Candidates: ' . ($data['total'] ?? 'N/A') . PHP_EOL;
foreach (array_slice($data['candidates'], 0, 5) as $c) {
    echo 'Candidate ' . $c['student_identifier'] . ' -> Score: ' . $c['readiness_score'] . ' | Tier: ' . $c['tier'] . PHP_EOL;
}

