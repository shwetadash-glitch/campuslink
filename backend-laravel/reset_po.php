<?php
$user = App\Models\User::where('email', 'po@campuslink.com')->first();
if ($user) {
    $user->password_hash = Hash::make('password');
    $user->save();
    echo "Password updated successfully for PO.\n";
} else {
    echo "PO user not found.\n";
}
