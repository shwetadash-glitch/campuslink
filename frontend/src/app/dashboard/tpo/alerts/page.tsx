"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { notificationsApi } from "@/services/notificationsApi";

export default function TpoAlertsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: {
      total_dispatched: number;
      delivered_count: number;
      read_count: number;
      read_rate_percent: number;
    };
    notifications: any[];
  } | null>(null);

  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  // Form states
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [targetType, setTargetType] = useState<"ALL_STUDENTS" | "BRANCH" | "DRIVE_APPLICANTS">("ALL_STUDENTS");
  const [targetValue, setTargetValue] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT" | "CRITICAL">("NORMAL");
  const [submitting, setSubmitting] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getOfficerFeed({
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        per_page: 50,
      });
      setData({
        summary: res.summary,
        notifications: res.data,
      });
    } catch (err: any) {
      console.error("Failed to load officer notifications feed", err);
      setFeedback({ message: "Failed to load notification feed from server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [typeFilter, statusFilter]);

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await notificationsApi.broadcastBulletin({
        title: broadcastTitle,
        message: broadcastMessage,
        target_type: targetType,
        target_value: targetValue || undefined,
        priority: priority,
      });

      setFeedback({
        message: `Broadcast successfully dispatched to ${res.dispatched_count} candidates via automated push channel!`,
        type: "success",
      });

      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastModalOpen(false);
      loadNotifications();
    } catch (err: any) {
      console.error("Broadcast failed", err);
      setFeedback({ message: "Failed to dispatch broadcast notice.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNotifications = (data?.notifications || []).filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      (n.user?.email && n.user.email.toLowerCase().includes(q)) ||
      n.notification_type.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title="Placement Notification & Bulletin Alerts"
        description="Automated candidate notification workflows, placement bulletins, and critical scheduling alerts."
        actionLabel="Broadcast Bulletin"
        onAction={() => setBroadcastModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Real-time Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {feedback.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {feedback.message}
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Telemetry Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Dispatched</h3>
            <div className="text-3xl font-black text-campusblue-900">
              {loading ? "..." : data?.summary.total_dispatched ?? 0}
            </div>
            <div className="text-[11px] text-campusblue-400 font-medium mt-1">Multi-channel idempotent dispatches</div>
          </div>

          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-sm">
            <h3 className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">Delivered In-App</h3>
            <div className="text-3xl font-black text-emerald-700">
              {loading ? "..." : data?.summary.delivered_count ?? 0}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Active candidate inboxes verified</div>
          </div>

          <div className="bg-campusblue-50 rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-800 text-xs font-bold uppercase tracking-wider mb-1">Read Confirmations</h3>
            <div className="text-3xl font-black text-campusblue-700">
              {loading ? "..." : data?.summary.read_count ?? 0}
            </div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1">Read receipts recorded</div>
          </div>

          <div className="bg-campusblue-50 rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-800 text-xs font-bold uppercase tracking-wider mb-1">Engagement Rate</h3>
            <div className="text-3xl font-black text-campusblue-700">
              {loading ? "..." : `${data?.summary.read_rate_percent ?? 0}%`}
            </div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1">Candidate bulletin engagement</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search notifications or recipients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-campusblue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-campusblue-500 focus:outline-none"
            />
            <svg
              className="w-4 h-4 text-campusblue-400 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <select
              className="text-xs font-semibold border-campusblue-200 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-campusblue-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="OFFICER_BROADCAST_BULLETIN">Bulletins & Announcements</option>
              <option value="AT_RISK_INTERVENTION">At-Risk Interventions</option>
              <option value="ASSESSMENT_INVITATION">Assessments & Quizzes</option>
              <option value="GD_EVALUATION_COMPLETED">GD Evaluations</option>
            </select>

            <select
              className="text-xs font-semibold border-campusblue-200 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-campusblue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="SENT">Sent</option>
              <option value="READ">Read</option>
              <option value="PENDING">Pending</option>
            </select>

            <button
              onClick={loadNotifications}
              title="Refresh alerts"
              className="p-2 border border-campusblue-200 hover:bg-campusblue-50 rounded-lg text-campusblue-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="border-b border-campusblue-100 bg-campusblue-50 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-campusblue-900">Dispatched Notification Log</h2>
              <p className="text-xs text-campusblue-500 mt-0.5">
                Showing {filteredNotifications.length} notifications in queue and delivery logs
              </p>
            </div>
            <button
              onClick={() => setBroadcastModalOpen(true)}
              className="text-xs font-bold text-white bg-campusblue-600 hover:bg-campusblue-700 px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              + New Bulletin
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-campusblue-200 border-t-campusblue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-campusblue-600">Retrieving notification telemetry records...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-campusblue-500">
              <p className="font-semibold">No notifications match your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-campusblue-100">
                <thead className="bg-campusblue-50/60">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Notification Details
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Delivery Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-campusblue-50">
                  {filteredNotifications.map((notif) => (
                    <tr
                      key={notif.id}
                      onClick={() => setSelectedAlert(notif)}
                      className="hover:bg-campusblue-50/50 transition cursor-pointer"
                    >
                      {/* Title & Excerpt */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-campusblue-900 line-clamp-1">{notif.title}</div>
                        <div className="text-xs text-campusblue-600 line-clamp-1 mt-0.5">{notif.message}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-campusblue-100 text-campusblue-800 uppercase tracking-wider">
                          {notif.notification_type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Recipient */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {notif.user?.email ? (
                          <span>{notif.user.email}</span>
                        ) : (
                          <span className="font-mono text-campusblue-500">User #{notif.user_id}</span>
                        )}
                      </td>

                      {/* Channel */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {notif.channel || "IN_APP"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {notif.status === "DELIVERED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                            Delivered
                          </span>
                        ) : notif.status === "READ" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                            {notif.status}
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-500">
                        {new Date(notif.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Bulletin Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Broadcast Placement Bulletin
              </h2>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="p-6 space-y-4">
              <p className="text-xs text-campusblue-600 leading-relaxed">
                Dispatches an authoritative placement alert via automated in-app push notification to the selected student audience.
              </p>

              <div>
                <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                  Bulletin Title
                </label>
                <input
                  required
                  placeholder="e.g. Schedule Update: Google STEP Technical Interviews"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full border border-campusblue-200 rounded-lg p-2.5 text-sm font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Target Audience
                  </label>
                  <select
                    value={targetType}
                    onChange={(e: any) => setTargetType(e.target.value)}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                  >
                    <option value="ALL_STUDENTS">All Registered Students</option>
                    <option value="BRANCH">Specific Department / Branch</option>
                    <option value="DRIVE_APPLICANTS">Specific Placement Drive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="URGENT">Urgent (Highlighted)</option>
                    <option value="CRITICAL">Critical (Immediate Push)</option>
                  </select>
                </div>
              </div>

              {targetType === "BRANCH" && (
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Branch Name
                  </label>
                  <input
                    required
                    placeholder="e.g. Computer Science, MECH, ECE"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                  />
                </div>
              )}

              {targetType === "DRIVE_APPLICANTS" && (
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Drive ID
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 1 (TechCorp), 10 (Google)"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                  Bulletin Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type official placement announcement message here..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full border border-campusblue-200 rounded-lg p-2.5 text-xs leading-relaxed resize-none text-slate-800 focus:ring-2 focus:ring-campusblue-500"
                ></textarea>
              </div>

              <div className="mt-6 pt-4 border-t border-campusblue-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-campusblue-600 hover:bg-campusblue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Dispatching..." : "Send Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Notification Details
              </h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-campusblue-100 text-campusblue-800 px-2 py-0.5 rounded">
                  {selectedAlert.notification_type}
                </span>
                <h3 className="text-base font-bold text-campusblue-900 mt-2">{selectedAlert.title}</h3>
                <div className="text-xs text-slate-500 mt-1">
                  Recipient: <strong>{selectedAlert.user?.email || `User #${selectedAlert.user_id}`}</strong> | Delivery Status:{" "}
                  <strong className="text-emerald-700">{selectedAlert.status}</strong>
                </div>
              </div>

              <div className="p-3 bg-campusblue-50/50 rounded-lg border border-campusblue-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                {selectedAlert.message}
              </div>

              <div className="text-[11px] text-slate-400">
                Dispatched at: {new Date(selectedAlert.created_at).toLocaleString()}
              </div>

              <div className="pt-3 border-t border-campusblue-100 flex justify-end">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-1.5 text-xs font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg border border-campusblue-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
