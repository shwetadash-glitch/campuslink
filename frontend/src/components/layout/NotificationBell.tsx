"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { notificationsApi, AppNotification, NotificationPreference } from "@/services/notificationsApi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.unread_count);
    } catch {
      // Ignore if session not ready
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications(false, 10);
      setNotifications(res.data);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, delivery_status: 'READ' as const, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, delivery_status: 'READ' as const, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPreferences = async () => {
    setShowPreferences(true);
    setIsOpen(false);
    try {
      const res = await notificationsApi.getPreferences();
      // Default common notification types if preferences table is empty
      if (res.preferences.length === 0) {
        setPreferences([
          { id: 1, user_id: 0, channel: 'IN_APP', notification_type: 'REGISTRATION_CONFIRMED', is_enabled: true },
          { id: 2, user_id: 0, channel: 'IN_APP', notification_type: 'DRIVE_PUBLISHED', is_enabled: true },
          { id: 3, user_id: 0, channel: 'IN_APP', notification_type: 'SCHEDULE_MODIFIED', is_enabled: true },
          { id: 4, user_id: 0, channel: 'IN_APP', notification_type: 'OFFER_EXTENDED', is_enabled: true },
          { id: 5, user_id: 0, channel: 'EMAIL', notification_type: 'REGISTRATION_CONFIRMED', is_enabled: true },
          { id: 6, user_id: 0, channel: 'EMAIL', notification_type: 'OFFER_EXTENDED', is_enabled: true },
        ]);
      } else {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePreference = (channel: 'IN_APP' | 'EMAIL', type: string) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.channel === channel && p.notification_type === type ? { ...p, is_enabled: !p.is_enabled } : p
      )
    );
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await notificationsApi.updatePreferences(
        preferences.map((p) => ({
          channel: p.channel,
          notification_type: p.notification_type,
          is_enabled: p.is_enabled,
        }))
      );
      setShowPreferences(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-campusblue-200 hover:text-white hover:bg-campusblue-800 rounded-lg transition"
        title="Notifications"
        aria-label="View notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-2xs font-extrabold text-white bg-red-600 rounded-full border-2 border-campusblue-900 shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-campusblue-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-campusblue-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-campusblue-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-2xs font-bold bg-campusblue-50 text-campusblue-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-2xs font-semibold text-campusblue-600 hover:text-campusblue-800 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-campusblue-50">
            {loading ? (
              <div className="py-8 text-center text-xs text-campusblue-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-campusblue-400">
                <p>No notifications yet</p>
                <p className="text-2xs text-campusblue-300 mt-1">Updates on drives and offers will appear here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = n.delivery_status !== 'READ' && !n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`px-4 py-3 hover:bg-campusblue-50/50 cursor-pointer transition flex items-start gap-3 ${
                      isUnread ? "bg-campusblue-50/30" : ""
                    }`}
                  >
                    <div
                      className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                        isUnread ? "bg-blue-600" : "bg-campusblue-200"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${isUnread ? "font-bold text-campusblue-900" : "text-campusblue-700"}`}>
                          {n.title}
                        </p>
                        <span className="text-3xs text-campusblue-400 whitespace-nowrap">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-2xs text-campusblue-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-campusblue-50 bg-campusblue-50/30 flex items-center justify-between text-2xs">
            <button
              onClick={handleOpenPreferences}
              className="text-campusblue-600 hover:text-campusblue-800 font-semibold"
            >
              ⚙ Preferences
            </button>
            <span className="text-campusblue-400">CampusLink Notifications</span>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <Modal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Notification Preferences"
        subtitle="Control which placement alerts and reminders you receive"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-2xs leading-relaxed">
            <span className="font-bold block">ℹ️ Email Delivery Status:</span>
            External email delivery is not yet configured. Your email alert preferences will be safely stored and automatically applied once external mail infrastructure is enabled.
          </div>

          <div className="divide-y divide-campusblue-50 border border-campusblue-100 rounded-lg overflow-hidden">
            <div className="bg-campusblue-50/50 px-3 py-2 font-bold text-campusblue-800 flex justify-between items-center text-2xs">
              <span>Notification Alert Type</span>
              <div className="flex gap-4 items-center">
                <span>In-App</span>
                <span className="text-campusblue-400 font-normal">Email (Pending Setup)</span>
              </div>
            </div>

            {[
              { type: 'REGISTRATION_CONFIRMED', label: 'Drive Registration Confirmations' },
              { type: 'DRIVE_PUBLISHED', label: 'New Drive Publications' },
              { type: 'SCHEDULE_MODIFIED', label: 'Interview Schedule Adjustments' },
              { type: 'OFFER_EXTENDED', label: 'Placement Offers & Deadlines' },
              { type: 'ROUND_RESULT', label: 'Round Progression Outcomes' },
            ].map((item) => {
              const inAppPref = preferences.find(
                (p) => p.channel === 'IN_APP' && p.notification_type === item.type
              );
              const emailPref = preferences.find(
                (p) => p.channel === 'EMAIL' && p.notification_type === item.type
              );

              return (
                <div key={item.type} className="px-3 py-2.5 flex items-center justify-between hover:bg-campusblue-50/20">
                  <span className="font-medium text-campusblue-800">{item.label}</span>
                  <div className="flex gap-8 items-center pr-1">
                    <input
                      type="checkbox"
                      checked={inAppPref ? inAppPref.is_enabled : true}
                      onChange={() => handleTogglePreference('IN_APP', item.type)}
                      className="rounded border-campusblue-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                    <input
                      type="checkbox"
                      checked={emailPref ? emailPref.is_enabled : true}
                      onChange={() => handleTogglePreference('EMAIL', item.type)}
                      className="rounded border-campusblue-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreferences(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={savingPrefs} onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
