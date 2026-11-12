import { apiClient } from "./apiClient";

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  channel: string;
  title: string;
  message: string;
  data_payload?: Record<string, any>;
  delivery_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  channel: 'IN_APP' | 'EMAIL';
  notification_type: string;
  is_enabled: boolean;
}

export const notificationsApi = {
  getNotifications: (unreadOnly = false, perPage = 20) =>
    apiClient.get<{
      status: string;
      unread_count: number;
      data: AppNotification[];
      total: number;
      current_page: number;
      last_page: number;
    }>(`/api/v1/notifications?unread_only=${unreadOnly}&per_page=${perPage}`),

  getUnreadCount: () =>
    apiClient.get<{ unread_count: number }>("/api/v1/notifications/unread-count"),

  markAsRead: (id: number) =>
    apiClient.patch<{ status: string; notification: AppNotification }>(
      `/api/v1/notifications/${id}/read`,
      {}
    ),

  markAllAsRead: () =>
    apiClient.post<{ status: string; marked_count: number }>(
      "/api/v1/notifications/mark-all-read",
      {}
    ),

  getPreferences: () =>
    apiClient.get<{ status: string; preferences: NotificationPreference[] }>(
      "/api/v1/notifications/preferences"
    ),

  updatePreferences: (
    preferences: Array<{ channel: 'IN_APP' | 'EMAIL'; notification_type: string; is_enabled: boolean }>
  ) =>
    apiClient.put<{ status: string; preferences: NotificationPreference[] }>(
      "/api/v1/notifications/preferences",
      { preferences }
    ),

  // Placement Officer Feed & Broadcast Workflow
  getOfficerFeed: (params?: { type?: string; status?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.type && params.type !== "ALL") q.set("type", params.type);
    if (params?.status && params.status !== "ALL") q.set("status", params.status);
    if (params?.page) q.set("page", params.page.toString());
    if (params?.per_page) q.set("per_page", params.per_page.toString());
    const query = q.toString() ? `?${q.toString()}` : "";
    return apiClient.get<{
      status: string;
      summary: {
        total_dispatched: number;
        delivered_count: number;
        read_count: number;
        read_rate_percent: number;
      };
      data: Array<{
        id: number;
        user_id: number;
        notification_type: string;
        title: string;
        message: string;
        channel: string;
        status: string;
        read_at: string | null;
        created_at: string;
        user?: {
          id: number;
          email: string;
          role: string;
        };
      }>;
      total: number;
      current_page: number;
      last_page: number;
    }>(`/api/v1/officer/notifications${query}`);
  },

  broadcastBulletin: (data: {
    title: string;
    message: string;
    target_type: "ALL_STUDENTS" | "BRANCH" | "DRIVE_APPLICANTS";
    target_value?: string;
    priority?: "NORMAL" | "URGENT" | "CRITICAL";
  }) =>
    apiClient.post<{
      status: string;
      message: string;
      dispatched_count: number;
    }>("/api/v1/officer/notifications/broadcast", data),
};
