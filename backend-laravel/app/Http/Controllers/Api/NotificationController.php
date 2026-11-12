<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Student;
use App\Models\DriveCandidate;
use App\Services\NotificationService;
use Carbon\Carbon;

class NotificationController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * List in-app notifications for authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Notification::where('user_id', $user->id)->orderBy('created_at', 'desc');

        if ($request->boolean('unread_only')) {
            $query->unread();
        }

        $perPage = (int) $request->get('per_page', 20);
        $notifications = $query->paginate($perPage);
        $unreadCount = Notification::where('user_id', $user->id)->unread()->count();

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'data' => $notifications->items(),
            'current_page' => $notifications->currentPage(),
            'total' => $notifications->total(),
            'last_page' => $notifications->lastPage(),
        ]);
    }

    /**
     * Unread notification count for header badge.
     */
    public function unreadCount(Request $request)
    {
        $unreadCount = Notification::where('user_id', $request->user()->id)->unread()->count();
        return response()->json(['unread_count' => $unreadCount]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'status' => 'success',
            'notification' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read for current user.
     */
    public function markAllAsRead(Request $request)
    {
        $updated = Notification::where('user_id', $request->user()->id)
            ->unread()
            ->update([
                'status' => 'READ',
                'read_at' => Carbon::now(),
            ]);

        return response()->json([
            'status' => 'success',
            'marked_count' => $updated,
        ]);
    }

    /**
     * Get current user's notification preferences.
     */
    public function getPreferences(Request $request)
    {
        $preferences = NotificationPreference::where('user_id', $request->user()->id)->get();
        return response()->json(['status' => 'success', 'preferences' => $preferences]);
    }

    /**
     * Update notification preferences.
     */
    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'preferences' => 'required|array',
            'preferences.*.channel' => 'required|string|in:IN_APP,EMAIL',
            'preferences.*.notification_type' => 'required|string',
            'preferences.*.is_enabled' => 'required|boolean',
        ]);

        $userId = $request->user()->id;

        foreach ($validated['preferences'] as $pref) {
            NotificationPreference::updateOrCreate(
                [
                    'user_id' => $userId,
                    'channel' => $pref['channel'],
                    'notification_type' => $pref['notification_type'],
                ],
                [
                    'is_enabled' => $pref['is_enabled'],
                ]
            );
        }

        $all = NotificationPreference::where('user_id', $userId)->get();

        return response()->json([
            'status' => 'success',
            'preferences' => $all,
        ]);
    }

    /**
     * Officer system-wide notification dispatch feed with telemetry summary.
     */
    public function officerFeed(Request $request)
    {
        $query = Notification::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('type') && $request->type !== 'ALL') {
            $query->where('notification_type', $request->type);
        }

        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->get('per_page', 25);
        $notifications = $query->paginate($perPage);

        $totalDispatched = Notification::count();
        $deliveredCount = Notification::whereIn('status', ['DELIVERED', 'SENT'])->count();
        $readCount = Notification::where('status', 'READ')->count();

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total_dispatched' => $totalDispatched,
                'delivered_count' => $deliveredCount,
                'read_count' => $readCount,
                'read_rate_percent' => $totalDispatched > 0 ? round(($readCount / $totalDispatched) * 100, 1) : 0,
            ],
            'data' => $notifications->items(),
            'total' => $notifications->total(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
        ]);
    }

    /**
     * Broadcast notification bulletin to students by branch or drive.
     */
    public function broadcast(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_type' => 'required|string|in:ALL_STUDENTS,BRANCH,DRIVE_APPLICANTS',
            'target_value' => 'nullable|string',
            'priority' => 'nullable|string|in:NORMAL,URGENT,CRITICAL',
        ]);

        $query = Student::whereNotNull('user_id');
        if ($validated['target_type'] === 'BRANCH' && !empty($validated['target_value']) && $validated['target_value'] !== 'ALL' && $validated['target_value'] !== 'All Branches') {
            $query->where('branch', $validated['target_value']);
        } elseif ($validated['target_type'] === 'DRIVE_APPLICANTS' && !empty($validated['target_value'])) {
            $driveId = (int) $validated['target_value'];
            $studentIds = DriveCandidate::where('drive_id', $driveId)->pluck('student_id');
            $query->whereIn('id', $studentIds);
        }

        $students = $query->get();
        $dispatchedCount = 0;

        foreach ($students as $student) {
            $notif = $this->notificationService->sendNotification([
                'user_id' => $student->user_id,
                'type' => 'OFFICER_BROADCAST_BULLETIN',
                'title' => $validated['title'],
                'message' => $validated['message'],
                'metadata' => [
                    'target_type' => $validated['target_type'],
                    'target_value' => $validated['target_value'] ?? null,
                    'priority' => $validated['priority'] ?? 'NORMAL',
                    'sender_id' => $request->user()->id,
                ],
                'channel' => 'IN_APP',
                'force_sync' => true,
            ]);
            if ($notif) $dispatchedCount++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Broadcast successfully dispatched to {$dispatchedCount} candidates.",
            'dispatched_count' => $dispatchedCount,
        ]);
    }
}
