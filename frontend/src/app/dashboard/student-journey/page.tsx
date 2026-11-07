"use client";

import React, { useEffect, useState, useCallback } from "react";
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

export default function StudentPlacementJourneyPage() {
  const [activeTab, setActiveTab] = useState<"applications" | "offers" | "drives">("applications");
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [availableDrives, setAvailableDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal actions
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [offerActionType, setOfferActionType] = useState<"ACCEPT" | "REJECT" | "CONFIRM_JOINING" | null>(null);
  const [offerNotes, setOfferNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [submittingOfferAction, setSubmittingOfferAction] = useState(false);

  // Drive action
  const [registeringDriveId, setRegisteringDriveId] = useState<number | null>(null);
  const [withdrawingDriveId, setWithdrawingDriveId] = useState<number | null>(null);

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
                    : dashboardData.placement_summary?.overall_status === "REGISTERED"
                    ? "📝 REGISTERED"
                    : "⏳ EXPLORING DRIVES"}
                </span>
                <StatusBadge status={dashboardData.placement_summary?.overall_status} size="md" />
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
              <div className="text-2xl font-black text-blue-600 mt-1">
                {dashboardData.placement_summary?.active_interviews_count || 0}
              </div>
              <span className="text-3xs text-campusblue-400">Rounds in progress</span>
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
              {dashboardData.active_applications && dashboardData.active_applications.length > 0 ? (
                dashboardData.active_applications.map((app: any) => (
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

                      {/* Current Round & Progression */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-campusblue-50/50 p-3 rounded-lg">
                          <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-400 block">
                            Current Stage
                          </span>
                          <span className="text-xs font-bold text-campusblue-900 mt-1 block">
                            {app.current_round_number > 0 ? `Round ${app.current_round_number}` : "Registration"}
                          </span>
                        </div>

                        <div className="bg-campusblue-50/50 p-3 rounded-lg sm:col-span-2">
                          <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-400 block">
                            Round Results / Outcomes
                          </span>
                          <div className="mt-1 text-2xs text-campusblue-800">
                            {app.round_results && Object.keys(app.round_results).length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(app.round_results).map(([roundKey, result]: [string, any]) => (
                                  <span
                                    key={roundKey}
                                    className="px-2 py-0.5 bg-white border border-campusblue-200 rounded font-semibold"
                                  >
                                    {roundKey}: {result?.result || result?.score || JSON.stringify(result)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-campusblue-400">Awaiting round evaluation results</span>
                            )}
                          </div>
                        </div>
                      </div>

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
                ))
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
        </div>
      ) : null}
    </AppLayout>
  );
}
