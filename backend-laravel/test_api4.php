<?php
$user = \App\Models\User::where('role', 'PLACEMENT_OFFICER')->first();
$token = $user->createToken('test')->plainTextToken;
$response = Http::timeout(5)->withToken($token)->get('http://127.0.0.1:8001/api/v1/officer/drives/1/ai-shortlist?limit=1');
echo $response->body();

