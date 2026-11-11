<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoAccountSeeder;

class DemoSeederProductionGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_account_seeder_refuses_execution_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('CRITICAL: DemoAccountSeeder cannot be executed in production environments.');

        $seeder = new DemoAccountSeeder();
        $seeder->run();
    }

    public function test_database_seeder_skips_demo_accounts_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $seeder = new DatabaseSeeder();
        $seeder->run();

        $this->assertDatabaseMissing('users', ['email' => 'student1@college.edu']);
        $this->assertDatabaseMissing('users', ['email' => 'recruiter1@comp1.com']);
        $this->assertDatabaseMissing('users', ['email' => 'po@campuslink.com']);
    }
}
