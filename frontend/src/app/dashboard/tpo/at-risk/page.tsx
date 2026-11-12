"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminApi, AtRiskStudentItem, AtRiskCohortResponse } from "@/services/adminApi";

export default function AtRiskCenterPage() {
  const [data, setData] = useState<AtRiskCohortResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters & Sorting
  const [branchFilter, setBranchFilter] = useState("All Branches");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("severity");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [counselingModal, setCounselingModal] = useState<{ id: number; name: string; roll: string } | null>(null);
  const [counselingSubject, setCounselingSubject] = useState("Mandatory TPO Counseling Session Required");
  const [counselingMessage, setCounselingMessage] = useState("");

  const [trainingModal, setTrainingModal] = useState<{ id: number; name: string } | null>(null);
  const [selectedTraining, setSelectedTraining] = useState("Remedial Technical Course");

  const loadAtRiskData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAtRiskStudents();
      setData(res);
    } catch (err: any) {
      console.error("Failed to load at-risk students", err);
      setFeedback({ message: "Failed to load live at-risk data from server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAtRiskData();
  }, []);

  const openCounselingModal = (student: AtRiskStudentItem) => {
    setCounselingModal({ id: student.id, name: student.student, roll: student.studentId });
    setCounselingSubject(`Mandatory TPO Placement Counseling - ${student.student}`);
    setCounselingMessage(
      `Hi ${student.student},\n\nOur placement diagnostics indicate your readiness score (${student.score}%) requires immediate attention before upcoming corporate drives.\n\nPlease report to the Placement Office Room 204 on [Date/Time] for a mandatory 1-on-1 strategy and remediation session.\n\nRegards,\nPlacement Officer`
    );
  };

  const handleSendCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselingModal) return;

    try {
      setActionLoading(counselingModal.id);
      await adminApi.recordStudentIntervention(counselingModal.id, {
        intervention_type: "1-on-1 Counseling",
        subject: counselingSubject,
        message: counselingMessage,
      });

      setFeedback({
        message: `1-on-1 Counseling notification successfully dispatched to ${counselingModal.name}.`,
        type: "success",
      });

      // Optimistic update
      if (data) {
        setData({
          ...data,
          students: data.students.map((s) =>
            s.id === counselingModal.id ? { ...s, intervention: "1-on-1 Counseling" } : s
          ),
          summary: {
            ...data.summary,
            active_interventions_count: data.summary.active_interventions_count + 1,
          },
        });
      }

      setCounselingModal(null);
    } catch (err: any) {
      console.error("Failed to record counseling intervention", err);
      setFeedback({ message: "Failed to dispatch counseling notification.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignTraining = async () => {
    if (!trainingModal) return;

    try {
      setActionLoading(trainingModal.id);
      await adminApi.recordStudentIntervention(trainingModal.id, {
        intervention_type: selectedTraining,
        subject: `Assigned: ${selectedTraining}`,
        message: `You have been enrolled in ${selectedTraining} by the Placement Office to bridge identified skill and readiness gaps. Check your portal for schedules and course materials.`,
      });

      setFeedback({
        message: `${selectedTraining} assigned to ${trainingModal.name} and logged in student records.`,
        type: "success",
      });

      // Optimistic update
      if (data) {
        setData({
          ...data,
          students: data.students.map((s) =>
            s.id === trainingModal.id ? { ...s, intervention: selectedTraining } : s
          ),
          summary: {
            ...data.summary,
            active_interventions_count: data.summary.active_interventions_count + 1,
          },
        });
      }

      setTrainingModal(null);
    } catch (err: any) {
      console.error("Failed to assign training", err);
      setFeedback({ message: "Failed to record training intervention.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const branches = useMemo(() => {
    if (!data?.branches) return ["All Branches"];
    return data.branches;
  }, [data]);

  const filteredAndSortedStudents = useMemo(() => {
    if (!data?.students) return [];

    return data.students
      .filter((s) => {
        const matchesBranch = branchFilter === "All Branches" || s.branch === branchFilter;
        const matchesRisk = riskFilter === "ALL" || s.riskLevel === riskFilter;
        const matchesQuery =
          !searchQuery.trim() ||
          s.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.branch.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesBranch && matchesRisk && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "severity") {
          const order: Record<string, number> = { HIGH: 1, MEDIUM: 2, LOW: 3, PLACED: 4 };
          const diff = (order[a.riskLevel] || 99) - (order[b.riskLevel] || 99);
          if (diff !== 0) return diff;
          return a.score - b.score;
        } else if (sortBy === "score_asc") {
          return a.score - b.score;
        } else if (sortBy === "score_desc") {
          return b.score - a.score;
        } else if (sortBy === "cgpa_asc") {
          return a.cgpa - b.cgpa;
        }
        return 0;
      });
  }, [data, branchFilter, riskFilter, sortBy, searchQuery]);

  // Export CSV Report
  const handleExportReport = () => {
    if (!filteredAndSortedStudents.length) return;

    const headers = [
      "Student ID",
      "Full Name",
      "Branch",
      "CGPA",
      "Backlogs",
      "Readiness Score (%)",
      "Risk Level",
      "Active Intervention",
      "AI Diagnostic Diagnosis",
    ];

    const rows = filteredAndSortedStudents.map((s) => [
      `"${s.studentId}"`,
      `"${s.student}"`,
      `"${s.branch}"`,
      s.cgpa,
      s.backlogs_current,
      s.score,
      s.riskLevel,
      `"${s.intervention}"`,
      `"${s.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `At_Risk_Students_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title="Cohort & At-Risk Center"
        description="Monitor student cohorts and automatically identify candidates at high risk of remaining unplaced to provide early intervention."
        actionLabel="Export Risk Report (CSV)"
        onAction={handleExportReport}
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

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Unplaced</h3>
            <div className="text-3xl font-black text-campusblue-900">
              {loading ? "..." : data?.summary.total_unplaced ?? 0}
            </div>
            <div className="text-[11px] text-campusblue-400 font-medium mt-1">
              Total cohort size: {data?.summary.total_cohort ?? 0} ({data?.summary.total_placed ?? 0} placed)
            </div>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-100 p-5 shadow-sm">
            <h3 className="text-red-700 text-xs font-bold uppercase tracking-wider mb-1">High Risk Candidates</h3>
            <div className="text-3xl font-black text-red-600">
              {loading ? "..." : data?.summary.high_risk_count ?? 0}
            </div>
            <div className="text-[11px] text-red-500 font-medium mt-1">Readiness &lt; 35% or active backlogs</div>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-100 p-5 shadow-sm">
            <h3 className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">Borderline / Medium Risk</h3>
            <div className="text-3xl font-black text-amber-700">
              {loading ? "..." : data?.summary.medium_risk_count ?? 0}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">Readiness 35-55% (Needs targeted training)</div>
          </div>

          <div className="bg-campusblue-50 rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-800 text-xs font-bold uppercase tracking-wider mb-1">Active Interventions</h3>
            <div className="text-3xl font-black text-campusblue-700">
              {loading ? "..." : data?.summary.active_interventions_count ?? 0}
            </div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1">
              Historical Success Rate: {data?.summary.intervention_success_rate ?? 68}%
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search by student name or roll..."
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
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              className="text-xs font-semibold border-campusblue-200 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-campusblue-500"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="HIGH">High Risk Only</option>
              <option value="MEDIUM">Medium Risk Only</option>
              <option value="LOW">Low Risk / On Track</option>
            </select>

            <select
              className="text-xs font-semibold border-campusblue-200 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-campusblue-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="severity">Sort by: Risk Severity</option>
              <option value="score_asc">Sort by: Readiness Score (Low to High)</option>
              <option value="score_desc">Sort by: Readiness Score (High to Low)</option>
              <option value="cgpa_asc">Sort by: CGPA (Low to High)</option>
            </select>

            <button
              onClick={loadAtRiskData}
              title="Refresh telemetry"
              className="p-2 border border-campusblue-200 hover:bg-campusblue-50 rounded-lg text-campusblue-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main List */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="border-b border-campusblue-100 bg-campusblue-50 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-campusblue-900">AI-Diagnosed At-Risk Candidates</h2>
              <p className="text-xs text-campusblue-500 mt-0.5">
                Showing {filteredAndSortedStudents.length} of {data?.summary.total_unplaced ?? 0} unplaced candidates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                High Risk: {data?.summary.high_risk_count ?? 0}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                Medium Risk: {data?.summary.medium_risk_count ?? 0}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-campusblue-200 border-t-campusblue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-campusblue-600">Evaluating student cohort readiness models...</p>
            </div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="py-16 text-center text-campusblue-500">
              <p className="font-semibold">No students match the selected filter criteria.</p>
              <button
                onClick={() => {
                  setBranchFilter("All Branches");
                  setRiskFilter("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-bold text-campusblue-700 underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-campusblue-100">
                <thead className="bg-campusblue-50/60">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Candidate Profile
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Readiness %
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Risk Tier
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider w-1/3">
                      AI Diagnosis & Risk Factors
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Intervention
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-campusblue-600 uppercase tracking-wider">
                      Action Plan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-campusblue-50">
                  {filteredAndSortedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-campusblue-50/50 transition">
                      {/* Profile */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-10 rounded-full ${
                              student.riskLevel === "HIGH"
                                ? "bg-red-500"
                                : student.riskLevel === "MEDIUM"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                          ></div>
                          <div>
                            <div className="text-sm font-bold text-campusblue-900">{student.student}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono text-campusblue-600 bg-campusblue-50 px-1.5 py-0.5 rounded border border-campusblue-100">
                                {student.studentId}
                              </span>
                              <span className="text-xs text-campusblue-500 font-medium">{student.branch}</span>
                              <span className="text-xs text-slate-500">CGPA: <strong>{student.cgpa}</strong></span>
                              {student.backlogs_current > 0 && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200">
                                  {student.backlogs_current} Backlogs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Readiness */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-sm font-black ${
                              student.score < 35
                                ? "text-red-600"
                                : student.score < 55
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {student.score}%
                          </span>
                          <div className="w-20 bg-campusblue-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                student.score < 35
                                  ? "bg-red-500"
                                  : student.score < 55
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, student.score))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Risk Tier Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.riskLevel === "HIGH" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wide border border-red-200">
                            High Risk
                          </span>
                        ) : student.riskLevel === "MEDIUM" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide border border-amber-200">
                            Medium Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide border border-emerald-200">
                            On Track
                          </span>
                        )}
                      </td>

                      {/* AI Diagnosis Reason */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-campusblue-800 leading-relaxed font-medium">
                          {student.reason}
                        </p>
                      </td>

                      {/* Intervention */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.intervention === "None" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                            No Action Taken
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-campusblue-100 text-campusblue-800 border border-campusblue-200 uppercase tracking-wider">
                            {student.intervention}
                          </span>
                        )}
                      </td>

                      {/* Action Plan */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col gap-1.5 items-end">
                          <button
                            onClick={() => openCounselingModal(student)}
                            disabled={actionLoading === student.id}
                            className="text-xs font-bold text-campusblue-800 bg-white border border-campusblue-300 hover:bg-campusblue-50 px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
                          >
                            Schedule Counseling
                          </button>
                          <button
                            onClick={() => setTrainingModal({ id: student.id, name: student.student })}
                            disabled={actionLoading === student.id}
                            className="text-xs font-bold text-campusblue-700 bg-campusblue-50 border border-campusblue-200 hover:bg-campusblue-100 px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
                          >
                            Assign Training
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Counseling Modal */}
      {counselingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Schedule Mandatory Counseling: {counselingModal.name}
              </h2>
              <button
                onClick={() => setCounselingModal(null)}
                className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendCounseling} className="p-6">
              <p className="text-xs text-campusblue-600 mb-4 leading-relaxed">
                Dispatches an authoritative in-app notification to <strong>{counselingModal.name}</strong> ({counselingModal.roll}) and registers the action in student risk monitoring records.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <input
                    required
                    value={counselingSubject}
                    onChange={(e) => setCounselingSubject(e.target.value)}
                    className="w-full border border-campusblue-200 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-campusblue-500 text-sm font-semibold text-campusblue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1">
                    Notification Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={counselingMessage}
                    onChange={(e) => setCounselingMessage(e.target.value)}
                    className="w-full border border-campusblue-200 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-campusblue-500 text-xs leading-relaxed resize-none text-slate-800"
                  ></textarea>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-campusblue-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCounselingModal(null)}
                  className="px-4 py-2 text-xs font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-4 py-2 text-xs font-bold text-white bg-campusblue-600 hover:bg-campusblue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading !== null ? "Dispatching..." : "Send Notification & Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Training Modal */}
      {trainingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Assign Remedial Training
              </h2>
              <button
                onClick={() => setTrainingModal(null)}
                className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-campusblue-600 leading-relaxed">
                Assign a targeted upskilling track for <strong>{trainingModal.name}</strong> to resolve diagnosed readiness and assessment deficiencies.
              </p>

              <div>
                <label className="block text-xs font-bold text-campusblue-800 uppercase tracking-wider mb-1.5">
                  Remedial Track
                </label>
                <select
                  value={selectedTraining}
                  onChange={(e) => setSelectedTraining(e.target.value)}
                  className="w-full border border-campusblue-200 rounded-lg p-2.5 text-xs font-semibold text-campusblue-900 focus:ring-2 focus:ring-campusblue-500"
                >
                  <option value="Remedial Technical Course">Remedial Technical Course (Data Structures & Core)</option>
                  <option value="Technical Bootcamp">Full-Stack & Cloud Technical Bootcamp</option>
                  <option value="Aptitude Remedial Class">Aptitude & Quantitative Problem Solving Remedial</option>
                  <option value="Mock HR & Behavioral Interviews">Mock HR & Communication Interview Coaching</option>
                  <option value="Academic Backlog Clearance Plan">Academic Backlog Clearance & Support Plan</option>
                </select>
              </div>

              <div className="bg-campusblue-50 p-3 rounded-lg border border-campusblue-100 text-[11px] text-campusblue-700">
                Assigning this track immediately logs the intervention in the institutional dashboard and sends an enrollment notice to the candidate.
              </div>

              <div className="mt-6 pt-4 border-t border-campusblue-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTrainingModal(null)}
                  className="px-4 py-2 text-xs font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTraining}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 text-xs font-bold text-white bg-campusblue-600 hover:bg-campusblue-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading !== null ? "Saving..." : "Confirm & Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
