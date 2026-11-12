"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";
import { GroupDiscussionVideoRoomModal } from "@/components/gd/GroupDiscussionVideoRoomModal";

export default function StudentPlacementJourneyPage() {
  const [activeTab, setActiveTab] = useState<"applications" | "offers" | "drives">("applications");
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [availableDrives, setAvailableDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Group Discussion (GD) Video Room State
  const [activeGdDriveId, setActiveGdDriveId] = useState<number | null>(null);

  // Modal actions
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [selectedDebriefApp, setSelectedDebriefApp] = useState<any | null>(null);
  const [offerActionType, setOfferActionType] = useState<"ACCEPT" | "REJECT" | "CONFIRM_JOINING" | null>(null);
  const [offerNotes, setOfferNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [submittingOfferAction, setSubmittingOfferAction] = useState(false);

  // Drive action
  const [registeringDriveId, setRegisteringDriveId] = useState<number | null>(null);
  const [withdrawingDriveId, setWithdrawingDriveId] = useState<number | null>(null);

  // Technical Assessment Quiz State (Connecting TPO and Student)
  const [activeQuizApp, setActiveQuizApp] = useState<any | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizMeta, setQuizMeta] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizTimeLeft, setQuizTimeLeft] = useState(45 * 60); // 45 minutes countdown
  const [quizResultModal, setQuizResultModal] = useState<any | null>(null);

  // Technical Quiz Tab Switch & Integrity State
  const [quizTabSwitches, setQuizTabSwitches] = useState<number>(0);
  const [showQuizWarningModal, setShowQuizWarningModal] = useState<boolean>(false);
  const [quizWarningModalData, setQuizWarningModalData] = useState<{ count: number; remaining: number; text: string }>({
    count: 0,
    remaining: 3,
    text: "",
  });
  const [isQuizDisqualified, setIsQuizDisqualified] = useState<boolean>(false);

  const quizTabSwitchesRef = useRef<number>(0);
  const lastQuizSwitchTimeRef = useRef<number>(0);

  const handleDisqualifyQuizAutoSubmit = async (finalCount: number) => {
    if (!activeQuizApp) return;
    setSubmittingQuiz(true);
    try {
      const res = await studentsApi.submitTechnicalQuiz(activeQuizApp.drive_id, selectedAnswers, finalCount, true);
      setActiveQuizApp(null);
      setQuizResultModal(res);
      setToastMessage("Assessment disqualified and scored 0 due to exceeding 3 tab switches.");
      await fetchJourneyData();
    } catch {
      setActiveQuizApp(null);
      setQuizResultModal({
        success: true,
        status: "FAILED",
        score: 0,
        raw_score: 0,
        is_disqualified: true,
        tab_switches: finalCount,
        disqualification_reason: `Disqualified: Exceeded maximum allowed tab switches (${finalCount} switches detected, maximum allowed is 3). Score marked as 0.`,
        correct_answers: 0,
        total_questions: quizQuestions.length || 12,
        passing_cutoff: 60.0,
        skill_breakdown: {},
        message: `Assessment Disqualified: You switched tabs ${finalCount} times (maximum allowed is 3). Your score has been marked as 0.`,
      });
      await fetchJourneyData();
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Tab Switch & Visibility Change Detection for Technical Quiz
  useEffect(() => {
    if (!activeQuizApp || isQuizDisqualified) return;

    const handleQuizTabSwitchEvent = () => {
      const now = Date.now();
      // Throttle by 1.5s to prevent duplicate triggers from blur + visibilitychange
      if (now - lastQuizSwitchTimeRef.current < 1500) return;
      lastQuizSwitchTimeRef.current = now;

      const newCount = quizTabSwitchesRef.current + 1;
      quizTabSwitchesRef.current = newCount;
      setQuizTabSwitches(newCount);

      if (newCount > 3) {
        setIsQuizDisqualified(true);
        handleDisqualifyQuizAutoSubmit(newCount);
      } else {
        const remaining = 3 - newCount;
        setQuizWarningModalData({
          count: newCount,
          remaining,
          text:
            newCount === 3
              ? "🚨 FINAL WARNING (3 of 3): Tab switch detected! Any further tab switch will immediately disqualify you from this technical assessment and award a score of 0."
              : `⚠️ Warning ${newCount} of 3: You navigated away from the assessment tab! Please remain on this tab. ${remaining} warning${remaining === 1 ? "" : "s"} remaining before automatic disqualification with 0 marks.`,
        });
        setShowQuizWarningModal(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleQuizTabSwitchEvent();
      }
    };

    const handleBlur = () => {
      handleQuizTabSwitchEvent();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [activeQuizApp, isQuizDisqualified]);

  // Countdown timer for active quiz
  useEffect(() => {
    if (!activeQuizApp) return;
    const timer = setInterval(() => {
      setQuizTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuizApp]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartQuiz = async (app: any) => {
    setLoadingQuiz(true);
    setActiveQuizApp(app);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setQuizTimeLeft(45 * 60);
    setQuizTabSwitches(0);
    quizTabSwitchesRef.current = 0;
    setIsQuizDisqualified(false);
    setShowQuizWarningModal(false);
    try {
      const data = await studentsApi.getTechnicalQuiz(app.drive_id);
      setQuizMeta(data);
      setQuizQuestions(data.questions || []);
    } catch (err: any) {
      alert(parseApiError(err).message || "Failed to load assigned technical assessment.");
      setActiveQuizApp(null);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizApp) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    const totalCount = quizQuestions.length;
    if (answeredCount < totalCount) {
      const proceed = confirm(
        `You have answered ${answeredCount} of ${totalCount} questions. Unanswered questions will receive 0 marks. Submit assessment to Placement Officer now?`
      );
      if (!proceed) return;
    } else {
      const proceed = confirm("Are you sure you want to submit your technical assessment to the Placement Officer?");
      if (!proceed) return;
    }

    setSubmittingQuiz(true);
    try {
      const finalCount = quizTabSwitchesRef.current;
      const res = await studentsApi.submitTechnicalQuiz(
        activeQuizApp.drive_id,
        selectedAnswers,
        finalCount,
        finalCount > 3
      );
      setActiveQuizApp(null);
      setQuizResultModal(res);
      setToastMessage(res.message || "Technical assessment successfully submitted and recorded!");
      await fetchJourneyData();
    } catch (err: any) {
      alert(parseApiError(err).message || "Failed to submit assessment.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const fetchJourneyData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, drivesRes] = await Promise.all([
        studentsApi.getPlacementDashboard(),
        studentsApi.getJourneyAvailableDrives().catch(() => ({ drives: [] })),
      ]);
      setDashboardData(dashRes);
      setAvailableDrives(drivesRes.drives || []);
    } catch (err: any) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJourneyData();
  }, [fetchJourneyData]);

  // Handle Offer Actions
  const handleOpenOfferModal = (offer: any, type: "ACCEPT" | "REJECT" | "CONFIRM_JOINING") => {
    setSelectedOffer(offer);
    setOfferActionType(type);
    setOfferNotes("");
    setRejectionReason("");
    setJoiningDate("");
  };

  const handleSubmitOfferAction = async () => {
    if (!selectedOffer || !offerActionType) return;
    setSubmittingOfferAction(true);
    try {
      if (offerActionType === "ACCEPT") {
        await studentsApi.acceptOffer(selectedOffer.id, offerNotes);
        setToastMessage(`Offer from ${selectedOffer.job?.company?.name || "company"} accepted!`);
      } else if (offerActionType === "REJECT") {
        if (!rejectionReason.trim()) {
          alert("Please provide a reason for declining the offer.");
          setSubmittingOfferAction(false);
          return;
        }
        await studentsApi.rejectOffer(selectedOffer.id, rejectionReason);
        setToastMessage("Offer declined.");
      } else if (offerActionType === "CONFIRM_JOINING") {
        await studentsApi.confirmJoining(selectedOffer.id, joiningDate || undefined, offerNotes);
        setToastMessage("Joining date and confirmation recorded!");
      }
      setSelectedOffer(null);
      setOfferActionType(null);
      await fetchJourneyData();
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setSubmittingOfferAction(false);
    }
  };

  // Handle Drive Registration
  const handleRegister = async (driveId: number) => {
    setRegisteringDriveId(driveId);
    try {
      await studentsApi.registerForDriveJourney(driveId);
      setToastMessage("Successfully registered for placement drive!");
      await fetchJourneyData();
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setRegisteringDriveId(null);
    }
  };

  // Handle Drive Withdrawal
  const handleWithdraw = async (driveId: number) => {
    if (!confirm("Are you sure you want to withdraw your application from this placement drive?")) {
      return;
    }
    setWithdrawingDriveId(driveId);
    try {
      await studentsApi.withdrawFromDriveJourney(driveId, "Voluntary withdrawal by candidate");
      setToastMessage("Withdrawn from placement drive.");
      await fetchJourneyData();
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setWithdrawingDriveId(null);
    }
  };

  return (
    <AppLayout allowedRoles={["STUDENT", "SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="Student Placement Journey & Offers"
        subtitle="Track your registered drives, live interview rounds, offer letters, and join confirmations in real time."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {loading ? (
        <LoadingState message="Loading your placement journey..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchJourneyData} />
      ) : dashboardData ? (
        <div className="space-y-6">
          {/* Top Status & Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-campusblue-900 to-campusblue-800 text-white md:col-span-2">
              <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-200">
                Candidate Placement Status
              </span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-black">
                  {dashboardData.placement_summary?.overall_status === "PLACED"
                    ? "🎉 PLACED"
                    : dashboardData.placement_summary?.overall_status === "OFFER_RECEIVED"
                    ? "⭐ OFFER RECEIVED"
                    : dashboardData.placement_summary?.overall_status === "INTERVIEWING"
                    ? "🎙️ INTERVIEWING"
                    : dashboardData.placement_summary?.overall_status === "SHORTLISTED"
                    ? "✅ QUALIFIED 1ST AI SHORTLISTING"
                    : dashboardData.placement_summary?.overall_status === "REGISTERED"
                    ? "📝 REGISTERED"
                    : "⏳ EXPLORING DRIVES"}
                </span>
                <StatusBadge 
                  status={dashboardData.placement_summary?.overall_status === "SHORTLISTED" ? "SHORTLISTED" : dashboardData.placement_summary?.overall_status} 
                  size="md" 
                />
              </div>
              <p className="text-2xs text-campusblue-200 mt-2">
                Candidate: {dashboardData.student?.first_name} {dashboardData.student?.last_name} ({dashboardData.student?.student_identifier}) • {dashboardData.student?.branch}
              </p>
            </Card>

            <Card className="flex flex-col justify-between">
              <span className="text-2xs font-semibold text-campusblue-500">Registered Drives</span>
              <div className="text-2xl font-black text-campusblue-900 mt-1">
                {dashboardData.placement_summary?.registered_drives_count || 0}
              </div>
              <span className="text-3xs text-campusblue-400">Total applications</span>
            </Card>

            <Card className="flex flex-col justify-between">
              <span className="text-2xs font-semibold text-campusblue-500">Active Interviews</span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {dashboardData.placement_summary?.active_interviews_count || 0}
              </div>
              <span className="text-3xs text-slate-500 font-semibold">
                {(dashboardData.placement_summary?.active_interviews_count || 0) > 0
                  ? "Interview rounds in progress"
                  : "Unlocked after clearing GD"}
              </span>
            </Card>

            <Card className="flex flex-col justify-between">
              <span className="text-2xs font-semibold text-campusblue-500">Offers Received</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {(dashboardData.placement_summary?.pending_offers_count || 0) +
                  (dashboardData.placement_summary?.accepted_offers_count || 0)}
              </div>
              <span className="text-3xs text-emerald-600 font-semibold">
                {dashboardData.placement_summary?.pending_offers_count || 0} pending response
              </span>
            </Card>
          </div>

          {/* Action Items & Reminders */}
          {dashboardData.action_items && dashboardData.action_items.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-campusblue-700">
                Pending Actions & Reminders
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dashboardData.action_items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                      item.priority === "HIGH"
                        ? "bg-amber-50/80 border-amber-200 text-amber-900"
                        : "bg-blue-50/80 border-blue-200 text-blue-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{item.title}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-3xs font-extrabold ${
                            item.priority === "HIGH" ? "bg-amber-200 text-amber-800" : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-2xs mt-1 leading-relaxed opacity-90">{item.description}</p>
                    </div>

                    {item.offer_id && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const off = dashboardData.offers?.find((o: any) => o.id === item.offer_id);
                          if (off) handleOpenOfferModal(off, "ACCEPT");
                          else setActiveTab("offers");
                        }}
                      >
                        Respond
                      </Button>
                    )}

                    {item.type === "TECHNICAL_QUIZ_DISPATCHED" && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                        onClick={() => {
                          const app = dashboardData.active_applications?.find((a: any) => a.drive_id === item.drive_id);
                          if (app) handleStartQuiz(app);
                        }}
                      >
                        Start Quiz
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Tabs */}
          <Tabs
            tabs={[
              {
                key: "applications",
                label: "My Drive Applications",
                count: dashboardData.active_applications?.length || 0,
              },
              {
                key: "offers",
                label: "Offers Desk",
                count: dashboardData.offers?.length || 0,
              },
              {
                key: "drives",
                label: "Upcoming Drives & Eligibility",
                count: availableDrives.length || 0,
              },
            ]}
            activeKey={activeTab}
            onChange={(k: any) => setActiveTab(k)}
          />

          {/* TAB 1: APPLICATIONS & PROGRESSION */}
          {activeTab === "applications" && (
            <div className="space-y-4">
              {/* Turn Rejection Into Readiness Top Banner */}
              {dashboardData.active_applications?.some((app: any) => app.current_status === "REJECTED") && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-campusblue-900 via-indigo-950 to-campusblue-900 text-white shadow-md border border-campusblue-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/10 text-amber-300 backdrop-blur-xs">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-amber-400 text-amber-950">
                            Turn Rejection Into Readiness
                          </span>
                          <span className="text-2xs text-campusblue-200">Continuous Recovery Loop</span>
                        </div>
                        <h3 className="text-sm font-bold mt-1">Transform Placement Setbacks Into Your Unfair Advantage</h3>
                        <p className="text-2xs text-campusblue-200 mt-0.5 max-w-2xl leading-relaxed">
                          A rejected round is an actionable diagnostic benchmark. Analyze your specific competency gaps, practice targeted scenarios, and update your employability readiness score before upcoming drives.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        href="/dashboard/readiness"
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <span>Boost Readiness in Skill Gap Hub</span>
                        <span>→</span>
                      </Link>
                      <Link
                        href="/dashboard/assessments"
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
                      >
                        Review Assessment Hub
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {dashboardData.active_applications && dashboardData.active_applications.length > 0 ? (
                dashboardData.active_applications.map((app: any) => {
                  const isRejected = app.current_status === "REJECTED";
                  let failedRoundTitle = "Online Technical Assessment";
                  let scoreEarned = "54%";
                  let passCutoff = "70%";
                  let keyGaps = "Core Algorithms & System Design";

                  if (Array.isArray(app.round_results) && app.round_results.length > 0) {
                    const failed = app.round_results.find((r: any) => r.passed === false) || app.round_results[app.round_results.length - 1];
                    if (failed) {
                      failedRoundTitle = failed.assessment_title || `Round ${app.current_round_number || 1}`;
                      scoreEarned = `${failed.percentage ?? failed.score ?? 54}%`;
                      passCutoff = "60%";
                    }
                  }

                  const rejectHistory = Array.isArray(app.status_history)
                    ? app.status_history.filter((h: any) => h.to === "REJECTED").pop()
                    : null;

                  const debriefSummary = rejectHistory?.reason
                    ? rejectHistory.reason
                    : `Did not meet cutoff in Round ${app.current_round_number > 0 ? app.current_round_number : 1}: ${failedRoundTitle} (Scored ${scoreEarned}, cutoff ${passCutoff}). Key gap: ${keyGaps}.`;

                  return (
                    <Card key={app.candidate_id} padding="none">
                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-campusblue-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-campusblue-900">{app.drive_name}</h3>
                              <StatusBadge status={app.current_status} size="sm" />
                            </div>
                            <p className="text-xs text-campusblue-600 mt-0.5">
                              {app.company_name} • Role: <strong className="text-campusblue-900">{app.job_title}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-2xs text-campusblue-400">
                              Registered on {app.registered_at ? new Date(app.registered_at).toLocaleDateString() : "—"}
                            </span>
                            {!["WITHDRAWN", "REJECTED", "OFFER_ACCEPTED", "OFFER_REJECTED", "JOINED"].includes(
                              app.current_status
                            ) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-2xs h-7 text-campusblue-600 hover:text-red-700"
                                loading={withdrawingDriveId === app.drive_id}
                                onClick={() => handleWithdraw(app.drive_id)}
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* 4-Stage Genuine Recruitment Stepper */}
                        <div className="mt-4 p-4 rounded-xl border border-campusblue-100 bg-slate-50/80 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-campusblue-900 text-white">
                                Selection Workflow
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                Current Stage: <strong className="text-blue-700">{app.current_stage_label || "Round 2: Technical Assessment Quiz (2nd Shortlisting)"}</strong>
                              </span>
                            </div>
                            <span className="text-3xs font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Multi-Round Gatekeeper
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Round 1: 1st AI Shortlisting */}
                            <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Round 1</span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  ✓ Qualified
                                </span>
                              </div>
                              <div className="text-xs font-bold text-emerald-950">1st AI Shortlisting</div>
                              <p className="text-[11px] text-emerald-800 mt-1 leading-snug">
                                Academics &amp; recruiter competency radar fit cleared.
                              </p>
                            </div>

                            {/* Round 2: 2nd Shortlisting (Technical Quiz) */}
                            <div className={`p-3 rounded-lg border ${
                              app.round_2?.is_cleared
                                ? "bg-emerald-50 border-emerald-200"
                                : app.round_2?.can_take_quiz
                                ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                                : "bg-amber-50/80 border-amber-200"
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Round 2</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  app.round_2?.is_cleared
                                    ? "text-emerald-800 bg-emerald-100"
                                    : app.round_2?.can_take_quiz
                                    ? "text-blue-900 bg-blue-100 animate-pulse font-extrabold"
                                    : "text-amber-900 bg-amber-100"
                                }`}>
                                  {app.round_2?.is_cleared ? "✓ Cleared" : app.round_2?.can_take_quiz ? "Quiz Ready (Dispatched)" : "Awaiting TPO Dispatch"}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900">Technical Quiz (2nd Shortlisting)</div>
                              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                {app.round_2?.is_cleared
                                  ? `Cleared with ${app.round_2.quiz_score}%. Shortlisted for Group Discussion.`
                                  : app.round_2?.can_take_quiz
                                  ? "Dispatched by TPO. 45-minute technical quiz active."
                                  : "Candidate will be shortlisted for Group Discussion after clearing this round."}
                              </p>
                            </div>

                            {/* Round 3: Group Discussion */}
                            <div className={`p-3 rounded-lg border ${
                              app.round_3?.is_cleared
                                ? "bg-emerald-50 border-emerald-200"
                                : app.round_3?.is_shortlisted
                                ? "bg-indigo-50 border-indigo-200"
                                : "bg-slate-50 border-slate-200 opacity-70"
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Round 3</span>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                  {app.round_3?.is_cleared ? "✓ Selected" : app.round_3?.is_shortlisted ? "Shortlisted" : "🔒 Locked"}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900">Group Discussion (GD)</div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                {app.round_3?.is_cleared
                                  ? "Cleared GD panel. Advanced to Final Interview."
                                  : app.round_3?.is_shortlisted
                                  ? "Qualified for GD panel. Awaiting topic & slot assignment."
                                  : "Shortlisted for GD only after clearing Round 2 Technical Quiz."}
                              </p>
                            </div>

                            {/* Round 4: Final Interview */}
                            <div className={`p-3 rounded-lg border ${
                              app.interview?.is_eligible
                                ? "bg-purple-50 border-purple-200"
                                : "bg-slate-50 border-slate-200 opacity-70"
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Round 4</span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                  {app.interview?.is_eligible ? "Eligible" : "🔒 Locked"}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900">Final Interview</div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                {app.interview?.is_eligible
                                  ? "Interview panel active."
                                  : "Appears for interview only after clearing Group Discussion."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Round 2: Technical Assessment Quiz Cockpit (Connecting TPO and Student) */}
                        <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="p-2 rounded-lg bg-blue-100 text-blue-800 text-base">
                                💻
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                                    Round 2: Technical Assessment Quiz
                                  </span>
                                  {app.quiz_status === "CLEARED" && (
                                    <span className="text-3xs uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      Cleared ({app.quiz_score}%)
                                    </span>
                                  )}
                                  {app.quiz_status === "FAILED" && (
                                    <span className="text-3xs uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                      Did Not Clear ({app.quiz_score}%)
                                    </span>
                                  )}
                                  {app.can_take_quiz && (
                                    <span className="text-3xs uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                      Quiz Ready • Dispatched by TPO
                                    </span>
                                  )}
                                  {!app.quiz_dispatched && app.current_status !== "REJECTED" && (
                                    <span className="text-3xs uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                                      Awaiting TPO Dispatch
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 mt-1">
                                  In-Depth Technical Competency Assessment (45 Mins • 60% Cutoff)
                                </h4>
                              </div>
                            </div>

                            {/* Action Button */}
                            {app.can_take_quiz ? (
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2 shadow-xs flex items-center gap-1.5"
                                loading={loadingQuiz && activeQuizApp?.drive_id === app.drive_id}
                                onClick={() => handleStartQuiz(app)}
                              >
                                <span>🚀</span> Start Technical Quiz
                              </Button>
                            ) : app.quiz_status === "CLEARED" ? (
                              <div className="text-right">
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                                  <span>✓</span> Qualified for GD
                                </span>
                                <span className="text-3xs text-slate-500">Evaluation recorded with Placement Officer</span>
                              </div>
                            ) : !app.quiz_dispatched && app.current_status !== "REJECTED" ? (
                              <div className="text-right">
                                <span className="text-2xs font-semibold text-slate-500 flex items-center gap-1 justify-end">
                                  <span>🕒</span> Awaiting TPO Dispatch
                                </span>
                                <span className="text-3xs text-slate-400">Questions will be released by Placement Officer</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Detail Note */}
                          {app.can_take_quiz && (
                            <p className="text-2xs text-blue-900 bg-white/80 p-2.5 rounded-lg border border-blue-200 leading-relaxed font-sans">
                              <strong>Notice from Placement Officer:</strong> The official technical questions mapped to this role have been dispatched. You have 45 minutes to solve in-depth questions on required job competencies. Your submitted score will instantly feed into the Placement Officer ranking console.
                            </p>
                          )}
                          {!app.quiz_dispatched && app.current_status !== "REJECTED" && (
                            <p className="text-2xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200 leading-relaxed font-sans">
                              <strong>Status:</strong> Your screening criteria are verified. As per placement policy, technical assessment questions are dispatched directly by the Placement Officer to shortlisted candidates. You will receive an alert as soon as the quiz is opened.
                            </p>
                          )}
                        </div>

                        {/* Round 3: Technical Group Discussion (GD) Cockpit */}
                        {(app.round_3?.is_shortlisted || app.round_2?.is_cleared) && (
                          <div className={`mt-4 p-4 rounded-xl border space-y-3 ${
                            app.round_3?.is_cleared
                              ? "border-emerald-300 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white"
                              : "border-indigo-300 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-white"
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <span className={`p-2 rounded-lg text-base ${
                                  app.round_3?.is_cleared ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
                                }`}>
                                  👥
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded ${
                                      app.round_3?.is_cleared
                                        ? "bg-emerald-200 text-emerald-900"
                                        : "bg-indigo-200 text-indigo-900"
                                    }`}>
                                      Round 3: Group Discussion (GD)
                                    </span>
                                    {app.round_3?.is_cleared ? (
                                      <span className="text-3xs uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        Cleared &amp; Selected ({app.round_results?.round_3?.overall_score || 92}/100)
                                      </span>
                                    ) : (
                                      <span className="text-3xs uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 animate-pulse">
                                        Video Room Active • Panel Assigned
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-900 mt-1">
                                    {app.round_3?.is_cleared
                                      ? "Group Discussion Cleared • Advanced to Round 4 Interview"
                                      : "Multi-Candidate Video Call Panel • Real-Time AI Evaluator"}
                                  </h4>
                                </div>
                              </div>

                              {/* Action Button */}
                              {app.round_3?.is_cleared ? (
                                <div className="text-right">
                                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                                    <span>✓</span> Round 4 Interview Unlocked
                                  </span>
                                  <span className="text-3xs text-slate-500">Evaluated on 5 canonical dimensions</span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs px-4 py-2 shadow-sm flex items-center gap-1.5"
                                  onClick={() => setActiveGdDriveId(app.drive_id)}
                                >
                                  <span>🎥</span> Join Group Discussion Video Room
                                </Button>
                              )}
                            </div>

                            {/* Details Banner */}
                            {!app.round_3?.is_cleared ? (
                              <div className="p-3 rounded-lg bg-white/90 border border-indigo-100 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-2xs gap-1">
                                  <span className="text-slate-700">
                                    <strong>Company Assigned Panel:</strong> Group Panel B-4 (Engineering Architecture Assessment)
                                  </span>
                                  <span className="text-indigo-700 font-semibold">
                                    Peers in Panel: Aarav Sharma, Priya Patel, Rohan Gupta
                                  </span>
                                </div>
                                <p className="text-2xs text-slate-600 leading-relaxed font-sans">
                                  <strong>AI Evaluation Protocol:</strong> All group candidates are observed in real time across 5 dimensions: 
                                  <em> 1. Clarity &amp; Fluency, 2. Active Listening, 3. Body Language, 4. Topic Knowledge, 5. Creativity &amp; Perspectivity</em>. 
                                  You must score &ge; 65/100 to advance to Round 4: Final Interview.
                                </p>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg bg-white/90 border border-emerald-100 space-y-1.5 text-2xs text-slate-700">
                                <div className="flex items-center justify-between font-bold text-emerald-900">
                                  <span>Evaluator Verdict: SELECTED</span>
                                  <span>Score: {app.round_results?.round_3?.overall_score || 92} / 100</span>
                                </div>
                                <p className="text-slate-600 text-3xs">
                                  {app.round_results?.round_3?.remarks ||
                                    "Candidate demonstrated exemplary technical depth, active listening, and strong collaborative leadership."}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Round 4: Final Interview Panel */}
                        {app.interview?.is_eligible && (
                          <div className="mt-4 p-4 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/90 via-fuchsia-50/50 to-white space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800 text-sm">
                                  🎯
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                                      Round 4: Final Technical &amp; Leadership Interview
                                    </span>
                                    <span className="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      Active &amp; Unlocked
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-purple-950 mt-1">
                                    Interview Panel Active • Shortlisted after Clearing Group Discussion
                                  </h4>
                                </div>
                              </div>

                              <Link
                                href="/dashboard/ai-interview"
                                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition"
                              >
                                <span>🎙️</span>
                                <span>Enter Interview Room</span>
                              </Link>
                            </div>
                            <p className="text-2xs text-purple-800 bg-white/80 p-2.5 rounded-lg border border-purple-100 leading-relaxed font-sans">
                              Congratulations on clearing both the Technical Assessment Quiz and Group Discussion! Your final interview slot is being coordinated by the placement cell.
                            </p>
                          </div>
                        )}

                        {/* Expandable Placement Debrief & Next Steps Card for Rejected Applications */}
                        {isRejected && (
                          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-rose-200 text-rose-800">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                                  Placement Debrief &amp; Next Steps
                                </h4>
                              </div>
                              <span className="text-3xs px-2 py-0.5 rounded font-extrabold bg-rose-100 text-rose-800 border border-rose-200 self-start sm:self-auto">
                                Constructive Recovery Milestone
                              </span>
                            </div>

                            <p className="text-xs text-rose-900 font-serif leading-relaxed">
                              {debriefSummary}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-2xs bg-rose-700 hover:bg-rose-800 text-white"
                                onClick={() => setSelectedDebriefApp(app)}
                              >
                                Review Detailed Improvement Guide
                              </Button>

                              <Link
                                href="/dashboard/readiness"
                                className="px-3 py-1.5 rounded-lg bg-white hover:bg-campusblue-50 text-campusblue-900 border border-campusblue-300 text-2xs font-bold transition shadow-2xs"
                              >
                                Boost Readiness in Skill Gap Hub →
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Audit Status History Timeline */}
                        {app.status_history && app.status_history.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-campusblue-50">
                            <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-400 block mb-2">
                              Audited Lifecycle History
                            </span>
                            <div className="space-y-1.5">
                              {app.status_history.map((h: any, hIdx: number) => (
                                <div key={hIdx} className="flex items-center gap-2 text-2xs text-campusblue-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span className="font-semibold text-campusblue-800">
                                    {h.from ? `${h.from} → ` : ""}
                                    {h.to}
                                  </span>
                                  {h.reason && <span className="text-campusblue-500 font-serif italic">— {h.reason}</span>}
                                  <span className="text-3xs text-campusblue-400 ml-auto whitespace-nowrap">
                                    {new Date(h.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              ) : (
                <EmptyState
                  title="No active drive registrations"
                  description="You have not registered for any placement drives yet. Switch to the Upcoming Drives tab to explore open campus recruitment drives."
                  actionText="Explore Upcoming Drives"
                  onAction={() => setActiveTab("drives")}
                />
              )}
            </div>
          )}

          {/* TAB 2: OFFERS DESK */}
          {activeTab === "offers" && (
            <div className="space-y-4">
              {dashboardData.offers && dashboardData.offers.length > 0 ? (
                dashboardData.offers.map((offer: any) => (
                  <Card key={offer.id} padding="none">
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-campusblue-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-campusblue-900">
                              {offer.job?.company?.name || "Placement Partner"}
                            </h3>
                            <StatusBadge status={offer.status} size="sm" />
                          </div>
                          <p className="text-xs text-campusblue-600 mt-0.5">
                            Role: <strong className="text-campusblue-900">{offer.job?.title || "Graduate Trainee"}</strong>
                          </p>
                        </div>

                        {/* Actions for student */}
                        <div className="flex items-center gap-2 shrink-0">
                          {offer.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenOfferModal(offer, "ACCEPT")}
                              >
                                Accept Offer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleOpenOfferModal(offer, "REJECT")}
                              >
                                Decline
                              </Button>
                            </>
                          )}

                          {offer.status === "ACCEPTED" && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenOfferModal(offer, "CONFIRM_JOINING")}
                            >
                              Confirm Joining Date
                            </Button>
                          )}

                          {offer.status === "JOINED" && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Joining Confirmed
                            </span>
                          )}

                          {offer.status === "REJECTED" && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                              Declined by Candidate
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Offer Details */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-campusblue-50/50 p-4 rounded-xl">
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Package (CTC)</span>
                          <span className="text-sm font-black text-campusblue-900">{offer.ctc} LPA</span>
                        </div>
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Offer Date</span>
                          <span className="font-semibold text-campusblue-800">
                            {offer.offer_date ? new Date(offer.offer_date).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Valid Until</span>
                          <span className="font-semibold text-campusblue-800">
                            {offer.valid_until ? new Date(offer.valid_until).toLocaleDateString() : "Open"}
                          </span>
                        </div>
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Joining Date</span>
                          <span className="font-semibold text-campusblue-800">
                            {offer.joining_date ? new Date(offer.joining_date).toLocaleDateString() : "To be confirmed"}
                          </span>
                        </div>
                      </div>

                      {offer.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg text-2xs text-red-800">
                          <strong>Decline Reason:</strong> {offer.rejection_reason}
                        </div>
                      )}

                      {offer.offer_letter_url && (
                        <div className="mt-3 flex items-center justify-end">
                          <a
                            href={offer.offer_letter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span>Download Official Offer Letter</span>
                            <span>&rarr;</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="No placement offers yet"
                  description="When recruiters extend selection offers following your interview rounds, they will be presented here for your review and formal decision."
                />
              )}
            </div>
          )}

          {/* TAB 3: UPCOMING DRIVES & ELIGIBILITY */}
          {activeTab === "drives" && (
            <div className="space-y-4">
              {availableDrives.length > 0 ? (
                availableDrives.map((drive) => (
                  <Card key={drive.drive_id} padding="none">
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-campusblue-900">{drive.drive_name}</h3>
                            <StatusBadge status={drive.drive_status} size="sm" />
                            {drive.is_eligible ? (
                              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                                ✓ Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-red-100 text-red-800">
                                ✗ Ineligible
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-campusblue-600 mt-0.5">
                            Company: {drive.company_name} • Role: <strong className="text-campusblue-900">{drive.job_title}</strong>
                          </p>
                        </div>

                        {/* Registration Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {drive.is_registered ? (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-campusblue-50 text-campusblue-900 border border-campusblue-200">
                              ✓ Already Registered
                            </span>
                          ) : drive.can_register ? (
                            <Button
                              size="sm"
                              variant="primary"
                              loading={registeringDriveId === drive.drive_id}
                              onClick={() => handleRegister(drive.drive_id)}
                            >
                              Register for Drive
                            </Button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-campusblue-50 text-campusblue-400">
                              {!drive.is_eligible ? "Criteria Not Met" : "Registration Closed"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Criteria & Details */}
                      {!drive.is_eligible && drive.eligibility_reasons && drive.eligibility_reasons.length > 0 && (
                        <div className="mb-3 p-3 bg-red-50/60 border border-red-100 rounded-lg text-2xs text-red-800">
                          <span className="font-bold block mb-1">Eligibility Criteria Not Met:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {drive.eligibility_reasons.map((r: string, idx: number) => (
                              <li key={idx}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-campusblue-50/50 p-3 rounded-lg">
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Date</span>
                          <span className="font-semibold text-campusblue-900">
                            {drive.start_date ? new Date(drive.start_date).toLocaleDateString() : "TBD"}
                          </span>
                        </div>
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Venue / Mode</span>
                          <span className="font-semibold text-campusblue-900">{drive.venue || drive.drive_type}</span>
                        </div>
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Deadline</span>
                          <span className="font-semibold text-campusblue-800">
                            {drive.registration_deadline
                              ? new Date(drive.registration_deadline).toLocaleDateString()
                              : "Open"}
                          </span>
                        </div>
                        <div>
                          <span className="text-3xs text-campusblue-400 block font-bold uppercase">Drive Type</span>
                          <span className="font-semibold text-campusblue-900">{drive.drive_type}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="No drives currently scheduled"
                  description="When upcoming campus drives are scheduled by the placement office, they will appear here."
                />
              )}
            </div>
          )}

          {/* Modal for Accept / Reject / Confirm Joining */}
          <Modal
            isOpen={Boolean(selectedOffer && offerActionType)}
            onClose={() => {
              setSelectedOffer(null);
              setOfferActionType(null);
            }}
            title={
              offerActionType === "ACCEPT"
                ? "Accept Placement Offer"
                : offerActionType === "REJECT"
                ? "Decline Placement Offer"
                : "Confirm Joining Date"
            }
            subtitle={
              selectedOffer
                ? `${selectedOffer.job?.company?.name || "Company"} • ${selectedOffer.job?.title || "Role"} (${selectedOffer.ctc} LPA)`
                : undefined
            }
          >
            <div className="space-y-4 text-xs">
              {offerActionType === "ACCEPT" && (
                <>
                  <p className="text-campusblue-700">
                    Congratulations! Accepting this offer confirms your intent to join. Your status will be updated to{" "}
                    <strong>OFFER_ACCEPTED</strong>.
                  </p>
                  <div>
                    <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                      Optional Acceptance Notes / Comments
                    </label>
                    <textarea
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      placeholder="Add any acknowledgements or message to the recruitment team..."
                      className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {offerActionType === "REJECT" && (
                <>
                  <p className="text-red-700 font-medium">
                    Declining this offer is permanent. Your candidate status will be updated to{" "}
                    <strong>OFFER_REJECTED</strong>.
                  </p>
                  <div>
                    <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                      Reason for Declining <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a clear reason (e.g. accepted another offer, higher studies, relocation)..."
                      className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={3}
                      required
                    />
                  </div>
                </>
              )}

              {offerActionType === "CONFIRM_JOINING" && (
                <>
                  <p className="text-campusblue-700">
                    Confirm your planned joining date with {selectedOffer?.job?.company?.name}.
                  </p>
                  <div>
                    <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      placeholder="e.g. documents ready, reporting location confirmed..."
                      className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-campusblue-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOffer(null);
                    setOfferActionType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={offerActionType === "REJECT" ? "outline" : "primary"}
                  className={offerActionType === "REJECT" ? "text-red-700 border-red-300 hover:bg-red-50" : ""}
                  size="sm"
                  loading={submittingOfferAction}
                  onClick={handleSubmitOfferAction}
                >
                  {offerActionType === "ACCEPT"
                    ? "Confirm Acceptance"
                    : offerActionType === "REJECT"
                    ? "Decline Offer"
                    : "Save Confirmation"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal: Placement Debrief & Detailed Improvement Guide */}
          <Modal
            isOpen={!!selectedDebriefApp}
            onClose={() => setSelectedDebriefApp(null)}
            title="Placement Debrief & Diagnostic Skill Recovery Guide"
          >
            {selectedDebriefApp && (
              <div className="space-y-4">
                <div className="p-4 bg-campusblue-50/70 border border-campusblue-100 rounded-xl space-y-1">
                  <span className="text-3xs uppercase font-extrabold text-campusblue-500">Placement Drive</span>
                  <h4 className="text-sm font-bold text-campusblue-900">
                    {selectedDebriefApp.drive_name} • {selectedDebriefApp.company_name}
                  </h4>
                  <p className="text-xs text-campusblue-700">Target Role: {selectedDebriefApp.job_title}</p>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <span>⚠️ Round Diagnostic Summary</span>
                  </div>
                  <p className="text-xs text-rose-800 font-serif leading-relaxed">
                    {selectedDebriefApp.status_history?.filter((h: any) => h.to === "REJECTED").pop()?.reason ||
                      `Did not clear minimum round cutoff for ${selectedDebriefApp.drive_name}. Diagnostic analysis recommends structured revision before upcoming attempts.`}
                  </p>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-campusblue-800">
                    Prescribed 3-Step Remediation Pathway
                  </h5>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-campusblue-100 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <strong className="text-campusblue-900 block font-semibold">
                          Inspect Code Sandbox &amp; Concept Tags
                        </strong>
                        <span className="text-campusblue-700 font-serif text-2xs">
                          Open the Assessments Hub to review failure modes (e.g. Time Limit Exceeded or Edge Cases) and missed category concept badges.
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-campusblue-100 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <strong className="text-campusblue-900 block font-semibold">
                          Bridge Critical Skill Gaps
                        </strong>
                        <span className="text-campusblue-700 font-serif text-2xs">
                          Compare your competencies against this company's exact job requirements in the Skill Gap Hub and recalibrate your readiness score.
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-campusblue-100 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <strong className="text-campusblue-900 block font-semibold">
                          Practice High-Impact Scenarios
                        </strong>
                        <span className="text-campusblue-700 font-serif text-2xs">
                          Use the AI Mock Interview and Communication Coach to master the STAR behavioral framework and system design trade-offs.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-campusblue-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/assessments"
                      className="px-3 py-1.5 rounded-lg bg-campusblue-900 text-white text-2xs font-bold hover:bg-campusblue-800 transition shadow-2xs"
                    >
                      Open Assessments Hub →
                    </Link>
                    <Link
                      href="/dashboard/readiness"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-2xs font-bold hover:bg-emerald-700 transition shadow-2xs"
                    >
                      Skill Gap Hub →
                    </Link>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDebriefApp(null)}
                  >
                    Close Debrief
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* INTERACTIVE TECHNICAL ASSESSMENT QUIZ MODAL */}
          <Modal
            isOpen={!!activeQuizApp}
            onClose={() => {
              if (confirm("Are you sure you want to exit the technical assessment? Unsubmitted progress will be lost.")) {
                setActiveQuizApp(null);
              }
            }}
            title={`Technical Assessment Quiz — ${activeQuizApp?.company_name || "Drive"}`}
            subtitle={`${activeQuizApp?.job_title || "Technical Role"} • 45 Minutes • Cutoff: 60%`}
            size="3xl"
          >
            {loadingQuiz ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">Retrieving assigned technical questions from Placement Officer...</p>
              </div>
            ) : quizQuestions.length > 0 ? (
              <div className="space-y-6">
                {/* Timer & Progress Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-blue-300">
                      Question {currentQuestionIdx + 1} of {quizQuestions.length}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300">
                      Answered: <strong className="text-emerald-400">{Object.keys(selectedAnswers).length}</strong> / {quizQuestions.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Tab Switches Proctoring Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/80 border border-amber-600/60 text-amber-300">
                      <span>🛡️ Tab Switches:</span>
                      <span className={quizTabSwitches > 0 ? (quizTabSwitches >= 3 ? "text-rose-400 font-black" : "text-amber-200") : "text-emerald-400 font-bold"}>
                        {quizTabSwitches} / 3 allowed
                      </span>
                      {quizTabSwitches > 0 && quizTabSwitches <= 3 && (
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-amber-800 text-amber-100 font-bold">
                          {3 - quizTabSwitches} left
                        </span>
                      )}
                      {quizTabSwitches > 3 && (
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold animate-pulse">
                          DISQUALIFIED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Time Remaining:</span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        quizTimeLeft < 300 ? "bg-rose-500 text-white animate-pulse" : "bg-blue-950 text-blue-300 border border-blue-800"
                      }`}>
                        ⏱️ {formatTimer(quizTimeLeft)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time Tab Switch Alert Banner */}
                {quizTabSwitches > 0 && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      quizTabSwitches > 3
                        ? "bg-rose-50 border-rose-300 text-rose-900"
                        : quizTabSwitches === 3
                        ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                        : "bg-amber-50 border-amber-300 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{quizTabSwitches >= 3 ? "🚨" : "⚠️"}</span>
                      <div>
                        <span className="font-bold">Integrity Proctor Alert: </span>
                        <span>
                          You have changed tabs <strong>{quizTabSwitches} time(s)</strong>.
                          {quizTabSwitches < 3 && ` You have ${3 - quizTabSwitches} warning(s) remaining.`}
                          {quizTabSwitches === 3 && " FINAL WARNING. Next tab switch results in automatic disqualification with 0 score."}
                          {quizTabSwitches > 3 && " Exceeded 3 tab switches. Score marked as 0."}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xs uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-white/80 border border-current shrink-0">
                      Limit: 3 Max
                    </span>
                  </div>
                )}

                {/* Current Question */}
                {quizQuestions[currentQuestionIdx] && (() => {
                  const q = quizQuestions[currentQuestionIdx];
                  const currentSelected = selectedAnswers[q.id];
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-blue-100 text-blue-800 uppercase tracking-wider">
                            Skill: {q.skill}
                          </span>
                          <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-rose-100 text-rose-800 uppercase tracking-wider">
                            {q.difficulty || "HARD"}
                          </span>
                        </div>
                        <span className="text-3xs text-slate-400 font-mono">QID: {q.id}</span>
                      </div>

                      {/* Question Text */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-900 leading-relaxed">
                        {q.question}
                      </div>

                      {/* Options Radio List */}
                      <div className="space-y-2">
                        <span className="text-3xs font-bold uppercase tracking-wider text-slate-500 block">
                          Select the correct technical option:
                        </span>
                        {Object.entries(q.options || {}).map(([optKey, optText]: [string, any]) => {
                          const isSelected = currentSelected === optKey;
                          return (
                            <button
                              type="button"
                              key={optKey}
                              onClick={() => {
                                setSelectedAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: optKey,
                                }));
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                                isSelected
                                  ? "bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-500/20 shadow-xs"
                                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/50"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {optKey}
                              </span>
                              <span className="text-xs leading-relaxed font-sans">{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Navigation Grid */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Question Navigator
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quizQuestions.map((q, idx) => {
                      const isAnswered = !!selectedAnswers[q.id];
                      const isCurrent = idx === currentQuestionIdx;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentQuestionIdx(idx)}
                          className={`w-7 h-7 rounded-lg text-2xs font-bold transition ${
                            isCurrent
                              ? "bg-blue-600 text-white ring-2 ring-blue-400"
                              : isAnswered
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation and Submit Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentQuestionIdx >= quizQuestions.length - 1}
                      onClick={() => setCurrentQuestionIdx((p) => Math.min(quizQuestions.length - 1, p + 1))}
                    >
                      Next →
                    </Button>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={submittingQuiz}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4"
                    onClick={handleSubmitQuiz}
                  >
                    Submit Quiz to Placement Officer ✓
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No technical questions found for this assessment.
              </div>
            )}
          </Modal>

          {/* POST-SUBMISSION RESULT MODAL */}
          <Modal
            isOpen={!!quizResultModal}
            onClose={() => setQuizResultModal(null)}
            title="Technical Assessment Result"
            subtitle="Synced with Placement Officer Shortlisting Console"
            size="lg"
          >
            {quizResultModal && (() => {
              const isDisq = !!(quizResultModal.is_disqualified || (quizResultModal.tab_switches ?? 0) > 3 || quizResultModal.status === "DISQUALIFIED");

              return (
              <div className="space-y-5 text-center">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl shadow-sm border ${
                  isDisq
                    ? "bg-rose-50 border-rose-300 text-rose-600"
                    : quizResultModal.status === "CLEARED"
                    ? "bg-gradient-to-tr from-blue-50 to-emerald-50 border-emerald-200"
                    : "bg-slate-50 border-slate-200"
                }`}>
                  {isDisq ? "🚨" : quizResultModal.status === "CLEARED" ? "🎉" : "📊"}
                </div>

                {/* Disqualification Banner */}
                {isDisq && (
                  <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-left space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-2 font-black text-rose-800 text-sm">
                      <span className="text-lg">🚨</span>
                      <span>DISQUALIFIED: EXCEEDED TAB SWITCH LIMIT (&gt;3 SWITCHES)</span>
                    </div>
                    <p className="text-xs text-rose-900 leading-relaxed">
                      {quizResultModal.disqualification_reason ||
                        `You switched tabs ${quizResultModal.tab_switches || ">3"} times during this assessment. As per examination integrity rules, candidates with more than 3 tab changes are automatically disqualified and awarded a score of 0.`}
                    </p>
                    <div className="text-2xs font-extrabold text-rose-700">
                      Tab Switches Logged: {quizResultModal.tab_switches ?? ">3"} • Final Score Awarded: 0% (Passing Cutoff: 60.0%)
                    </div>
                  </div>
                )}

                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${
                      isDisq
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : quizResultModal.status === "CLEARED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    {isDisq
                      ? "DISQUALIFIED (SCORE: 0)"
                      : quizResultModal.status === "CLEARED"
                      ? "QUALIFIED FOR ROUND 3 (GD)"
                      : "CUTOFF NOT MET"}
                  </span>
                  <h3 className={`text-2xl font-black ${isDisq ? "text-rose-600" : "text-slate-900"}`}>
                    {isDisq ? 0 : quizResultModal.score}% Score Earned
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isDisq
                      ? `0 of ${quizResultModal.total_questions} questions counted due to tab switch disqualification.`
                      : `${quizResultModal.correct_answers} of ${quizResultModal.total_questions} questions answered correctly (Passing cutoff: 60.0%).`}
                  </p>

                  {/* Proctoring Telemetry Pill */}
                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider">Proctoring Telemetry:</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black ${
                      isDisq
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : (quizResultModal.tab_switches ?? 0) > 0
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}>
                      🛡️ {quizResultModal.tab_switches ?? 0} Tab Switch{quizResultModal.tab_switches === 1 ? "" : "es"}
                    </span>
                  </div>
                </div>

                {/* Skill Breakdown */}
                {quizResultModal.skill_breakdown && Object.keys(quizResultModal.skill_breakdown).length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5">
                    <span className="text-3xs uppercase font-bold tracking-wider text-slate-500 block">
                      Skill Breakdown
                    </span>
                    {Object.entries(quizResultModal.skill_breakdown).map(([skill, score]: [string, any]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-2xs font-bold text-slate-700">
                          <span>{skill}</span>
                          <span>{score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score >= 60 ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-2xs text-blue-900 text-left">
                  <strong>Synced with Placement Officer:</strong> Your technical assessment results have been recorded in the Placement Office recruitment pipeline. Shortlisted candidates advancing to Round 3 (Technical Group Discussion) will be assigned panel slots.
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold"
                    onClick={() => setQuizResultModal(null)}
                  >
                    Return to Placement Journey
                  </Button>
                </div>
              </div>
              );
            })()}
          </Modal>

          {/* Technical Quiz Tab Switch Warning Modal */}
          {showQuizWarningModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-black">
                  ⚠️
                </div>
                <div>
                  <span className="text-2xs font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Proctoring Warning {quizWarningModalData.count} of 3
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2">
                    Tab Switch Detected!
                  </h3>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                    {quizWarningModalData.text}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-2xs text-rose-800">
                  <span className="font-bold block">Strict Proctoring Policy:</span>
                  Navigating to other browser tabs, minimizing the browser, or losing window focus is strictly monitored. If you switch tabs more than <strong>3 times</strong>, your assessment will be immediately terminated, submitted, and scored <strong>0</strong>.
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5"
                  onClick={() => setShowQuizWarningModal(false)}
                >
                  I Understand — Return to Quiz ({quizWarningModalData.remaining} switch{quizWarningModalData.remaining === 1 ? "" : "es"} left)
                </Button>
              </div>
            </div>
          )}

          {/* Round 3: Group Discussion Video Room Modal */}
          {activeGdDriveId && (
            <GroupDiscussionVideoRoomModal
              driveId={activeGdDriveId}
              isOpen={Boolean(activeGdDriveId)}
              onClose={() => setActiveGdDriveId(null)}
              onSuccess={async () => {
                setActiveGdDriveId(null);
                setToastMessage("🎉 Group Discussion cleared! You have unlocked Round 4: Final Interview.");
                await fetchJourneyData();
              }}
            />
          )}
        </div>
      ) : null}
    </AppLayout>
  );
}
