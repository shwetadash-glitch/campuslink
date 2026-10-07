<?php
namespace App\Console\Commands;
use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ResetPO extends Command
{
    protected $signature = 'app:reset-po';
    public function handle()
    {
        $user = User::where('email', 'po@campuslink.com')->first();
        if ($user) {
            $user->password_hash = Hash::make('password');
            $user->save();
            $this->info("Password updated successfully for PO.");
        }
    }
}
