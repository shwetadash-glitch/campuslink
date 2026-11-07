<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\NotificationPreference;
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
}
