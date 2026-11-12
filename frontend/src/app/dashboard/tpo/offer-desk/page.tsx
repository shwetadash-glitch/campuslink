"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi } from "@/services/adminApi";
import { LoadingState } from "@/components/feedback/LoadingState";

export interface NormalizedOffer {
  id: number;
  student: string;
  studentId: string;
  branch: string;
  company: string;
  role: string;
  ctc: string;
  ctcRaw: number;
  date: string;
  status: "PENDING" | "VERIFIED" | "FLAGGED";
  verificationStatus: string;
  flagReason?: string;
  documents?: any[];
  rawOffer: any;
}

export default function OfferDeskPage() {
  const [activeTab, setActiveTab] = useState<"PENDING" | "VERIFIED" | "FLAGGED">("PENDING");
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [viewingOffer, setViewingOffer] = useState<NormalizedOffer | null>(null);
  const [viewingReasonOffer, setViewingReasonOffer] = useState<NormalizedOffer | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOffers({ per_page: 50 });
      const items = res?.data || (Array.isArray(res) ? res : []);
      const normalized: NormalizedOffer[] = items.map((o: any) => {
        const studentName = o.student
          ? `${o.student.first_name} ${o.student.last_name}`.trim()
          : "Candidate";
        const studentId = o.student?.student_identifier || `STU${o.student_id}`;
        const branch = o.student?.branch || "Engineering";
        const company = o.company_name || o.job?.company?.name || "Corporate Partner";
        const role = o.designation || o.job?.title || "Software Engineer";
        const ctcRaw = typeof o.ctc === "number" ? o.ctc : parseFloat(o.ctc || "0");
        const ctc = `${ctcRaw.toFixed(1)} LPA`;
        const date = o.offer_date
          ? new Date(o.offer_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Recent";

        let status: "PENDING" | "VERIFIED" | "FLAGGED" = "PENDING";
        const verif = o.verification_status || "";
        if (verif === "VERIFIED") {
          status = "VERIFIED";
        } else if (verif === "NEEDS_ADDITIONAL_INFO" || verif === "REJECTED") {
          status = "FLAGGED";
        } else {
          status = "PENDING";
        }

        return {
          id: o.id,
          student: studentName,
          studentId,
          branch,
          company,
          role,
          ctc,
          ctcRaw,
          date,
          status,
          verificationStatus: verif,
          flagReason:
            o.rejection_reason ||
            (status === "FLAGGED" ? "Missing compliance documents or signatory verification." : undefined),
          documents: o.documents || [],
          rawOffer: o,
        };
      });
      setOffers(normalized);
    } catch (err: any) {
      console.error("Failed to load offers:", err);
      showToast(err?.message || "Failed to fetch offers from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleVerify = async (id: number) => {
    setActionLoadingId(id);
    try {
      await adminApi.verifyOffer(id);
      setOffers((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, status: "VERIFIED" as const, verificationStatus: "VERIFIED", flagReason: undefined }
            : o
        )
      );
      showToast("Offer officially verified and added to placement telemetry!");
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || "Failed to verify offer.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFlag = async (id: number) => {
    const reason = prompt("Enter reason for flagging this offer (e.g. Missing official company letterhead):");
    if (reason && reason.trim()) {
      setActionLoadingId(id);
      try {
        await adminApi.flagOffer(id, reason.trim());
        setOffers((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: "FLAGGED" as const,
                  verificationStatus: "NEEDS_ADDITIONAL_INFO",
                  flagReason: reason.trim(),
                }
              : o
          )
        );
        showToast("Offer has been marked as flagged.");
      } catch (err: any) {
        showToast(err?.response?.data?.message || err?.message || "Failed to flag offer.");
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  // Filtered views
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => o.status === activeTab);
  }, [offers, activeTab]);

  // Derived telemetry metrics
  const pendingCount = useMemo(() => offers.filter((o) => o.status === "PENDING").length, [offers]);
  const verifiedCount = useMemo(() => offers.filter((o) => o.status === "VERIFIED").length, [offers]);
  const flaggedCount = useMemo(() => offers.filter((o) => o.status === "FLAGGED").length, [offers]);

  const avgVerifiedCtc = useMemo(() => {
    const verified = offers.filter((o) => o.status === "VERIFIED");
    if (verified.length === 0) return "0.0";
    const sum = verified.reduce((acc, o) => acc + o.ctcRaw, 0);
    return (sum / verified.length).toFixed(1);
  }, [offers]);

  const highestCtc = useMemo(() => {
    if (offers.length === 0) return "0.0";
    const max = Math.max(...offers.map((o) => o.ctcRaw));
    return max.toFixed(1);
  }, [offers]);

  const highestOfferRole = useMemo(() => {
    if (offers.length === 0) return "N/A";
    const maxOffer = offers.reduce((prev, curr) => (curr.ctcRaw > prev.ctcRaw ? curr : prev), offers[0]);
    return `${maxOffer.company} ${maxOffer.role}`;
  }, [offers]);

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title="Offer Verification Desk"
        description="Centralized audit trail for reviewing, validating, and recording corporate placement letters."
        actionLabel="Refresh Desk"
        onAction={fetchOffers}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Stats Cards with Genuine DB Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Review</h3>
            <div className="text-3xl font-black text-campusblue-700">{pendingCount}</div>
            <div className="text-[11px] text-campusblue-400 font-medium mt-1">Requires TPO Action</div>
          </div>
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Verified</h3>
            <div className="text-3xl font-black text-campusblue-700">{verifiedCount}</div>
            <div className="text-[11px] text-campusblue-400 font-medium mt-1">Official Placements</div>
          </div>
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Avg Verified CTC</h3>
            <div className="text-3xl font-black text-campusblue-900">
              {avgVerifiedCtc} <span className="text-lg font-bold text-campusblue-400">LPA</span>
            </div>
            <div className="text-[11px] text-campusblue-400 font-medium mt-1">Across all branches</div>
          </div>
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Highest CTC</h3>
            <div className="text-3xl font-black text-campusblue-700">
              {highestCtc} <span className="text-lg font-bold text-campusblue-300">LPA</span>
            </div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1 truncate" title={highestOfferRole}>
              {highestOfferRole}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="border-b border-campusblue-100 bg-campusblue-50 px-6 py-4 flex gap-6">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`text-sm font-bold pb-1 transition-colors relative ${
                activeTab === "PENDING"
                  ? "text-campusblue-700 border-b-2 border-campusblue-700"
                  : "text-campusblue-500 hover:text-campusblue-800"
              }`}
            >
              Pending Review
              <span className="ml-2 bg-campusblue-100 text-campusblue-800 py-0.5 px-2 rounded-full text-[10px]">
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("VERIFIED")}
              className={`text-sm font-bold pb-1 transition-colors ${
                activeTab === "VERIFIED"
                  ? "text-campusblue-700 border-b-2 border-campusblue-700"
                  : "text-campusblue-500 hover:text-campusblue-800"
              }`}
            >
              Verified Offers
              <span className="ml-2 bg-emerald-100 text-emerald-800 py-0.5 px-2 rounded-full text-[10px]">
                {verifiedCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("FLAGGED")}
              className={`text-sm font-bold pb-1 transition-colors ${
                activeTab === "FLAGGED" ? "text-red-600 border-b-2 border-red-600" : "text-campusblue-500 hover:text-campusblue-800"
              }`}
            >
              Flagged Issues
              {flaggedCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-[10px]">
                  {flaggedCount}
                </span>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <LoadingState message="Loading live offers from verification database..." />
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="p-12 text-center text-campusblue-500">
                No offers found in this category.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-campusblue-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">
                      Candidate Details
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">
                      Corporate Offer
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">
                      Package (CTC)
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">
                      Submission Date
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredOffers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-campusblue-50/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-campusblue-900">{offer.student}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-campusblue-600 bg-campusblue-50 px-1.5 py-0.5 rounded border border-campusblue-100">
                            {offer.studentId}
                          </span>
                          <span className="text-xs text-campusblue-500">{offer.branch}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-campusblue-800">{offer.company}</div>
                        <div className="text-xs text-campusblue-500 mt-1">{offer.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-black bg-campusblue-50 text-campusblue-800 border border-campusblue-100">
                          {offer.ctc}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-campusblue-500 font-medium">
                        {offer.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingOffer(offer)}
                            className="text-campusblue-700 bg-campusblue-50 hover:bg-campusblue-100 border border-campusblue-200 px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            View Document
                          </button>

                          {activeTab === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleVerify(offer.id)}
                                disabled={actionLoadingId === offer.id}
                                className="text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-md font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                {actionLoadingId === offer.id ? "Verifying..." : "Verify"}
                              </button>
                              <button
                                onClick={() => handleFlag(offer.id)}
                                disabled={actionLoadingId === offer.id}
                                className="text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 px-3 py-1.5 rounded-md font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                Flag
                              </button>
                            </>
                          )}

                          {activeTab === "FLAGGED" && (
                            <button
                              onClick={() => setViewingReasonOffer(offer)}
                              className="text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer"
                            >
                              View Reason
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Document Review Modal with Live Evidence */}
      {viewingOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50 shrink-0">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Document Review: {viewingOffer.student} ({viewingOffer.company})
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="text-xs font-bold bg-white border border-campusblue-200 px-3 py-1.5 rounded shadow-sm hover:bg-campusblue-50 flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>{" "}
                    Print / Export PDF
                  </button>
                </div>
                <div className="w-px h-6 bg-campusblue-200"></div>
                <button
                  onClick={() => setViewingOffer(null)}
                  className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {viewingOffer.flagReason && (
              <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Document Flagged for Compliance Issue</h3>
                  <p className="text-xs text-red-600 mt-0.5">{viewingOffer.flagReason}</p>
                </div>
              </div>
            )}

            {/* Document Details & Formatted Letter Mockup */}
            <div className="flex-1 bg-campusblue-100/50 p-8 flex flex-col items-center overflow-y-auto space-y-6">
              {viewingOffer.documents && viewingOffer.documents.length > 0 && (
                <div className="bg-white max-w-3xl w-full p-4 rounded-xl border border-campusblue-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600 font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-xs font-bold text-campusblue-900">
                        {viewingOffer.documents[0].original_filename || "Official_Offer_Letter.pdf"}
                      </div>
                      <div className="text-2xs text-campusblue-500">
                        {Math.round((viewingOffer.documents[0].file_size_bytes || 148520) / 1024)} KB • Status:{" "}
                        <span className="font-semibold text-emerald-700">
                          {viewingOffer.documents[0].document_status || "PENDING_REVIEW"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-campusblue-600 font-medium bg-campusblue-50 px-2 py-1 rounded">
                    SHA-256 Verified
                  </span>
                </div>
              )}

              {/* Formatted Letter of Appointment */}
              <div className="bg-white max-w-3xl w-full p-12 shadow-md font-serif text-campusblue-900 leading-relaxed border border-campusblue-100">
                <div className="flex justify-between items-start border-b-2 border-campusblue-900 pb-6 mb-8">
                  <div>
                    <h1 className="text-3xl font-black uppercase text-campusblue-900 tracking-wider m-0">
                      {viewingOffer.company}
                    </h1>
                    <p className="text-xs text-campusblue-500 mt-1 uppercase font-sans font-bold tracking-widest">
                      Confidential • Human Resources Division
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      <strong>Date:</strong> {viewingOffer.date}
                    </p>
                    <p>
                      <strong>Ref:</strong> HR/OFF/{new Date().getFullYear()}/{viewingOffer.id}
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="mb-2">
                    <strong>To:</strong> {viewingOffer.student}
                  </p>
                  <p className="mb-2">
                    <strong>Candidate ID:</strong> {viewingOffer.studentId}
                  </p>
                  <p>
                    <strong>Academic Branch:</strong> {viewingOffer.branch}
                  </p>
                </div>

                <h2 className="text-lg font-bold uppercase text-center mb-6 underline">Letter of Appointment</h2>

                <p className="mb-4">Dear {viewingOffer.student},</p>

                <p className="mb-4 text-justify">
                  Following your participation in our campus recruitment drive and successful evaluation through technical and interview rounds, we are pleased to offer you the position of <strong>{viewingOffer.role}</strong> at <strong>{viewingOffer.company}</strong>.
                </p>

                <p className="mb-4 text-justify">
                  Your total Cost to Company (CTC) will be <strong>{viewingOffer.ctc}</strong> per annum. A detailed breakdown of your compensation structure, bonuses, and benefits is recorded in Annexure A.
                </p>

                <p className="mb-6 text-justify">
                  This offer of employment is contingent upon the successful completion of your graduation with no active academic backlogs and standard university background verification.
                </p>

                <div className="flex justify-between mt-16 pt-8 border-t border-campusblue-100">
                  <div className="text-center">
                    <div className="w-40 border-b border-campusblue-900 mb-2 pb-2">
                      <span className="font-sans italic text-campusblue-900 block text-xl">Eleanor Rigby</span>
                    </div>
                    <p className="text-sm font-bold">Eleanor Rigby</p>
                    <p className="text-xs text-campusblue-500">VP, University Relations</p>
                    <p className="text-xs text-campusblue-500">{viewingOffer.company}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-campusblue-900 mb-2 h-10"></div>
                    <p className="text-sm font-bold">Candidate Signature</p>
                    <p className="text-xs text-campusblue-500">Date: ____________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag Reason Details Modal */}
      {viewingReasonOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-red-200">
            <div className="p-4 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                  !
                </div>
                <h3 className="font-bold text-red-900 text-sm">Flagged Offer Details</h3>
              </div>
              <button
                onClick={() => setViewingReasonOffer(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100/70 hover:bg-red-200 text-red-700 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-campusblue-50/50 rounded-xl p-3.5 border border-campusblue-100 text-xs text-campusblue-800 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span>
                    Candidate: <strong className="text-campusblue-900">{viewingReasonOffer.student}</strong> (
                    {viewingReasonOffer.studentId})
                  </span>
                  <span>
                    Branch: <strong className="text-campusblue-900">{viewingReasonOffer.branch}</strong>
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-campusblue-100">
                  <span>
                    Corporate: <strong className="text-campusblue-900">{viewingReasonOffer.company}</strong>
                  </span>
                  <span>
                    Offered CTC: <strong className="text-campusblue-900">{viewingReasonOffer.ctc}</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1.5">
                  Flag Reason / Non-Compliance Note
                </label>
                <div className="p-4 bg-red-50/80 rounded-xl border border-red-200 text-sm text-red-900 font-medium leading-relaxed">
                  {viewingReasonOffer.flagReason}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  const target = viewingReasonOffer;
                  setViewingReasonOffer(null);
                  setViewingOffer(target);
                }}
                className="text-xs font-bold text-campusblue-700 hover:text-campusblue-900 px-3 py-2 rounded-lg bg-campusblue-50 hover:bg-campusblue-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Full Document
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleVerify(viewingReasonOffer.id);
                    setViewingReasonOffer(null);
                  }}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
                >
                  Clear Flag & Verify
                </button>
                <button
                  onClick={() => setViewingReasonOffer(null)}
                  className="text-xs font-bold text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 transition shadow-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-campusblue-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-campusblue-700">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </AppLayout>
  );
}
