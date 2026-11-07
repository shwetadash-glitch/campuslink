<?php

namespace App\Services;

use App\Models\Venue;
use App\Models\Student;
use App\Models\PlacementDrive;
use Illuminate\Support\Facades\DB;

class SchedulingLockManager
{
    /**
     * Acquire a pessimistic row-level lock on a venue to prevent concurrent double-bookings.
     */
    public function lockVenue(string|int|null $venueOrId): ?Venue
    {
        if (empty($venueOrId)) {
            return null;
        }

        if (is_numeric($venueOrId)) {
            return Venue::where('id', (int) $venueOrId)->lockForUpdate()->first();
        }

        // String venue name: ensure stable row exists, then lock for update
        $venue = Venue::firstOrCreate(
            ['name' => (string) $venueOrId],
            ['capacity' => 50, 'is_virtual' => false, 'is_active' => true]
        );

        return Venue::where('id', $venue->id)->lockForUpdate()->first();
    }

    /**
     * Acquire a pessimistic row-level lock on a student to prevent simultaneous overlapping interviews.
     */
    public function lockStudent(int|null $studentId): ?Student
    {
        if (empty($studentId)) {
            return null;
        }

        return Student::where('id', $studentId)->lockForUpdate()->first();
    }

    /**
     * Acquire a pessimistic lock on an interviewer ref using stable mutex row and PostgreSQL advisory lock.
     */
    public function lockInterviewer(?string $interviewerRef): void
    {
        if (empty($interviewerRef)) {
            return;
        }

        $resourceKey = 'interviewer:' . trim($interviewerRef);

        // 1. Stable table row lock for update (works across SQLite and PostgreSQL)
        DB::table('scheduling_resource_locks')->insertOrIgnore([
            'resource_key' => $resourceKey,
            'locked_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('scheduling_resource_locks')
            ->where('resource_key', $resourceKey)
            ->lockForUpdate()
            ->first();

        // 2. Native PostgreSQL transaction advisory lock if connected to pgsql
        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', [$resourceKey]);
        }
    }

    /**
     * Acquire a pessimistic row-level lock on a placement drive.
     */
    public function lockDrive(int|null $driveId): ?PlacementDrive
    {
        if (empty($driveId)) {
            return null;
        }

        return PlacementDrive::where('id', $driveId)->lockForUpdate()->first();
    }
}
