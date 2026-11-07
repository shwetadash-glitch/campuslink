<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Student;
use App\Models\Offer;
use App\Models\DriveCandidate;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveSchedule;
use App\Enums\UserRole;
use App\Enums\OfferStatus;
use App\Enums\OfferVerificationStatus;
use App\Enums\DriveStatus;
use App\Services\Analytics\InstitutionalAnalyticsService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PostgreSqlInstitutionalAnalyticsTest extends TestCase
{
    protected $conn;
    protected InstitutionalAnalyticsService $analyticsService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->conn = DB::connection('pgsql_test');

        // Confirm genuine PostgreSQL database engine
        $version = $this->conn->select('SELECT version() AS ver')[0]->ver;
        $this->assertStringContainsString('PostgreSQL', $version);

        // Truncate test tables
        $this->conn->statement('TRUNCATE emergency_clearances, drive_candidate_status_histories, drive_candidates, drive_rounds, drive_schedules, placement_drives, offers, offer_documents, offer_verification_histories, students, users CASCADE');

        $this->analyticsService = app(InstitutionalAnalyticsService::class);
        $this->analyticsService->setConnection('pgsql_test');
    }

    /**
     * Test institutional analytics aggregations on real PostgreSQL database.
     */
    public function test_postgresql_analytics_overview_and_aggregations(): void
    {
        // 1. Create Users & Students in pgsql_test
        $user1Id = $this->conn->table('users')->insertGetId([
            'email' => 'pg_student1@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $student1Id = $this->conn->table('students')->insertGetId([
            'user_id' => $user1Id,
            'student_identifier' => 'PG-STU-001',
            'first_name' => 'Aditya',
            'last_name' => 'Varma',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.75,
            'backlogs_current' => 0,
            'backlogs_history' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user2Id = $this->conn->table('users')->insertGetId([
            'email' => 'pg_student2@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $student2Id = $this->conn->table('students')->insertGetId([
            'user_id' => $user2Id,
            'student_identifier' => 'PG-STU-002',
            'first_name' => 'Pooja',
            'last_name' => 'Nair',
            'branch' => 'Electronics and Communication Engineering',
            'graduation_year' => 2026,
            'cgpa' => 5.50, // Ineligible due to CGPA < 6.0
            'backlogs_current' => 0,
            'backlogs_history' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user3Id = $this->conn->table('users')->insertGetId([
            'email' => 'pg_student3@campuslink.edu',
            'password_hash' => bcrypt('Pass123!'),
            'role' => UserRole::STUDENT->value,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $student3Id = $this->conn->table('students')->insertGetId([
            'user_id' => $user3Id,
            'student_identifier' => 'PG-STU-003',
            'first_name' => 'Rahul',
            'last_name' => 'Verma',
            'branch' => 'Computer Science and Engineering',
            'graduation_year' => 2026,
            'cgpa' => 8.20,
            'backlogs_current' => 1, // Ineligible due to backlogs
            'backlogs_history' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create Company, Job, and Placement Drive
        $companyId = $this->conn->table('companies')->insertGetId([
            'name' => 'PostgreSQL Systems',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $jobId = $this->conn->table('jobs')->insertGetId([
            'company_id' => $companyId,
            'title' => 'Database Engineer',
            'description' => 'Database Engineer Role',
            'employment_type' => 'Full-time',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $driveId = $this->conn->table('placement_drives')->insertGetId([
            'company_id' => $companyId,
            'job_id' => $jobId,
            'name' => 'PG Tech Drive 2026',
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(4),
            'status' => DriveStatus::IN_PROGRESS->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Register drive candidates
        // Student 1 (eligible): registered
        $this->conn->table('drive_candidates')->insert([
            'drive_id' => $driveId,
            'student_id' => $student1Id,
            'status' => 'SHORTLISTED',
            'current_round_number' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 4. Create Offers
        // Student 1 (eligible): verified + accepted offer (CTC = 18.5)
        $this->conn->table('offers')->insert([
            'student_id' => $student1Id,
            'placement_drive_id' => $driveId,
            'company_name' => 'PostgreSQL Systems',
            'designation' => 'Database Engineer',
            'ctc' => 18.5,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Student 2 (ineligible): verified + accepted offer (CTC = 12.0)
        $this->conn->table('offers')->insert([
            'student_id' => $student2Id,
            'placement_drive_id' => $driveId,
            'company_name' => 'PostgreSQL Systems',
            'designation' => 'Junior Database Engineer',
            'ctc' => 12.0,
            'status' => OfferStatus::ACCEPTED->value,
            'verification_status' => OfferVerificationStatus::VERIFIED->value,
            'offer_date' => now(),
            'acceptance_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Execute Institutional Overview
        $overview = $this->analyticsService->getOverview(2026);

        // Assertions
        $this->assertEquals(3, $overview['cohort']['total_students']);
        $this->assertEquals(1, $overview['cohort']['eligible_students']); // Only Student 1
        $this->assertEquals(2, $overview['cohort']['ineligible_students']);
        $this->assertEquals(1, $overview['cohort']['ineligibility_breakdown']['cgpa_ineligible']);
        $this->assertEquals(1, $overview['cohort']['ineligibility_breakdown']['backlog_ineligible']);

        // Participation
        $this->assertEquals(1, $overview['participation']['participating_students']);
        $this->assertEquals(100.0, $overview['participation']['participation_rate']);

        // Institutional Placement (restricted strictly to eligible cohort!)
        $this->assertEquals(1, $overview['placement']['placed_students']);
        $this->assertEquals(100.0, $overview['placement']['placement_rate']);
        $this->assertEquals(0, $overview['placement']['unplaced_students']);

        // Placements outside baseline eligibility
        $this->assertEquals(1, $overview['placements_outside_baseline_eligibility']['total_count']);
        $this->assertEquals('UNAVAILABLE', $overview['placements_outside_baseline_eligibility']['special_clearance_association']);

        // Compensation
        $this->assertEquals(18.5, $overview['compensation']['student_level_primary']['highest_ctc']);
        $this->assertEquals(18.5, $overview['compensation']['student_level_primary']['median_ctc']);

        // Test Placement Funnel on PostgreSQL
        $funnel = $this->analyticsService->getPlacementFunnel(2026);
        $this->assertCount(6, $funnel['stages']);
        $this->assertEquals(3, $funnel['stages'][0]['count']); // total_cohort
        $this->assertEquals(1, $funnel['stages'][1]['count']); // eligible_cohort
        $this->assertEquals(1, $funnel['stages'][5]['count']); // verified_placed

        // Test Compensation Analytics on PostgreSQL
        $comp = $this->analyticsService->getCompensationAnalytics(2026);
        $this->assertEquals(1, $comp['student_level_primary']['placed_students_count']);
        $this->assertEquals(18.5, $comp['student_level_primary']['average_ctc']);
    }
}
