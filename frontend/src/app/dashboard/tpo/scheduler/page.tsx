"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi } from "@/services/adminApi";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SchedulerPage() {
  // Calendar defaults to active system date (Nov 2026)
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2026, 10)); // November 2026
  const [selectedDate, setSelectedDate] = useState("Nov 16, 2026");
  const [viewMode, setViewMode] = useState<"DAY" | "WEEK">("DAY");

  const [events, setEvents] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  // Modal State
  const [modalState, setModalState] = useState<{ type: string; event?: any; date?: string } | null>(null);

  // Conflict state for planning
  const [conflictChecking, setConflictChecking] = useState(false);
  const [conflictReport, setConflictReport] = useState<any | null>(null);

  // Form State for Add Event / Round
  const [scheduleCategory, setScheduleCategory] = useState<"DRIVE_ROUND" | "INSTITUTIONAL_BLACKOUT">("DRIVE_ROUND");
  const [selectedDriveId, setSelectedDriveId] = useState<number | string>("");
  const [roundName, setRoundName] = useState("");
  const [roundType, setRoundType] = useState("INTERVIEW");
  const [formDate, setFormDate] = useState("2026-11-16");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [selectedVenue, setSelectedVenue] = useState("Main Auditorium (Audi 1)");
  const [instructions, setInstructions] = useState("");
  const [isHardBlackout, setIsHardBlackout] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load scheduler events, drives, and venues
  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsRes, drivesRes, venuesRes] = await Promise.all([
        adminApi.getSchedulerEvents("2026-11-01", "2026-11-30"),
        adminApi.getDrives(),
        adminApi.getVenues(),
      ]);

      if (Array.isArray(eventsRes)) {
        setEvents(eventsRes);
      }
      if (Array.isArray(drivesRes)) {
        setDrives(drivesRes);
        if (drivesRes.length > 0 && !selectedDriveId) {
          setSelectedDriveId(drivesRes[0].id);
        }
      }
      if (Array.isArray(venuesRes)) {
        setVenues(venuesRes);
      }
    } catch (err: any) {
      console.error("Failed to load scheduler data", err);
      setFeedback({ message: "Failed to connect to backend scheduler service.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  const monthName = MONTH_NAMES[currentMonthDate.getMonth()];
  const currentYear = currentMonthDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonthDate.getMonth() - 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentYear, currentMonthDate.getMonth() + 1));
  };

  const getStartOfWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (dateStr: string) => {
    const d = getStartOfWeek(dateStr);
    return new Date(d.setDate(d.getDate() + 6));
  };

  const isEventInSelectedWeek = (eventDateStr: string, selectedDateStr: string) => {
    const eventDate = new Date(eventDateStr);
    const startOfWeek = getStartOfWeek(selectedDateStr);
    const endOfWeek = getEndOfWeek(selectedDateStr);
    eventDate.setHours(0, 0, 0, 0);
    startOfWeek.setHours(0, 0, 0, 0);
    endOfWeek.setHours(23, 59, 59, 999);
    return eventDate >= startOfWeek && eventDate <= endOfWeek;
  };

  const displayedEvents = useMemo(() => {
    return viewMode === "DAY"
      ? events.filter((e) => e.date === selectedDate)
      : events.filter((e) => isEventInSelectedWeek(e.date, selectedDate));
  }, [events, selectedDate, viewMode]);

  // Live Conflict Detection Engine Check
  const checkConflicts = async (dateVal: string, startVal: string, endVal: string, venueVal: string, driveIdVal?: number) => {
    try {
      setConflictChecking(true);
      const startIso = `${dateVal}T${startVal}:00`;
      const endIso = `${dateVal}T${endVal}:00`;

      const report = await adminApi.detectConflicts({
        start_time: startIso,
        end_time: endIso,
        venue: venueVal,
        drive_id: driveIdVal ? Number(driveIdVal) : undefined,
      });

      setConflictReport(report);
      return report;
    } catch (err: any) {
      console.error("Conflict check failed", err);
      return null;
    } finally {
      setConflictChecking(false);
    }
  };

  const openAddModal = (dateStr?: string) => {
    const defaultDate = dateStr || selectedDate;
    // Parse "Nov 16, 2026" to "2026-11-16"
    try {
      const d = new Date(defaultDate);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setFormDate(`${y}-${m}-${day}`);
    } catch {
      setFormDate("2026-11-16");
    }

    setRoundName("");
    setRoundType("INTERVIEW");
    setStartTime("10:00");
    setEndTime("12:00");
    setSelectedVenue(venues.length > 0 ? venues[0].name : "Main Auditorium (Audi 1)");
    setConflictReport(null);
    setModalState({ type: "ADD", date: defaultDate });

    // Initial conflict check
    setTimeout(() => {
      checkConflicts("2026-11-16", "10:00", "12:00", venues[0]?.name || "Main Auditorium (Audi 1)", Number(selectedDriveId));
    }, 100);
  };

  const handleAdoptAlternative = (slot: any) => {
    try {
      const startObj = new Date(slot.start_time);
      const endObj = new Date(slot.end_time);

      const y = startObj.getFullYear();
      const m = String(startObj.getMonth() + 1).padStart(2, "0");
      const d = String(startObj.getDate()).padStart(2, "0");
      setFormDate(`${y}-${m}-${d}`);

      const sHour = String(startObj.getHours()).padStart(2, "0");
      const sMin = String(startObj.getMinutes()).padStart(2, "0");
      setStartTime(`${sHour}:${sMin}`);

      const eHour = String(endObj.getHours()).padStart(2, "0");
      const eMin = String(endObj.getMinutes()).padStart(2, "0");
      setEndTime(`${eHour}:${eMin}`);

      if (slot.venue) {
        setSelectedVenue(slot.venue);
      }

      setConflictReport({
        has_conflict: false,
        has_hard_blackout: false,
        conflicts: [],
        alternative_slots: [],
      });

      setFeedback({
        message: `Adopted conflict-free alternative slot: ${MONTH_NAMES[startObj.getMonth()]} ${startObj.getDate()} at ${sHour}:${sMin}.`,
        type: "success",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const startIso = `${formDate}T${startTime}:00`;
      const endIso = `${formDate}T${endTime}:00`;

      if (scheduleCategory === "DRIVE_ROUND") {
        if (!selectedDriveId) {
          alert("Please select a placement drive.");
          return;
        }

        const drive = drives.find((d) => d.id === Number(selectedDriveId));
        const roundNum = (drive?.rounds_count || 0) + 1;

        await adminApi.addDriveRound(Number(selectedDriveId), {
          round_number: roundNum,
          name: roundName || `${drive?.name || "Corporate"} Selection Round`,
          round_type: roundType,
          start_time: startIso,
          end_time: endIso,
          venue: selectedVenue,
          instructions: instructions || "Mandatory placement round scheduled via Conflict-Free Scheduler.",
          force: false,
        });

        setFeedback({
          message: `Round successfully scheduled for ${drive?.name || "Placement Drive"} at ${selectedVenue} with automated candidate alerts!`,
          type: "success",
        });
      } else {
        // Institutional Event
        await adminApi.createInstitutionalEvent({
          title: roundName || "Institutional Blackout Event",
          event_type: roundType === "EXAMINATION" ? "EXAMINATION" : "INSTITUTIONAL_BLACKOUT",
          start_time: startIso,
          end_time: endIso,
          affects_branches: ["ALL"],
          is_hard_blackout: isHardBlackout,
          notes: instructions || "Institutional blackout period logged in placement schedule.",
        });

        setFeedback({
          message: "Institutional blackout event recorded and enforced in conflict engine.",
          type: "success",
        });
      }

      setModalState(null);
      await loadData();
    } catch (err: any) {
      console.error("Failed to schedule event", err);
      const msg = err?.data?.message || err?.message || "Failed to schedule event due to a conflict or validation error.";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title="Conflict-Free Scheduler & Automated Notifications"
        description="Automated placement scheduling engine integrated with institutional examination blackouts and candidate notification alerts."
        actionLabel="Schedule Event / Round"
        onAction={() => openAddModal()}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Real-time Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : feedback.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Sidebar */}
          <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-campusblue-900 text-base">
                {monthName} {currentYear}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-campusblue-50 hover:bg-campusblue-100 text-campusblue-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-campusblue-50 hover:bg-campusblue-100 text-campusblue-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-campusblue-400 uppercase">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="py-2"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateString = `${monthName} ${day < 10 ? "0" + day : day}, ${currentYear}`;
                const dateAlt = `${monthName} ${day}, ${currentYear}`;
                const isSelected = selectedDate === dateString || selectedDate === dateAlt;

                const dayEvents = events.filter((e) => e.date === dateString || e.date === dateAlt);
                const hasEvents = dayEvents.length > 0;
                const hasBlackout = dayEvents.some((e) => e.is_blackout);
                const hasConflict = dayEvents.some((e) => e.conflict);

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(dateAlt)}
                    className={`py-2 rounded-lg cursor-pointer font-bold relative transition ${
                      isSelected
                        ? "bg-campusblue-700 text-white shadow-md"
                        : hasBlackout
                        ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        : hasConflict
                        ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                        : hasEvents
                        ? "bg-campusblue-50 text-campusblue-900 hover:bg-campusblue-100"
                        : "hover:bg-campusblue-50 text-slate-700"
                    }`}
                  >
                    {day}
                    {hasBlackout && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    )}
                    {hasEvents && !hasBlackout && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-campusblue-500 rounded-full"></span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="border-t border-campusblue-100 pt-4 space-y-2 text-xs">
              <div className="font-bold text-campusblue-800 uppercase text-[10px] tracking-wider mb-2">Calendar Key</div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>Institutional Examination / Blackout</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-campusblue-600"></span>
                <span>Scheduled Placement Drive Round</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Symposium / Soft Blackout Window</span>
              </div>
            </div>

            {/* Resource Availability Section */}
            <div className="border-t border-campusblue-100 pt-4 space-y-3">
              <h4 className="text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">
                Auditorium & Lab Utilization
              </h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Main Auditorium</span>
                    <span className="text-campusblue-700">75% Booked</span>
                  </div>
                  <div className="w-full bg-campusblue-100 rounded-full h-1.5">
                    <div className="bg-campusblue-600 h-1.5 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Computing Labs (3 & 4)</span>
                    <span className="text-emerald-700">Available</span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "35%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-campusblue-100 bg-campusblue-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-campusblue-900 text-base">
                    {viewMode === "DAY" ? `Schedule for ${selectedDate}` : "Weekly Schedule Overview"}
                  </h3>
                  <p className="text-xs text-campusblue-500 mt-0.5">
                    {displayedEvents.length} scheduled institutional events & rounds
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("DAY")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      viewMode === "DAY"
                        ? "bg-campusblue-600 text-white shadow-sm"
                        : "bg-white border border-campusblue-200 text-campusblue-700 hover:bg-campusblue-50"
                    }`}
                  >
                    Day View
                  </button>
                  <button
                    onClick={() => setViewMode("WEEK")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      viewMode === "WEEK"
                        ? "bg-campusblue-600 text-white shadow-sm"
                        : "bg-white border border-campusblue-200 text-campusblue-700 hover:bg-campusblue-50"
                    }`}
                  >
                    Week View
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {loading ? (
                  <div className="py-16 text-center text-campusblue-500">
                    <div className="w-8 h-8 border-4 border-campusblue-200 border-t-campusblue-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs font-semibold">Loading placement scheduler feed...</p>
                  </div>
                ) : displayedEvents.length === 0 ? (
                  <div className="py-16 text-center text-campusblue-500">
                    <p className="font-semibold text-sm">No events or rounds scheduled for {viewMode === "DAY" ? selectedDate : "this week"}.</p>
                    <button
                      onClick={() => openAddModal(selectedDate)}
                      className="mt-3 text-xs font-bold text-campusblue-700 hover:underline"
                    >
                      + Schedule a round on this date
                    </button>
                  </div>
                ) : (
                  displayedEvents.map((event) => {
                    const isBlackout = event.is_blackout;
                    const isConflict = event.conflict;

                    return (
                      <div
                        key={event.id}
                        className={`border rounded-xl p-5 transition ${
                          isBlackout
                            ? "border-red-200 bg-red-50/40"
                            : isConflict
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-campusblue-100 bg-white hover:border-campusblue-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              {isBlackout ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                                  HARD ACADEMIC BLACKOUT
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-campusblue-100 text-campusblue-800">
                                  {event.type}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-campusblue-600">{event.time}</span>
                              <span className="text-xs text-slate-400">&bull; {event.date}</span>
                            </div>

                            <h4 className="text-base font-bold text-campusblue-900">{event.name}</h4>

                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1.5">
                              <svg className="w-4 h-4 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{event.location}</span>
                            </div>

                            <p className="text-xs text-slate-600 mt-2 font-medium">{event.description}</p>
                          </div>

                          <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                            {isConflict && (
                              <button
                                onClick={() => setModalState({ type: "RESOLVE", event })}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition"
                              >
                                Resolve Collision
                              </button>
                            )}
                            <button
                              onClick={() => setModalState({ type: "DETAILS", event })}
                              className="bg-white border border-campusblue-200 hover:bg-campusblue-50 text-campusblue-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>

                        {/* Real-time Conflict Alert Snippet */}
                        {isConflict && event.conflict_details && event.conflict_details.length > 0 && (
                          <div className="mt-3 p-3 bg-red-100/60 rounded-lg border border-red-200 text-xs text-red-900 flex gap-2">
                            <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <strong>Engine Conflict Alert:</strong> {event.conflict_details[0]?.message}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule / Add Modal with Real-Time Conflict Engine */}
      {modalState?.type === "ADD" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Conflict-Aware Drive & Event Scheduler
              </h2>
              <button
                onClick={() => setModalState(null)}
                className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Category Selector */}
              <div className="flex gap-2 p-1 bg-campusblue-50 rounded-lg border border-campusblue-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScheduleCategory("DRIVE_ROUND")}
                  className={`flex-1 py-1.5 rounded-md transition ${
                    scheduleCategory === "DRIVE_ROUND"
                      ? "bg-white text-campusblue-900 shadow-sm"
                      : "text-campusblue-600 hover:text-campusblue-900"
                  }`}
                >
                  Corporate Drive Round
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleCategory("INSTITUTIONAL_BLACKOUT")}
                  className={`flex-1 py-1.5 rounded-md transition ${
                    scheduleCategory === "INSTITUTIONAL_BLACKOUT"
                      ? "bg-white text-campusblue-900 shadow-sm"
                      : "text-campusblue-600 hover:text-campusblue-900"
                  }`}
                >
                  Institutional Blackout Event
                </button>
              </div>

              {scheduleCategory === "DRIVE_ROUND" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                      Placement Drive
                    </label>
                    <select
                      value={selectedDriveId}
                      onChange={(e) => {
                        setSelectedDriveId(e.target.value);
                        checkConflicts(formDate, startTime, endTime, selectedVenue, Number(e.target.value));
                      }}
                      className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                    >
                      {drives.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.company_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                        Round Name
                      </label>
                      <input
                        required
                        placeholder="e.g. Technical Interview Round 1"
                        value={roundName}
                        onChange={(e) => setRoundName(e.target.value)}
                        className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                        Round Type
                      </label>
                      <select
                        value={roundType}
                        onChange={(e) => setRoundType(e.target.value)}
                        className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                      >
                        <option value="INTERVIEW">Interview</option>
                        <option value="ASSESSMENT">Assessment / Test</option>
                        <option value="GD">Group Discussion</option>
                        <option value="CODING">Coding Challenge</option>
                        <option value="HR">HR Interview</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                      Event Title
                    </label>
                    <input
                      required
                      placeholder="e.g. Mid-Semester Written Examinations"
                      value={roundName}
                      onChange={(e) => setRoundName(e.target.value)}
                      className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                      Blackout Severity
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hardBlackoutCheck"
                        checked={isHardBlackout}
                        onChange={(e) => setIsHardBlackout(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="hardBlackoutCheck" className="text-xs text-slate-700 font-semibold">
                        Hard Academic Blackout (Strictly forbids all concurrent recruitment activities)
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Date & Time Slot */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => {
                      setFormDate(e.target.value);
                      checkConflicts(e.target.value, startTime, endTime, selectedVenue, Number(selectedDriveId));
                    }}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      checkConflicts(formDate, e.target.value, endTime, selectedVenue, Number(selectedDriveId));
                    }}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      checkConflicts(formDate, startTime, e.target.value, selectedVenue, Number(selectedDriveId));
                    }}
                    className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                  />
                </div>
              </div>

              {/* Venue Selector */}
              <div>
                <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                  Campus Venue / Delivery Mode
                </label>
                <select
                  value={selectedVenue}
                  onChange={(e) => {
                    setSelectedVenue(e.target.value);
                    checkConflicts(formDate, startTime, endTime, e.target.value, Number(selectedDriveId));
                  }}
                  className="w-full border border-campusblue-200 rounded-lg p-2 text-xs font-semibold text-campusblue-900"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.building || (v.is_virtual ? "Cloud" : "Campus")}, Cap: {v.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* REAL-TIME CONFLICT ENGINE BANNER */}
              {conflictChecking ? (
                <div className="p-3 bg-campusblue-50 rounded-lg border border-campusblue-100 flex items-center gap-2 text-xs text-campusblue-700">
                  <div className="w-4 h-4 border-2 border-campusblue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Evaluating institutional examination blackouts and venue overlaps...</span>
                </div>
              ) : conflictReport?.has_conflict ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-red-900">
                    <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <div className="font-bold text-red-800 uppercase text-[10px] tracking-wider">
                        {conflictReport.has_hard_blackout ? "CRITICAL HARD BLACKOUT DETECTED" : "CONFLICT DETECTED"}
                      </div>
                      <div className="mt-0.5">{conflictReport.conflicts[0]?.message}</div>
                    </div>
                  </div>

                  {/* Recommended Alternative Slots */}
                  {conflictReport.alternative_slots && conflictReport.alternative_slots.length > 0 && (
                    <div className="pt-2 border-t border-red-200 space-y-2">
                      <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                        Recommended Conflict-Free Alternatives:
                      </div>
                      {conflictReport.alternative_slots.map((slot: any, idx: number) => {
                        const d = new Date(slot.start_time);
                        return (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-red-200 flex justify-between items-center text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800">
                                {MONTH_NAMES[d.getMonth()]} {d.getDate()} &bull; {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <div className="text-[11px] text-slate-500">{slot.recommendation_reason}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAdoptAlternative(slot)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-campusblue-600 hover:bg-campusblue-700 rounded transition shrink-0 ml-2"
                            >
                              Adopt Slot
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : conflictReport && !conflictReport.has_conflict ? (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Verified conflict-free! Venue and candidate calendar slots are completely clear.</span>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                  Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Notes for candidates, reporting time, platform links..."
                  className="w-full border border-campusblue-200 rounded-lg p-2 text-xs resize-none text-slate-800"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-campusblue-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 text-xs font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (conflictReport?.has_hard_blackout && scheduleCategory === "DRIVE_ROUND")}
                  className="px-4 py-2 text-xs font-bold text-white bg-campusblue-600 hover:bg-campusblue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Confirm & Schedule Round"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {modalState?.type === "DETAILS" && modalState.event && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 text-sm">Event Inspection</h2>
              <button
                onClick={() => setModalState(null)}
                className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="font-bold text-base text-campusblue-900">{modalState.event.name}</h3>
              <div className="text-xs text-slate-600 font-mono bg-campusblue-50 p-3 rounded-lg border border-campusblue-100">
                {modalState.event.description}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <span className="text-campusblue-400 block font-bold uppercase text-[10px]">Date</span>
                  <span className="font-semibold">{modalState.event.date}</span>
                </div>
                <div>
                  <span className="text-campusblue-400 block font-bold uppercase text-[10px]">Time Window</span>
                  <span className="font-semibold">{modalState.event.time}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-campusblue-400 block font-bold uppercase text-[10px]">Venue / Delivery Mode</span>
                  <span className="font-semibold">{modalState.event.location}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-campusblue-100 flex justify-end">
                <button
                  onClick={() => setModalState(null)}
                  className="px-4 py-1.5 text-xs font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg border border-campusblue-200"
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
