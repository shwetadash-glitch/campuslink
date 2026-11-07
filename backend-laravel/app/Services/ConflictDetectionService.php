<?php

namespace App\Services;

use App\Models\InstitutionalEvent;
use App\Models\PlacementDrive;
use App\Models\DriveRound;
use App\Models\DriveSchedule;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ConflictDetectionService
{
    /**
     * Comprehensive conflict evaluation for a proposed schedule slot.
     *
     * @param array $params [
     *    'start_time' => Carbon|string,
     *    'end_time' => Carbon|string,
     *    'venue' => string|null,
     *    'venue_id' => int|null,
     *    'drive_id' => int|null,
     *    'round_id' => int|null,
     *    'branches' => array|null,
     *    'student_ids' => array|null,
     *    'interviewer_ref' => string|null
     * ]
     * @return array Structure containing has_conflict, has_hard_blackout, conflicts, and alternative_slots
     */
    public function detectConflicts(array $params): array
    {
        $startTime = Carbon::parse($params['start_time']);
        $endTime = Carbon::parse($params['end_time']);
        $venue = $params['venue'] ?? null;
        $venueId = $params['venue_id'] ?? null;
        $driveId = $params['drive_id'] ?? null;
        $roundId = $params['round_id'] ?? null;
        $scheduleId = $params['schedule_id'] ?? null;
        $branches = $params['branches'] ?? ['ALL'];
        $studentIds = $params['student_ids'] ?? [];
        $interviewerRef = $params['interviewer_ref'] ?? null;

        $conflicts = [];
        $hasHardBlackout = false;

        // 1. Check Academic & Institutional Blackout Overlaps
        $institutionalEvents = InstitutionalEvent::overlapping($startTime, $endTime)->get();
        foreach ($institutionalEvents as $event) {
            $isBranchAffected = false;
            foreach ($branches as $branch) {
                if ($event->affectsBranch($branch)) {
                    $isBranchAffected = true;
                    break;
                }
            }

            if ($isBranchAffected) {
                $isHard = (bool) $event->is_hard_blackout;
                if ($isHard) {
                    $hasHardBlackout = true;
                }

                $severity = $isHard ? 'CRITICAL' : 'WARNING';
                $conflictType = ($event->event_type === 'EXAMINATION')
                    ? 'ACADEMIC_EXAMINATION_COLLISION'
                    : 'INSTITUTIONAL_BLACKOUT';

                $conflicts[] = [
                    'conflict_type' => $conflictType,
                    'severity' => $severity,
                    'is_hard_blackout' => $isHard,
                    'message' => "Schedule overlaps with institutional event: \"{$event->title}\" ({$event->event_type}) from {$event->start_time->format('M d, H:i')} to {$event->end_time->format('H:i')}.",
                    'entity_type' => 'InstitutionalEvent',
                    'entity_id' => $event->id,
                    'start_time' => $event->start_time->toIso8601String(),
                    'end_time' => $event->end_time->toIso8601String(),
                ];
            }
        }

        // 2. Check Venue & Resource Collisions (Captures all interval overlap types: identical, start, end, engulfing, interior)
        if (!empty($venue) || !empty($venueId)) {
            $venueName = $venue;
            if (empty($venueName) && !empty($venueId)) {
                $v = Venue::find($venueId);
                $venueName = $v ? $v->name : null;
            }

            $isVirtual = $venueName && (str_contains(strtolower($venueName), 'virtual') || str_contains(strtolower($venueName), 'hackerrank') || str_contains(strtolower($venueName), 'zoom'));

            if (!$isVirtual && !empty($venueName)) {
                // Check overlapping DriveRounds on same venue
                $roundCollisions = DriveRound::overlapping($startTime, $endTime)
                    ->when($driveId, fn($q) => $q->where('drive_id', '!=', $driveId))
                    ->when($roundId, fn($q) => $q->where('id', '!=', $roundId))
                    ->where(function ($q) use ($venueName, $venueId) {
                        $q->where('venue', $venueName);
                        if ($venueId) {
                            $q->orWhere('venue_id', $venueId);
                        }
                    })
                    ->with('drive')
                    ->get();

                foreach ($roundCollisions as $collision) {
                    $driveName = $collision->drive ? $collision->drive->name : "Drive #{$collision->drive_id}";
                    $conflicts[] = [
                        'conflict_type' => 'VENUE_COLLISION',
                        'severity' => 'CRITICAL',
                        'is_hard_blackout' => false,
                        'message' => "Venue \"{$venueName}\" is already booked for round \"{$collision->name}\" of drive \"{$driveName}\" ({$collision->start_time->format('H:i')} - {$collision->end_time->format('H:i')}).",
                        'entity_type' => 'DriveRound',
                        'entity_id' => $collision->id,
                        'start_time' => $collision->start_time->toIso8601String(),
                        'end_time' => $collision->end_time->toIso8601String(),
                    ];
                }

                // Check overlapping DriveSchedules on same venue
                $scheduleCollisions = DriveSchedule::where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->where('venue', $venueName)
                ->when($driveId, fn($q) => $q->where('drive_id', '!=', $driveId))
                ->limit(5)
                ->get();

                foreach ($scheduleCollisions as $sc) {
                    $conflicts[] = [
                        'conflict_type' => 'VENUE_COLLISION',
                        'severity' => 'CRITICAL',
                        'is_hard_blackout' => false,
                        'message' => "Venue \"{$venueName}\" has conflicting individual interviews scheduled ({$sc->start_time->format('H:i')} - {$sc->end_time->format('H:i')}).",
                        'entity_type' => 'DriveSchedule',
                        'entity_id' => $sc->id,
                        'start_time' => $sc->start_time->toIso8601String(),
                        'end_time' => $sc->end_time->toIso8601String(),
                    ];
                }
            }
        }

        // 3. Check Student Schedule Overlaps (Same student scheduled in different drives/interviews)
        if (!empty($studentIds)) {
            $studentCollisions = DriveSchedule::whereIn('student_id', $studentIds)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->when($scheduleId, fn($q) => $q->where('id', '!=', $scheduleId))
                ->with(['student', 'drive'])
                ->get();

            foreach ($studentCollisions as $sc) {
                $studentName = $sc->student ? "{$sc->student->first_name} {$sc->student->last_name}" : "Student #{$sc->student_id}";
                $driveName = $sc->drive ? $sc->drive->name : "Drive #{$sc->drive_id}";
                $conflicts[] = [
                    'conflict_type' => 'STUDENT_SCHEDULE_OVERLAP',
                    'severity' => 'HIGH',
                    'is_hard_blackout' => false,
                    'message' => "Candidate {$studentName} has a conflicting interview/assessment in drive \"{$driveName}\" ({$sc->start_time->format('H:i')} - {$sc->end_time->format('H:i')}).",
                    'entity_type' => 'Student',
                    'entity_id' => $sc->student_id,
                    'start_time' => $sc->start_time->toIso8601String(),
                    'end_time' => $sc->end_time->toIso8601String(),
                ];
            }
        }

        // 4. Check Recruiter / Interviewer Double-Booking
        if (!empty($interviewerRef)) {
            $interviewerCollisions = DriveSchedule::where('interviewer_ref', $interviewerRef)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                      ->where('end_time', '>', $startTime);
                })
                ->when($scheduleId, fn($q) => $q->where('id', '!=', $scheduleId))
                ->with('drive')
                ->get();

            foreach ($interviewerCollisions as $ic) {
                $driveName = $ic->drive ? $ic->drive->name : "Drive #{$ic->drive_id}";
                $conflicts[] = [
                    'conflict_type' => 'RECRUITER_DOUBLE_BOOKING',
                    'severity' => 'HIGH',
                    'is_hard_blackout' => false,
                    'message' => "Interviewer \"{$interviewerRef}\" is already scheduled for an interview in drive \"{$driveName}\" ({$ic->start_time->format('H:i')} - {$ic->end_time->format('H:i')}).",
                    'entity_type' => 'DriveSchedule',
                    'entity_id' => $ic->id,
                    'start_time' => $ic->start_time->toIso8601String(),
                    'end_time' => $ic->end_time->toIso8601String(),
                ];
            }
        }

        $hasConflict = count($conflicts) > 0;
        $alternativeSlots = [];

        if ($hasConflict) {
            $alternativeSlots = $this->recommendAlternativeSlots($startTime, $endTime, $venue, $params);
        }

        return [
            'has_conflict' => $hasConflict,
            'has_hard_blackout' => $hasHardBlackout,
            'conflict_count' => count($conflicts),
            'conflicts' => $conflicts,
            'alternative_slots' => $alternativeSlots,
        ];
    }

    /**
     * Compute clean, non-conflicting alternative scheduling slots.
     */
    public function recommendAlternativeSlots(Carbon $startTime, Carbon $endTime, ?string $venue, array $params = []): array
    {
        $durationMinutes = $startTime->diffInMinutes($endTime);
        if ($durationMinutes <= 0) {
            $durationMinutes = 120; // Default 2 hours
        }

        $candidates = [];
        $checkParams = $params;

        // Slot 1: Later the same day (e.g. afternoon slot 14:00)
        $sameDayAfternoon = $startTime->copy()->setTime(14, 0, 0);
        if ($sameDayAfternoon->gt($startTime) && $sameDayAfternoon->hour < 18) {
            $slotEnd = $sameDayAfternoon->copy()->addMinutes($durationMinutes);
            $checkParams['start_time'] = $sameDayAfternoon->toIso8601String();
            $checkParams['end_time'] = $slotEnd->toIso8601String();
            if (!$this->hasHardConflict($checkParams)) {
                $candidates[] = [
                    'start_time' => $sameDayAfternoon->toIso8601String(),
                    'end_time' => $slotEnd->toIso8601String(),
                    'venue' => $venue,
                    'mode' => 'SAME_DAY_AFTERNOON',
                    'requires_mode_approval' => false,
                    'recommendation_reason' => 'Afternoon slot on the same date avoids morning institutional examination/event.',
                ];
            }
        }

        // Slot 2: Next business day at 10:00 AM
        $nextDay = $startTime->copy()->addDays(1)->setTime(10, 0, 0);
        if ($nextDay->isWeekend()) {
            $nextDay = $nextDay->next(\Carbon\CarbonInterface::MONDAY)->setTime(10, 0, 0);
        }
        $slotEnd = $nextDay->copy()->addMinutes($durationMinutes);
        $checkParams['start_time'] = $nextDay->toIso8601String();
        $checkParams['end_time'] = $slotEnd->toIso8601String();
        if (!$this->hasHardConflict($checkParams)) {
            $candidates[] = [
                'start_time' => $nextDay->toIso8601String(),
                'end_time' => $slotEnd->toIso8601String(),
                'venue' => $venue,
                'mode' => 'NEXT_BUSINESS_DAY',
                'requires_mode_approval' => false,
                'recommendation_reason' => 'Next business day morning slot with no calendar or venue collisions.',
            ];
        }

        // Slot 3: Day after next at 14:00
        $dayAfter = $startTime->copy()->addDays(2)->setTime(14, 0, 0);
        if ($dayAfter->isWeekend()) {
            $dayAfter = $dayAfter->next(\Carbon\CarbonInterface::TUESDAY)->setTime(14, 0, 0);
        }
        $slotEnd = $dayAfter->copy()->addMinutes($durationMinutes);
        $checkParams['start_time'] = $dayAfter->toIso8601String();
        $checkParams['end_time'] = $slotEnd->toIso8601String();
        if (!$this->hasHardConflict($checkParams)) {
            $candidates[] = [
                'start_time' => $dayAfter->toIso8601String(),
                'end_time' => $slotEnd->toIso8601String(),
                'venue' => $venue,
                'mode' => 'SUBSEQUENT_DAY_AFTERNOON',
                'requires_mode_approval' => false,
                'recommendation_reason' => 'Open institutional window with full venue availability.',
            ];
        }

        // Slot 4: Virtual Venue Recommendation (Recommendation only, NOT automatic substitution)
        if (!empty($venue) && !str_contains(strtolower($venue), 'virtual')) {
            $virtualParams = $params;
            $virtualParams['venue'] = 'Virtual (HackerRank / Secure Sandbox)';
            $virtualParams['venue_id'] = null;
            if (!$this->hasHardConflict($virtualParams)) {
                $candidates[] = [
                    'start_time' => $startTime->toIso8601String(),
                    'end_time' => $endTime->toIso8601String(),
                    'venue' => 'Virtual (HackerRank / Secure Sandbox)',
                    'mode' => 'VIRTUAL_VENUE_RECOMMENDATION',
                    'requires_mode_approval' => true,
                    'recommendation_reason' => 'Virtual delivery mode recommendation. Bypasses physical venue collision, but requires explicit verification of student connectivity, platform licensing, and authorized approval before altering drive delivery mode.',
                ];
            }
        }

        return array_slice($candidates, 0, 3);
    }

    /**
     * Helper to verify whether candidate slot has any critical hard conflict.
     */
    protected function hasHardConflict(array $params): bool
    {
        $startTime = Carbon::parse($params['start_time']);
        $endTime = Carbon::parse($params['end_time']);
        $branches = $params['branches'] ?? ['ALL'];

        // Blackout check
        $events = InstitutionalEvent::overlapping($startTime, $endTime)
            ->where('is_hard_blackout', true)
            ->get();

        foreach ($events as $e) {
            foreach ($branches as $b) {
                if ($e->affectsBranch($b)) {
                    return true;
                }
            }
        }

        // Venue check
        $venue = $params['venue'] ?? null;
        if (!empty($venue) && !str_contains(strtolower($venue), 'virtual')) {
            $driveId = $params['drive_id'] ?? null;
            $roundId = $params['round_id'] ?? null;
            $hasRoundCollision = DriveRound::overlapping($startTime, $endTime)
                ->where('venue', $venue)
                ->when($driveId, fn($q) => $q->where('drive_id', '!=', $driveId))
                ->when($roundId, fn($q) => $q->where('id', '!=', $roundId))
                ->exists();

            if ($hasRoundCollision) {
                return true;
            }
        }

        return false;
    }
}
