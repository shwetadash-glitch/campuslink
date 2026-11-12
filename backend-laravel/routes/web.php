<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/students/{id}/resume/download', [\App\Http\Controllers\Api\StudentController::class, 'downloadResume']);
Route::get('/api/v1/students/{id}/resume/download', [\App\Http\Controllers\Api\StudentController::class, 'downloadResume']);

