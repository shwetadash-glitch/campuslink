<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Models\Student;
use App\Models\PlacementDrive;
use App\Models\DriveCandidate;
use App\Models\DriveSchedule;
use App\Models\Offer;
use App\Jobs\ProcessNotificationJob;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Exception;

class NotificationService
{
    /**
     * Array-based helper for sending notifications.
     */
    public function sendNotification(array $params): ?Notification
    {
        return $this->send(
            $params['user_id'],
            $params['type'] ?? $params['notification_type'],
            $params['title'],
            $params['message'],
            $params['metadata'] ?? [],
            $params['channel'] ?? 'IN_APP',
            $params['idempotency_key'] ?? null,
            $params['force_sync'] ?? false
        );
    }

    /**
     * Dispatch an in-app or queued notification with strict idempotency and preference checks.
     */
    public function send(
        int $userId,
        string $type,
        string $title,
        string $message,
        array $metadata = [],
        string $channel = 'IN_APP',
        ?string $idempotencyKey = null,
        bool $forceSync = false
    ): ?Notification {
        // 1. Compute deterministic idempotency key if not explicitly supplied
        if (empty($idempotencyKey)) {
            $entityType = $metadata['entity_type'] ?? 'generic';
            $entityId = $metadata['entity_id'] ?? 'none';
            $idempotencyKey = hash('sha256', "{$userId}:{$type}:{$channel}:{$entityType}:{$entityId}");
        }

        // 2. Idempotency Check: Return existing notification if already dispatched
        $existing = Notification::where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            Log::info("Notification with idempotency key [{$idempotencyKey}] already exists. Skipping duplicate generation.");
            return $existing;
        }

        // 3. User Notification Preferences Check
        if (!$this->isChannelAndTypeEnabled($userId, $channel, $type)) {
            Log::info("Notification [{$type}] on channel [{$channel}] suppressed for user #{$userId} based on preferences.");
            return null;
        }

        // 4. Create Notification in PENDING state (safeguarded against concurrent insert races)
        try {
            $notification = Notification::create([
                'user_id' => $userId,
                'notification_type' => $type,
                'title' => $title,
                'message' => $message,
                'channel' => $channel,
                'status' => 'PENDING',
                'idempotency_key' => $idempotencyKey,
                'retry_count' => 0,
                'max_retries' => 3,
                'metadata_json' => $metadata,
                'scheduled_at' => Carbon::now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Concurrent execution collision on unique idempotency_key
            $msg = $e->getMessage();
            if (str_contains($msg, '23505') || str_contains($msg, 'UNIQUE') || str_contains($msg, 'unique') || str_contains($msg, 'idempotency_key')) {
                Log::info("Concurrent notification collision on idempotency key [{$idempotencyKey}]. Returning existing record.");
                return Notification::where('idempotency_key', $idempotencyKey)->first();
            }
            throw $e;
        }

        // 5. Queued or Sync Delivery Processing
        if ($forceSync || app()->runningUnitTests()) {
            $this->deliverNotification($notification);
        } else {
            ProcessNotificationJob::dispatch($notification->id);
        }

        return $notification;
    }

    /**
     * Check if a specific channel and notification type are enabled in user preferences.
     */
    public function isChannelAndTypeEnabled(int $userId, string $channel, string $type): bool
    {
        $specificPref = NotificationPreference::where('user_id', $userId)
            ->where('channel', $channel)
            ->where('notification_type', $type)
            ->first();

        if ($specificPref !== null) {
            return (bool) $specificPref->is_enabled;
        }

        $allPref = NotificationPreference::where('user_id', $userId)
            ->where('channel', $channel)
            ->where('notification_type', 'ALL')
            ->first();

        if ($allPref !== null) {
            return (bool) $allPref->is_enabled;
        }

        return true; // Default enabled
    }

    /**
     * Process notification delivery and update tracking timestamps.
     */
    public function deliverNotification(Notification $notification, bool $simulateTransientFailure = false): bool
    {
        if ($simulateTransientFailure) {
            $notification->recordFailure("Simulated transient delivery network timeout.");
            throw new Exception("Simulated transient delivery failure.");
        }

        if ($notification->channel === 'IN_APP') {
            $notification->markAsDelivered();
            Log::info("Notification #{$notification->id} successfully delivered to user #{$notification->user_id} via IN_APP.");
            return true;
        }

        if ($notification->channel === 'EMAIL') {
            // External email delivery provider is not configured.
            // Strict platform constraint: do NOT report email as DELIVERED without an active provider.
            $notification->update([
                'status' => 'PENDING',
                'last_error' => 'External email delivery provider is not configured. Message retained in pending queue.',
            ]);
            Log::info("Notification #{$notification->id} for user #{$notification->user_id} retained as PENDING (external email delivery not configured).");
            return false;
        }

        $notification->markAsDelivered();
        return true;
    }

    /**
     * Registration Confirmation Notification.
     */
    public function notifyRegistrationConfirmation(Student $student, PlacementDrive $drive, DriveCandidate $candidate): ?Notification
    {
        $title = "Registration Confirmed: {$drive->name}";
        $message = "You have successfully registered for {$drive->name} ({$drive->company?->name}). Your application status is currently REGISTERED.";
        $metadata = [
            'entity_type' => 'PlacementDrive',
            'entity_id' => $drive->id,
            'candidate_id' => $candidate->id,
            'drive_name' => $drive->name,
            'company_name' => $drive->company?->name,
        ];
        $idempotencyKey = hash('sha256', "reg_confirm:{$student->user_id}:{$drive->id}");

        return $this->send($student->user_id, 'REGISTRATION_CONFIRMATION', $title, $message, $metadata, 'IN_APP', $idempotencyKey);
    }

    /**
     * Drive Publication Notification to eligible students.
     */
    public function notifyDrivePublished(PlacementDrive $drive): int
    {
        $eligibleStudents = Student::with('user')->get();
        $dispatchedCount = 0;

        foreach ($eligibleStudents as $student) {
            if (!$student->user) continue;

            $title = "New Placement Drive: {$drive->name}";
            $message = "A new placement drive for {$drive->company?->name} has been published. Registration is now open.";
            $metadata = [
                'entity_type' => 'PlacementDrive',
                'entity_id' => $drive->id,
                'drive_name' => $drive->name,
                'company_name' => $drive->company?->name,
            ];
            $idempotencyKey = hash('sha256', "drive_pub:{$student->user_id}:{$drive->id}");

            $notif = $this->send($student->user_id, 'DRIVE_PUBLISHED', $title, $message, $metadata, 'IN_APP', $idempotencyKey);
            if ($notif) {
                $dispatchedCount++;
            }
        }

        return $dispatchedCount;
    }

    /**
     * Registration Deadline Reminder Notification.
     */
    public function notifyDeadlineReminder(Student $student, PlacementDrive $drive): ?Notification
    {
        $title = "Deadline Reminder: {$drive->name}";
        $message = "Registration for {$drive->name} ({$drive->company?->name}) is closing soon. Ensure your registration is submitted before the deadline.";
        $metadata = [
            'entity_type' => 'PlacementDrive',
            'entity_id' => $drive->id,
            'drive_name' => $drive->name,
        ];
        $idempotencyKey = hash('sha256', "deadline_rem:{$student->user_id}:{$drive->id}:" . date('Ymd'));

        return $this->send($student->user_id, 'DEADLINE_REMINDER', $title, $message, $metadata, 'IN_APP', $idempotencyKey);
    }

    /**
     * Schedule Modification Notification.
     */
    public function notifyScheduleModification(DriveSchedule $schedule, string $changeDescription): ?Notification
    {
        $student = $schedule->student;
        if (!$student || !$student->user) return null;

        $title = "Schedule Updated: Interview Slot";
        $message = "Your scheduled interview slot has been updated: {$changeDescription}. Scheduled from {$schedule->start_time->format('M d, H:i')} to {$schedule->end_time->format('H:i')}.";
        $metadata = [
            'entity_type' => 'DriveSchedule',
            'entity_id' => $schedule->id,
            'drive_id' => $schedule->drive_id,
            'start_time' => $schedule->start_time->toIso8601String(),
            'venue' => $schedule->venue,
        ];
        $idempotencyKey = hash('sha256', "sched_mod:{$student->user_id}:{$schedule->id}:" . md5($changeDescription));

        return $this->send($student->user_id, 'SCHEDULE_MODIFICATION', $title, $message, $metadata, 'IN_APP', $idempotencyKey);
    }

    /**
     * Cancellation or Postponement Notification.
     */
    public function notifyCancellationOrPostponement(PlacementDrive $drive, string $actionType, string $reason): int
    {
        $candidates = DriveCandidate::with('student.user')->where('drive_id', $drive->id)->get();
        $dispatched = 0;

        foreach ($candidates as $candidate) {
            $user = $candidate->student?->user;
            if (!$user) continue;

            $title = "Drive {$actionType}: {$drive->name}";
            $message = "Placement drive {$drive->name} has been {$actionType}. Reason: {$reason}.";
            $metadata = [
                'entity_type' => 'PlacementDrive',
                'entity_id' => $drive->id,
                'action_type' => $actionType,
                'reason' => $reason,
            ];
            $idempotencyKey = hash('sha256', "drive_{$actionType}:{$user->id}:{$drive->id}:" . now()->format('Ymd'));

            $notif = $this->send($user->id, "DRIVE_{$actionType}", $title, $message, $metadata, 'IN_APP', $idempotencyKey);
            if ($notif) $dispatched++;
        }

        return $dispatched;
    }

    /**
     * Offer Generated Notification.
     */
    public function notifyOfferGenerated(Offer $offer): ?Notification
    {
        $student = $offer->student;
        if (!$student || !$student->user) return null;

        $title = "Congratulations! Offer Received from {$offer->job?->company?->name}";
        $message = "You have received an employment offer for the role of {$offer->job?->title} with a package of {$offer->ctc} LPA. Please review and respond to the offer.";
        $metadata = [
            'entity_type' => 'Offer',
            'entity_id' => $offer->id,
            'ctc' => $offer->ctc,
            'job_title' => $offer->job?->title,
            'company_name' => $offer->job?->company?->name,
        ];
        $idempotencyKey = hash('sha256', "offer_gen:{$student->user_id}:{$offer->id}");

        return $this->send($student->user_id, 'OFFER_GENERATED', $title, $message, $metadata, 'IN_APP', $idempotencyKey);
    }

    /**
     * Offer Response Notifications (Accept / Reject).
     */
    public function notifyOfferResponse(Offer $offer, string $responseType): ?Notification
    {
        $student = $offer->student;
        if (!$student || !$student->user) return null;

        $title = "Offer {$responseType}: {$offer->job?->company?->name}";
        $message = "Your response ({$responseType}) for {$offer->job?->title} at {$offer->job?->company?->name} has been recorded and communicated to the Placement Office.";
        $metadata = [
            'entity_type' => 'Offer',
            'entity_id' => $offer->id,
            'response' => $responseType,
        ];
        $idempotencyKey = hash('sha256', "offer_resp:{$student->user_id}:{$offer->id}:{$responseType}");

        return $this->send($student->user_id, "OFFER_{$responseType}", $title, $message, $metadata, 'IN_APP', $idempotencyKey);
    }
}
