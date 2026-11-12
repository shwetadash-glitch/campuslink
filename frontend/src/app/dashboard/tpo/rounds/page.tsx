"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { adminApi, DriveRoundsPipelineResponse } from "@/services/adminApi";

function RoundsManagerContent() {
  const searchParams = useSearchParams();
  const initialDrive = searchParams.get("drive_id") || "11"; // Default to Microsoft or TechCorp
  const initialRoundParam = parseInt(searchParams.get("round") || "2", 10);

  const [targetDrive, setTargetDrive] = useState(initialDrive);
  const [activeRoundTab, setActiveRoundTab] = useState<number>(initialRoundParam);
  const [drives, setDrives] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<DriveRoundsPipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evaluatingQuiz, setEvaluatingQuiz] = useState(false);
  const [evaluatingGd, setEvaluatingGd] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showQuestionPaper, setShowQuestionPaper] = useState(false);
  const [gdTopicFilter, setGdTopicFilter] = useState("ALL");
  const [selectedCandidateForGd, setSelectedCandidateForGd] = useState<any>(null);

  // Load drives
  useEffect(() => {
    adminApi.getDrives().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setDrives(data);
        if (!data.some(d => d.id.toString() === targetDrive)) {
          setTargetDrive(data[0].id.toString());
        }
      }
    }).catch(err => {
      console.warn("Could not load drives:", err);
    });
  }, []);

  // Load rounds pipeline data
  const loadPipeline = async (driveId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getRoundsPipeline(driveId);
      setPipeline(res);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to load drive rounds pipeline.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetDrive) {
      loadPipeline(parseInt(targetDrive, 10));
    }
  }, [targetDrive]);

  // Handle Advance Candidates
  const handleAdvance = async (fromRound: number, toRound: number) => {
    setAdvancing(true);
    setSuccessMessage("");
    try {
      const driveId = parseInt(targetDrive, 10);
      const res = await adminApi.advanceCandidates(driveId, {
        from_round: fromRound,
        to_round: toRound,
      });
      setSuccessMessage(`Successfully advanced ${res.updated_count} candidates to Round ${toRound}!`);
      await loadPipeline(driveId);
      setActiveRoundTab(toRound);
      setAdvancing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to advance candidates.");
      setAdvancing(false);
    }
  };

  // Handle TPO Quiz Dispatch to Shortlisted Candidates
  const [dispatchingQuiz, setDispatchingQuiz] = useState(false);
  const [selectedCandidateQuizDetail, setSelectedCandidateQuizDetail] = useState<any | null>(null);

  const handleDispatchQuiz = async (candidateIds?: number[]) => {
    if (!pipeline) return;
    setDispatchingQuiz(true);
    setSuccessMessage("");
    setError("");
    const driveId = parseInt(targetDrive, 10);
    try {
      const res = await adminApi.dispatchTechnicalQuiz(driveId, candidateIds);
      setSuccessMessage(res.message || `Successfully dispatched technical assessment to ${res.dispatched_count} candidate(s)!`);
      await loadPipeline(driveId);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to dispatch technical quiz.");
    } finally {
      setDispatchingQuiz(false);
    }
  };

  // Handle Auto-Evaluate / Conduct Quiz
  const handleConductQuiz = async () => {
    if (!pipeline) return;
    setEvaluatingQuiz(true);
    setSuccessMessage("");
    const driveId = parseInt(targetDrive, 10);
    const qualifiedCand = pipeline.candidates.filter(c => c.round_1.is_qualified);

    try {
      for (const cand of qualifiedCand) {
        await adminApi.submitCandidateQuiz(driveId, {
          candidate_id: cand.candidate_id,
          score: cand.round_2.quiz_score ?? 70,
          correct_answers: cand.round_2.correct_answers ?? undefined,
          skill_breakdown: cand.round_2.skill_breakdown,
          notes: `Technical assessment evaluated on required skills: ${pipeline.quiz_config.skills_covered.join(', ')}.`,
        });
      }
      setSuccessMessage(`Technical Quiz evaluated for ${qualifiedCand.length} candidates!`);
      await loadPipeline(driveId);
      setEvaluatingQuiz(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Error evaluating quiz.");
      setEvaluatingQuiz(false);
    }
  };

  // Handle Auto-Evaluate / Score GD Panel
  const handleConductGd = async () => {
    if (!pipeline) return;
    setEvaluatingGd(true);
    setSuccessMessage("");
    const driveId = parseInt(targetDrive, 10);
    const gdCandidates = pipeline.candidates.filter(c => c.round_2.status === "CLEARED");

    try {
      for (const cand of gdCandidates) {
        await adminApi.submitCandidateGd(driveId, {
          candidate_id: cand.candidate_id,
          technical_depth: cand.round_3.technical_depth_score ?? 18,
          communication: cand.round_3.communication_score ?? 18,
          critical_thinking: cand.round_3.critical_thinking_score ?? 18,
          leadership: cand.round_3.leadership_score ?? 18,
          topic: cand.round_3.topic,
          decision: cand.round_3.decision === "PENDING" ? "WAITLISTED" : cand.round_3.decision,
          remarks: cand.round_3.remarks,
        });
      }
      setSuccessMessage(`Group Discussion evaluations recorded for ${gdCandidates.length} candidates!`);
      await loadPipeline(driveId);
      setEvaluatingGd(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Error evaluating GD.");
      setEvaluatingGd(false);
    }
  };

  // Export CSV
  const handleDownloadCsv = () => {
    const driveId = parseInt(targetDrive, 10);
    const url = `/api/v1/officer/drives/${driveId}/export-rounds`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
        <LoadingState message="Loading multi-round placement pipeline & technical assessments..." />
      </AppLayout>
    );
  }

  if (error && !pipeline) {
    return (
      <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
        <ErrorState message={error} onRetry={() => loadPipeline(parseInt(targetDrive, 10))} />
      </AppLayout>
    );
  }

  const driveInfo = pipeline?.drive_info;
  const quizConfig = pipeline?.quiz_config;
  const gdTopics = pipeline?.gd_topics || [];
  const candidates = pipeline?.candidates || [];
  const summary = pipeline?.summary;

  const round1Qualified = candidates.filter(c => c.round_1.is_qualified);
  const candidatesAwaitingDispatch = candidates.filter(
    c => c.round_1.is_qualified && (!c.round_2.quiz_sent || c.round_2.status === "AWAITING_TPO_DISPATCH")
  );
  const round2Cleared = candidates.filter(c => c.round_2.status === "CLEARED");
  const round3Selected = candidates.filter(c => c.round_3.decision === "SELECTED");

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title="Placement Drive Rounds & Assessment Manager"
        description="Comprehensive 3-stage candidate evaluation: AI Eligibility Shortlisting, Skill-Tailored Hard Technical Quiz, and Technical Group Discussion."
        actionLabel="Export Multi-Round CSV / Excel"
        onAction={handleDownloadCsv}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="text-sm font-semibold">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-xs text-emerald-700 font-bold hover:text-emerald-900 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Control Bar: Drive Selector & Export */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 w-full max-w-xl">
            <label className="block text-xs font-bold text-campusblue-700 uppercase tracking-wider mb-1.5">
              Select Placement Drive
            </label>
            <select
              value={targetDrive}
              onChange={(e) => setTargetDrive(e.target.value)}
              className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm font-semibold p-2.5 bg-white text-slate-800"
            >
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.company_name || d.company?.name || "Company"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/tpo/shortlisting`}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-campusblue-200 text-campusblue-800 bg-campusblue-50 hover:bg-campusblue-100 transition"
            >
              ← Back to Shortlisting Console
            </Link>
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
            >
              <span>📥</span> Export CSV / Excel
            </button>
          </div>
        </div>

        {/* Multi-Round Stepper Pipeline Card */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-campusblue-600 uppercase tracking-wider">Placement Drive Workflow</span>
              <h2 className="text-xl font-black text-campusblue-900">{driveInfo?.drive_name}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-700">{driveInfo?.company_name}</span>
                <span>•</span>
                <span>{driveInfo?.job_title}</span>
                <span>•</span>
                <span className="text-campusblue-700 font-semibold">
                  Required Skills: {driveInfo?.required_skills.map(s => s.name).join(", ")}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-4 text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-500 uppercase">Applicants</div>
                <div className="text-base font-black text-slate-800">{summary?.total_applicants}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] text-emerald-700 uppercase">R1 Qualified</div>
                <div className="text-base font-black text-emerald-800">{summary?.round_1_qualified}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] text-blue-700 uppercase">R2 Quiz Cleared</div>
                <div className="text-base font-black text-blue-800">{summary?.round_2_cleared}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] text-amber-700 uppercase">R3 Selected</div>
                <div className="text-base font-black text-amber-900">{summary?.round_3_selected}</div>
              </div>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Round 1 Tab */}
            <button
              onClick={() => setActiveRoundTab(1)}
              className={`p-4 rounded-xl border text-left transition relative ${
                activeRoundTab === 1
                  ? "border-campusblue-600 bg-campusblue-50/50 shadow-xs ring-2 ring-campusblue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Stage 1 (Primary)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Completed
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">AI Eligibility & Shortlisting</div>
              <div className="text-xs text-slate-500 mt-1">
                {round1Qualified.length} / {candidates.length} candidates qualified
              </div>
            </button>

            {/* Round 2 Tab */}
            <button
              onClick={() => setActiveRoundTab(2)}
              className={`p-4 rounded-xl border text-left transition relative ${
                activeRoundTab === 2
                  ? "border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Stage 2</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  Active
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Advanced Technical Quiz</span>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded">Hard</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {round2Cleared.length} / {round1Qualified.length} met passing cutoff (60%)
              </div>
            </button>

            {/* Round 3 Tab */}
            <button
              onClick={() => setActiveRoundTab(3)}
              className={`p-4 rounded-xl border text-left transition relative ${
                activeRoundTab === 3
                  ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">Stage 3</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  Panel Evaluation
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">Technical Group Discussion (GD)</div>
              <div className="text-xs text-slate-500 mt-1">
                {round3Selected.length} offer recommendations finalized
              </div>
            </button>
          </div>
        </div>

        {/* ROUND 1 VIEW */}
        {activeRoundTab === 1 && (
          <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-campusblue-900">Round 1: AI Eligibility & Shortlisting Roster</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidates evaluated on hard academic eligibility rules and recruiter radar competency overlap.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={advancing}
                  onClick={() => handleAdvance(1, 2)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <span>🚀</span> Advance Qualified Candidates to Round 2 (Technical Quiz)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Rank & Candidate</th>
                    <th className="px-4 py-3 text-left">Branch</th>
                    <th className="px-4 py-3 text-center">CGPA</th>
                    <th className="px-4 py-3 text-center">Recruiter Fit %</th>
                    <th className="px-4 py-3 text-center">Readiness %</th>
                    <th className="px-4 py-3 text-center">Round 1 Status</th>
                    <th className="px-4 py-3 text-center">Round 2 Qualification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {candidates.map((c) => (
                    <tr key={c.candidate_id} className={`hover:bg-slate-50/80 transition ${!c.round_1.is_eligible ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 text-sm">
                          {c.round_1.rank ? `#${c.round_1.rank} ` : ""}{c.student_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{c.student_identifier} • {c.email}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{c.branch}</td>
                      <td className="px-4 py-3 text-center font-bold">{c.cgpa !== null ? Number(c.cgpa).toFixed(2) : "N/A"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-black ${c.round_1.fit_score >= 70 ? 'text-emerald-700' : c.round_1.fit_score >= 50 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {c.round_1.fit_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">{c.round_1.readiness_score.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.round_1.tier === "HIGHLY_EMPLOYABLE" ? "bg-emerald-100 text-emerald-800" :
                          c.round_1.tier === "QUALIFIED" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                        }`}>
                          {c.round_1.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.round_1.is_qualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span>✓</span> Qualified for Quiz
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <span>✕</span> Not Qualified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROUND 2 VIEW: TECHNICAL QUIZ ASSESSMENT */}
        {activeRoundTab === 2 && (
          <div className="space-y-6">
            {/* Technical Quiz Header Spec Card */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-md">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500/20 text-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                      Round 2: Technical Assessment Quiz
                    </span>
                    <span className="bg-rose-500/30 text-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-400/30">
                      Difficulty: Hard
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                      Passing Cutoff: 60%
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-2">
                    {driveInfo?.company_name} Technical Competency Benchmark Quiz
                  </h3>
                  <p className="text-xs text-blue-100 max-w-2xl mt-1 leading-relaxed">
                    Evaluates exact required competencies (<strong className="text-white">{quizConfig?.skills_covered.join(", ")}</strong>) with rigorous technical scenarios, runtime complexity analysis, and system architecture questions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowQuestionPaper(!showQuestionPaper)}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center gap-1.5"
                  >
                    <span>📜</span> {showQuestionPaper ? "Hide Question Paper" : "Preview Questions"} ({quizConfig?.questions.length})
                  </button>

                  <button
                    disabled={dispatchingQuiz || candidatesAwaitingDispatch.length === 0}
                    onClick={() => handleDispatchQuiz()}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>🚀</span> {dispatchingQuiz ? "Dispatching Quiz..." : `Dispatch Quiz to Shortlisted Students (${candidatesAwaitingDispatch.length})`}
                  </button>

                  <button
                    disabled={advancing || round2Cleared.length === 0}
                    onClick={() => handleAdvance(2, 3)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>👥</span> Advance Cleared ({round2Cleared.length}) to GD
                  </button>
                </div>
              </div>
            </div>

            {/* Technical Question Paper Preview Modal / Accordion */}
            {showQuestionPaper && (
              <div className="bg-white rounded-xl border border-campusblue-200 shadow-md p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Technical Question Paper (Hard Difficulty)</h4>
                    <span className="text-xs text-slate-500">
                      Targeting skills: {quizConfig?.skills_covered.join(", ")}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowQuestionPaper(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                  >
                    Close Preview ✕
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {quizConfig?.questions.map((q, idx) => (
                    <div key={q.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-campusblue-700">Q{idx + 1}. [{q.skill}] - {q.id}</span>
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.2 rounded font-bold text-[10px]">{q.difficulty}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 font-mono leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                        {q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                        {Object.entries(q.options).map(([optKey, optText]) => (
                          <div
                            key={optKey}
                            className={`p-2 rounded border text-xs ${
                              optKey === q.correct_option
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <strong className="mr-1">{optKey}:</strong> {optText}
                            {optKey === q.correct_option && <span className="ml-1 text-emerald-700 font-black">✓ (Correct)</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-600 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Technical Explanation:</strong> {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidates Quiz Results Table */}
            <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-campusblue-900 text-sm">Round 2 Candidate Performance Roster</h4>
                <div className="text-xs text-slate-500">
                  Cutoff: <strong className="text-slate-800">60.0%</strong> | Cleared: <strong className="text-emerald-700">{round2Cleared.length}</strong> candidates
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Candidate</th>
                      <th className="px-4 py-3 text-left">Branch</th>
                      <th className="px-4 py-3 text-center">R1 Fit</th>
                      <th className="px-4 py-3 text-center">Dispatch Status</th>
                      <th className="px-4 py-3 text-center">Quiz Score %</th>
                      <th className="px-4 py-3 text-left">Skill Breakdown</th>
                      <th className="px-4 py-3 text-center">Quiz Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {round1Qualified.map((c) => {
                      const r2 = c.round_2;
                      const isCleared = r2.status === "CLEARED";
                      const isDispatched = !!r2.quiz_sent && r2.status !== "AWAITING_TPO_DISPATCH";
                      const isSubmitted = !!r2.student_submitted;

                      return (
                        <tr key={c.candidate_id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 text-sm">{c.student_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{c.student_identifier} • {c.email}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{c.branch}</td>
                          <td className="px-4 py-3 text-center font-bold text-campusblue-700">{c.round_1.fit_score.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-center">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <span>✓</span> Submitted
                              </span>
                            ) : isDispatched ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 animate-pulse">
                                <span>⏱️</span> Dispatched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                Awaiting TPO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r2.quiz_score !== null && r2.quiz_score !== undefined ? (
                              <span className={`text-sm font-black ${isCleared ? "text-emerald-700" : "text-rose-700"}`}>
                                {r2.quiz_score.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-mono">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r2.skill_breakdown && Object.keys(r2.skill_breakdown).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(r2.skill_breakdown).map(([skill, sScore]) => (
                                  <span key={skill} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {skill}: {Number(sScore).toFixed(0)}%
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-2xs text-slate-400 italic">No answers yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isCleared ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                              r2.status === "FAILED" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                              r2.status === "DISPATCHED_PENDING" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                              "bg-slate-100 text-slate-700 border border-slate-300"
                            }`}>
                              {r2.status === "DISPATCHED_PENDING" ? "PENDING" : r2.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!isDispatched ? (
                              <button
                                disabled={dispatchingQuiz}
                                onClick={() => handleDispatchQuiz([c.candidate_id])}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                              >
                                Send Quiz
                              </button>
                            ) : isSubmitted ? (
                              <button
                                onClick={() => setSelectedCandidateQuizDetail(c)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition"
                              >
                                View Result
                              </button>
                            ) : (
                              <span className="text-2xs text-slate-400 font-medium">Awaiting Student</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ROUND 3 VIEW: GROUP DISCUSSION (GD) */}
        {activeRoundTab === 3 && (
          <div className="space-y-6">
            {/* GD Header Card */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-xl p-6 text-white shadow-md">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                      Round 3: Technical Group Discussion (GD)
                    </span>
                    <span className="bg-purple-500/30 text-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30">
                      Rubric: Depth, Communication, Critical Thinking, Leadership
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-2">
                    Architectural & Technical Discussion Panels
                  </h3>
                  <p className="text-xs text-indigo-100 max-w-2xl mt-1 leading-relaxed">
                    Evaluates candidates who cleared the Technical Quiz on architectural clarity, cross-team collaboration, and technical articulation.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={evaluatingGd}
                    onClick={handleConductGd}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <span>⚡</span> {evaluatingGd ? "Evaluating Panel..." : "Record & Score All GD Panels"}
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-1.5"
                  >
                    <span>📥</span> Export Final Selections
                  </button>
                </div>
              </div>
            </div>

            {/* GD Topics Showcase */}
            <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-4">
              <h4 className="font-bold text-campusblue-900 text-sm">Assigned Technical GD Topics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gdTopics.map((topic) => (
                  <div key={topic.topic_id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700">{topic.topic_id}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{topic.title}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{topic.description}</p>
                    <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-500 space-y-1">
                      <strong className="text-slate-700">Evaluation Focus:</strong>
                      <ul className="list-disc list-inside">
                        {topic.key_evaluation_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GD Candidate Evaluation Table */}
            <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-campusblue-900 text-sm">Round 3 GD Candidates & Evaluation Decisions</h4>
                <div className="text-xs text-slate-500">
                  Offers Recommended: <strong className="text-emerald-700">{round3Selected.length}</strong> | Waitlisted: <strong className="text-amber-700">{candidates.filter(c => c.round_3.decision === "WAITLISTED").length}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Candidate</th>
                      <th className="px-4 py-3 text-left">Branch</th>
                      <th className="px-4 py-3 text-center">Tech Depth (/25)</th>
                      <th className="px-4 py-3 text-center">Comm (/25)</th>
                      <th className="px-4 py-3 text-center">Critical (/25)</th>
                      <th className="px-4 py-3 text-center">Lead (/25)</th>
                      <th className="px-4 py-3 text-center">Total GD (/100)</th>
                      <th className="px-4 py-3 text-center">Final Decision</th>
                      <th className="px-4 py-3 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {round2Cleared.map((c) => {
                      const r3 = c.round_3;
                      const isSelected = r3.decision === "SELECTED";
                      const isWaitlisted = r3.decision === "WAITLISTED";

                      return (
                        <tr key={c.candidate_id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 text-sm">{c.student_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{c.student_identifier} • {c.email}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{c.branch}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{r3.technical_depth_score ?? '—'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{r3.communication_score ?? '—'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{r3.critical_thinking_score ?? '—'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{r3.leadership_score ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-black text-indigo-800">
                              {r3.overall_gd_score !== null && r3.overall_gd_score !== undefined ? `${r3.overall_gd_score.toFixed(0)}/100` : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isSelected ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs" :
                              isWaitlisted ? "bg-amber-100 text-amber-800 border border-amber-300" :
                              "bg-slate-100 text-slate-600 border border-slate-300"
                            }`}>
                              {r3.decision}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs whitespace-normal text-[11px] italic">
                            {r3.remarks}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Candidate Quiz Detail Modal */}
        {selectedCandidateQuizDetail && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedCandidateQuizDetail.student_name}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    {selectedCandidateQuizDetail.student_identifier} • {selectedCandidateQuizDetail.branch}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCandidateQuizDetail(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-2xs text-slate-500 font-bold uppercase">Quiz Score</div>
                  <div className={`text-xl font-black ${
                    selectedCandidateQuizDetail.round_2.status === "CLEARED" ? "text-emerald-700" : "text-rose-700"
                  }`}>
                    {selectedCandidateQuizDetail.round_2.quiz_score}%
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-2xs text-slate-500 font-bold uppercase">Outcome</div>
                  <div className="text-xs font-black uppercase mt-1">
                    <span className={`px-2 py-0.5 rounded ${
                      selectedCandidateQuizDetail.round_2.status === "CLEARED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {selectedCandidateQuizDetail.round_2.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skill Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Competency Breakdown</span>
                {Object.entries(selectedCandidateQuizDetail.round_2.skill_breakdown || {}).map(([sk, val]: [string, any]) => (
                  <div key={sk} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{sk}</span>
                      <span>{Number(val).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${Number(val) >= 60 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(100, Math.max(0, Number(val)))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-2xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Submitted on: {selectedCandidateQuizDetail.round_2.submitted_at ? new Date(selectedCandidateQuizDetail.round_2.submitted_at).toLocaleString() : "Recently"}
              </div>

              <button
                onClick={() => setSelectedCandidateQuizDetail(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

export default function RoundsManagerPage() {
  return (
    <Suspense fallback={<div>Loading Placement Rounds Manager...</div>}>
      <RoundsManagerContent />
    </Suspense>
  );
}
