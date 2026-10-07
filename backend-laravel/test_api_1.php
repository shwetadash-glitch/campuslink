<?php
$request = \Illuminate\Http\Request::create('/api/v1/officer/drives/1/ai-shortlist', 'GET', ['limit' => 1]);
$controller = app()->make(\App\Http\Controllers\Api\OfficerController::class);
$response = $controller->aiShortlist(
    $request,
    1,
    app()->make(\App\Services\EligibilityService::class),
    app()->make(\App\Services\SkillGapService::class),
    app()->make(\App\Services\ReadinessScoringService::class)
);
$data = $response->getData(true);
echo 'Justification: ' . ($data['candidates'][0]['justification'] ?? 'N/A') . PHP_EOL;

