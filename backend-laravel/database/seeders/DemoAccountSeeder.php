<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Student;
use App\Models\Company;
use App\Models\Recruiter;
use App\Enums\UserRole;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DemoAccountSeeder extends Seeder
{
    /**
     * Run the database seeds for standard demo accounts.
     * Safe and repeatable: uses updateOrCreate / firstOrCreate to prevent duplicates
     * and only targets the 4 designated demo accounts (preserving all real user accounts).
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('CRITICAL: DemoAccountSeeder cannot be executed in production environments.');
        }

        DB::transaction(function () {
            // 1. Student Demo Account
            $studentUser = User::firstOrCreate(
                ['email' => 'student1@college.edu'],
                [
                    'role' => UserRole::STUDENT->value,
                    'is_active' => true,
                    'password_hash' => Hash::make('password'),
                ]
            );
            $studentUser->update([
                'role' => UserRole::STUDENT->value,
                'is_active' => true,
                'password_hash' => Hash::make('password'),
            ]);

            if (!$studentUser->studentProfile) {
                Student::create([
                    'user_id' => $studentUser->id,
                    'student_identifier' => 'STU' . str_pad($studentUser->id, 4, '0', STR_PAD_LEFT),
                    'first_name' => 'Demo',
                    'last_name' => 'Student',
                    'branch' => 'Computer Science',
                    'graduation_year' => (int)date('Y') + 1,
                    'cgpa' => 8.0,
                ]);
            }

            // 2. Recruiter Demo Account
            $recruiterUser = User::firstOrCreate(
                ['email' => 'recruiter1@comp1.com'],
                [
                    'role' => UserRole::RECRUITER->value,
                    'is_active' => true,
                    'password_hash' => Hash::make('password'),
                ]
            );
            $recruiterUser->update([
                'role' => UserRole::RECRUITER->value,
                'is_active' => true,
                'password_hash' => Hash::make('password'),
            ]);

            if (!$recruiterUser->recruiterProfile) {
                $company = Company::firstOrCreate(
                    ['name' => 'Tech Corp'],
                    [
                        'industry' => 'Information Technology',
                        'size' => '51-200',
                        'description' => 'Enterprise technology solutions and campus recruitment partner.',
                    ]
                );

                Recruiter::create([
                    'user_id' => $recruiterUser->id,
                    'company_id' => $company->id,
                    'contact_name' => 'Demo Recruiter',
                    'contact_email' => 'recruiter1@comp1.com',
                ]);
            }

            // 3. Admin Demo Account
            $adminUser = User::firstOrCreate(
                ['email' => 'admin@campuslink.com'],
                [
                    'role' => UserRole::SUPER_ADMIN->value,
                    'is_active' => true,
                    'password_hash' => Hash::make('password'),
                ]
            );
            $adminUser->update([
                'role' => UserRole::SUPER_ADMIN->value,
                'is_active' => true,
                'password_hash' => Hash::make('password'),
            ]);

            // 4. TPO (Placement Officer) Demo Accounts
            // Ensure po@campuslink.com exists as shown on frontend login page
            $poUser = User::firstOrCreate(
                ['email' => 'po@campuslink.com'],
                [
                    'role' => UserRole::PLACEMENT_OFFICER->value,
                    'is_active' => true,
                    'password_hash' => Hash::make('password'),
                ]
            );
            $poUser->update([
                'role' => UserRole::PLACEMENT_OFFICER->value,
                'is_active' => true,
                'password_hash' => Hash::make('password'),
            ]);

            // Also support officer@campuslink.com if present in legacy seeders
            $legacyOfficer = User::where('email', 'officer@campuslink.com')->first();
            if ($legacyOfficer) {
                $legacyOfficer->update([
                    'role' => UserRole::PLACEMENT_OFFICER->value,
                    'is_active' => true,
                    'password_hash' => Hash::make('password'),
                ]);
            }
        });
    }
}
