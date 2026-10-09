<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('email', 'po@campuslink.com')->first();
if ($user && \Illuminate\Support\Facades\Hash::check('officer123', $user->password_hash)) {
    echo "Matches officer123";
} elseif ($user && \Illuminate\Support\Facades\Hash::check('admin123', $user->password_hash)) {
    echo "Matches admin123";
} elseif ($user && \Illuminate\Support\Facades\Hash::check('password', $user->password_hash)) {
    echo "Matches password";
} else {
    echo "Unknown";
}
