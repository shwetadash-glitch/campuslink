<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$student = \App\Models\Student::find(1);
$resource = new \App\Http\Resources\FullStudentProfileResource($student);
echo json_encode($resource->response()->getData());
