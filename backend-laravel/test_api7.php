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
foreach ($data['candidates'] as $c) {
    if (round($c['readiness_score']) == 82 || round($c['readiness_score']) == 83) {
        echo json_encode([
            'id' => $c['student_id'],
            'identifier' => $c['student_identifier'],
            'name' => $c['student_name'],
            'branch' => $c['branch'],
            'cgpa' => $c['cgpa'],
            'readiness_score' => $c['readiness_score'],
            'is_eligible' => $c['is_eligible'],
            'tier' => $c['tier']
        ], JSON_PRETTY_PRINT) . PHP_EOL;
    }
}

