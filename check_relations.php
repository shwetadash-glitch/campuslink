<?php
require __DIR__ . '/backend-laravel/vendor/autoload.php';
$app = require_once __DIR__ . '/backend-laravel/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$s = \App\Models\Student::with(['academicHistories', 'projects', 'skills.skill'])->first();
print_r($s->toArray());
