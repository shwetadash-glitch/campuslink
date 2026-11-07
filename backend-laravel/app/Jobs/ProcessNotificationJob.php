<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Notification;
use App\Services\NotificationService;
use Exception;

class ProcessNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $notificationId;
    public int $tries = 3;

    public function __construct(int $notificationId)
    {
        $this->notificationId = $notificationId;
    }

    public function handle(NotificationService $service): void
    {
        $notification = Notification::find($this->notificationId);
        if (!$notification) {
            return;
        }

        try {
            $service->deliverNotification($notification);
        } catch (Exception $e) {
            $notification->recordFailure($e->getMessage());
            if ($notification->retry_count < $notification->max_retries) {
                $this->release(30 * $notification->retry_count); // exponential backoff
            }
        }
    }
}
