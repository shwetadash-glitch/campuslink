"use client";

import React, { useState, useEffect } from "react";
import {
  assessmentsApi,
  OfficerAssessmentItem,
} from "@/services/assessmentsApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export const TpoAssessmentsView: React.FC = () => {
  const [assessments, setAssessments] = useState<OfficerAssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"PENDING" | "PUBLISHED" | "ALL">("PENDING");

  // Verification Review Modal State
  const [reviewAssessment, setReviewAssessment] = useState<OfficerAssessmentItem | null>(null);
  const [verificationNotes, setVerificationNotes] = useState(
    "Verified and officially approved for campus recruitment drives."
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assessmentsApi.getOfficerAssessments({ all: true });
      setAssessments(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load assessments from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleOpenReview = (assessment: OfficerAssessmentItem) => {
    setReviewAssessment(assessment);
    setVerificationNotes("Verified and officially approved for campus recruitment drives.");
    setRejectionReason("");
    setIsRejecting(false);
    setActionSuccessMessage(null);
  };

  const handleVerifyAndApprove = async () => {
    if (!reviewAssessment) return;
    setActionLoading(true);
    try {
      await assessmentsApi.verifyAssessment(reviewAssessment.id, verificationNotes);
      setActionSuccessMessage("Assessment successfully verified and published! Students can now access and attempt it.");
      await fetchAssessments();
      setTimeout(() => {
        setReviewAssessment(null);
        setActionSuccessMessage(null);
      }, 1400);
    } catch (err: any) {
      alert(err?.message || "Failed to verify assessment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAssessment = async () => {
    if (!reviewAssessment) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a reason or revision feedback for Admin.");
      return;
    }

    setActionLoading(true);
    try {
      await assessmentsApi.rejectAssessment(reviewAssessment.id, rejectionReason);
      setActionSuccessMessage("Assessment flagged with feedback and returned to Admin.");
      await fetchAssessments();
      setTimeout(() => {
        setReviewAssessment(null);
        setActionSuccessMessage(null);
      }, 1400);
    } catch (err: any) {
      alert(err?.message || "Failed to flag assessment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const pendingList = assessments.filter((a) => a.status === "PENDING_VERIFICATION");
  const publishedList = assessments.filter((a) => a.status === "PUBLISHED");
  const rejectedList = assessments.filter((a) => a.status === "REJECTED");

  const filteredAssessments = assessments.filter((a) => {
    if (activeTab === "PENDING") return a.status === "PENDING_VERIFICATION";
    if (activeTab === "PUBLISHED") return a.status === "PUBLISHED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-campusblue-100 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              Stage 2 &bull; TPO Verification Desk
            </span>
            <span className="text-2xs text-gray-400">&bull; Quality &amp; Integrity Audit</span>
          </div>
          <h2 className="text-xl font-black text-campusblue-900 mt-1">
            TPO Assessment Verification Desk
          </h2>
          <p className="text-xs text-campusblue-600 mt-0.5">
            Audit examination questions, duration, and scoring rubrics submitted by Admin. Students receive assessments{" "}
            <span className="font-bold underline text-campusblue-900">only after official TPO verification</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAssessments} disabled={loading}>
            Refresh Desk
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-800">Pending TPO Review</span>
            <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold animate-pulse">
              Requires Action
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingList.length}</div>
          <div className="text-2xs text-amber-700 mt-1">Admin submissions waiting for approval</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 shadow-xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">Verified &amp; Active</span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{publishedList.length}</div>
          <div className="text-2xs text-emerald-700 mt-1">Unlocked for student examination</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-4 shadow-xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-rose-800">Flagged / Revisions</span>
          <div className="text-2xl font-black text-rose-900 mt-1">{rejectedList.length}</div>
          <div className="text-2xs text-rose-700 mt-1">Returned to Admin with feedback</div>
        </div>

        <div className="bg-white border border-campusblue-100 rounded-lg p-4 shadow-xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Total In Registry</span>
          <div className="text-2xl font-black text-campusblue-900 mt-1">{assessments.length}</div>
          <div className="text-2xs text-campusblue-600 mt-1">Across all drives and departments</div>
        </div>
      </div>

      {/* Verification Filter Tabs */}
      <div className="flex items-center justify-between border-b border-campusblue-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white"
                : "bg-white text-campusblue-700 hover:bg-campusblue-50 border border-campusblue-100"
            }`}
          >
            <span>Pending Verification</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-3xs font-extrabold ${
                activeTab === "PENDING" ? "bg-amber-800 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("PUBLISHED")}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "PUBLISHED"
                ? "bg-emerald-700 text-white"
                : "bg-white text-campusblue-700 hover:bg-campusblue-50 border border-campusblue-100"
            }`}
          >
            <span>Verified &amp; Active</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-3xs font-extrabold ${
                activeTab === "PUBLISHED" ? "bg-emerald-900 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {publishedList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ALL")}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "ALL"
                ? "bg-campusblue-900 text-white"
                : "bg-white text-campusblue-700 hover:bg-campusblue-50 border border-campusblue-100"
            }`}
          >
            All Assessments ({assessments.length})
          </button>
        </div>
      </div>

      {/* Table of Assessments */}
      {loading ? (
        <div className="bg-white rounded-xl border border-campusblue-100 p-12 text-center text-sm text-campusblue-500 animate-pulse">
          Loading verification desk telemetry...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-campusblue-100 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <h3 className="text-base font-bold text-campusblue-900">
            {activeTab === "PENDING"
              ? "All caught up! No assessments pending TPO verification."
              : "No assessments in this category."}
          </h3>
          <p className="text-xs text-campusblue-600 max-w-md mx-auto">
            {activeTab === "PENDING"
              ? "Any new assessments designed by the Admin will appear here immediately for audit and official sign-off."
              : "Switch tabs to view pending or all assessments."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-campusblue-50/80 text-campusblue-800 uppercase tracking-wider text-2xs font-bold border-b border-campusblue-100">
                <tr>
                  <th className="py-3 px-4">Assessment &amp; Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Duration &amp; Rules</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Admin Submission</th>
                  <th className="py-3 px-4">Audit Status</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-campusblue-50">
                {filteredAssessments.map((a) => (
                  <tr key={a.id} className="hover:bg-campusblue-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-campusblue-900 text-sm">{a.title}</div>
                      <div className="font-mono text-2xs text-campusblue-500 mt-0.5">{a.code}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-campusblue-100 text-campusblue-800">
                        {a.assessment_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-campusblue-800">
                      <div><span className="font-bold">{a.duration_minutes}</span> mins &bull; <span className="font-bold">{a.total_marks}</span> marks</div>
                      <div className="text-2xs text-campusblue-500 mt-0.5">
                        Pass Mark: <span className="font-semibold text-campusblue-700">{a.pass_percentage}%</span> &bull; Max Attempts: {a.max_attempts}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-campusblue-900 text-sm">{a.questions_count ?? 0}</span>
                      <span className="text-2xs text-campusblue-500 block">questions</span>
                    </td>

                    <td className="py-3.5 px-4 text-campusblue-700">
                      <div className="font-medium text-campusblue-900">
                        {a.creator?.name || a.metadata?.creator_name || "Admin"}
                      </div>
                      <div className="text-2xs text-campusblue-500">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "Recent"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {a.status === "PENDING_VERIFICATION" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                          Pending TPO Verification
                        </span>
                      )}
                      {a.status === "PUBLISHED" && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Verified &amp; Active
                          </span>
                          {a.metadata?.verification?.verified_by_name && (
                            <div className="text-3xs text-emerald-700 mt-0.5 font-medium">
                              Signed: {a.metadata.verification.verified_by_name}
                            </div>
                          )}
                        </div>
                      )}
                      {a.status === "REJECTED" && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            ⚠ Revisions Requested
                          </span>
                        </div>
                      )}
                      {a.status === "DRAFT" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold bg-gray-100 text-gray-700">
                          Draft
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {a.status === "PENDING_VERIFICATION" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                          onClick={() => handleOpenReview(a)}
                        >
                          Review &amp; Verify
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-2xs"
                          onClick={() => handleOpenReview(a)}
                        >
                          Audit Details
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TPO VERIFICATION & AUDIT MODAL */}
      {reviewAssessment && (
        <Modal
          isOpen={!!reviewAssessment}
          onClose={() => setReviewAssessment(null)}
          title={`TPO Verification: ${reviewAssessment.title}`}
          subtitle={`Audit question integrity and sign off before releasing to student profiles.`}
          size="3xl"
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1">
            {actionSuccessMessage && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <span>✓</span>
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {/* Assessment Specification Overview */}
            <div className="bg-campusblue-50/50 border border-campusblue-100 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-2xs font-bold uppercase text-campusblue-500 block">Assessment Code</span>
                <span className="font-mono font-bold text-campusblue-900">{reviewAssessment.code}</span>
              </div>
              <div>
                <span className="text-2xs font-bold uppercase text-campusblue-500 block">Duration</span>
                <span className="font-bold text-campusblue-900">{reviewAssessment.duration_minutes} Minutes</span>
              </div>
              <div>
                <span className="text-2xs font-bold uppercase text-campusblue-500 block">Total Marks</span>
                <span className="font-bold text-campusblue-900">{reviewAssessment.total_marks} Points</span>
              </div>
              <div>
                <span className="text-2xs font-bold uppercase text-campusblue-500 block">Pass Criteria</span>
                <span className="font-bold text-campusblue-900">{reviewAssessment.pass_percentage}%</span>
              </div>
            </div>

            {/* Candidate Instructions */}
            {reviewAssessment.instructions && (
              <div className="text-xs text-campusblue-800 bg-white border border-campusblue-200 p-3 rounded-lg">
                <span className="font-bold block text-campusblue-900 mb-0.5">Instructions Provided to Students:</span>
                <p className="text-campusblue-600">{reviewAssessment.instructions}</p>
              </div>
            )}

            {/* Full Question Paper Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-campusblue-100 pb-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800">
                  Question Paper Audit ({reviewAssessment.questions?.length ?? 0} Questions)
                </h4>
                <span className="text-2xs text-campusblue-500">
                  Check answer keys and options before releasing
                </span>
              </div>

              {(!reviewAssessment.questions || reviewAssessment.questions.length === 0) ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-lg text-center">
                  ⚠️ No questions have been attached to this assessment. We recommend returning it to Admin for revisions.
                </div>
              ) : (
                reviewAssessment.questions.map((q, idx) => (
                  <div key={q.id || idx} className="bg-white border border-campusblue-200 rounded-lg p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-campusblue-900">
                        Q{idx + 1}. {q.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs px-2 py-0.5 rounded bg-campusblue-100 text-campusblue-800 font-semibold">
                          {q.type}
                        </span>
                        <span className="text-2xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {q.marks} Marks
                        </span>
                      </div>
                    </div>

                    <p className="text-campusblue-900 font-medium">{q.question_text}</p>

                    {q.options && Array.isArray(q.options) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-md border text-2xs flex items-center gap-2 ${
                              q.correct_answer === opt.id
                                ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-900"
                                : "bg-campusblue-50/40 border-campusblue-100 text-campusblue-800"
                            }`}
                          >
                            <span className="w-4 h-4 rounded bg-white border flex items-center justify-center font-bold text-3xs shrink-0">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                            {q.correct_answer === opt.id && (
                              <span className="ml-auto text-3xs text-emerald-700 font-bold uppercase shrink-0">
                                ✓ Verified Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-2xs text-campusblue-600 bg-campusblue-50/30 p-2 rounded">
                        <span className="font-semibold text-campusblue-800">Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Verification Sign-Off Form */}
            {reviewAssessment.status === "PENDING_VERIFICATION" && (
              <div className="mt-4 pt-4 border-t-2 border-campusblue-100 space-y-4">
                <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">TPO Sign-Off Gate:</span>
                  <p className="text-amber-800">
                    Approving this assessment will immediately unlock it for eligible students under their assessments tab.
                  </p>
                </div>

                {!isRejecting ? (
                  <div>
                    <label className="block text-xs font-bold text-campusblue-900 mb-1">
                      Verification Endorsement Notes (Audit Trail)
                    </label>
                    <input
                      type="text"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="e.g. Verified and approved for TechCorp 2026 Campus Drive."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-campusblue-200 focus:outline-none focus:ring-1 focus:ring-campusblue-800 bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-rose-900 mb-1">
                      Reason for Rejection / Required Revisions *
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Please add 2 more coding questions and adjust the pass mark to 65%."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Already Verified Info */}
            {reviewAssessment.status === "PUBLISHED" && reviewAssessment.metadata?.verification && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓ Official TPO Verification Record</span>
                </div>
                <div className="text-emerald-900 text-2xs">
                  Verified by: <span className="font-semibold">{reviewAssessment.metadata.verification.verified_by_name}</span> on{" "}
                  {new Date(reviewAssessment.metadata.verification.verified_at).toLocaleString()}
                </div>
                {reviewAssessment.metadata.verification.notes && (
                  <p className="text-2xs text-emerald-800 italic mt-0.5">
                    &quot;{reviewAssessment.metadata.verification.notes}&quot;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="mt-6 pt-4 border-t border-campusblue-100 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => setReviewAssessment(null)}>
              Close
            </Button>

            {reviewAssessment.status === "PENDING_VERIFICATION" && (
              <div className="flex items-center gap-2">
                {!isRejecting ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-700 border-rose-300 hover:bg-rose-50"
                      onClick={() => setIsRejecting(true)}
                    >
                      Request Revisions
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={handleVerifyAndApprove}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      {actionLoading ? "Verifying..." : "✓ Verify & Approve (Publish)"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRejecting(false)}
                    >
                      Back to Approval
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={handleRejectAssessment}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    >
                      {actionLoading ? "Flagging..." : "Confirm Rejection"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
