"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResumeModal } from "@/features/students/ResumeModal";
import { adminApi, ShortlistCandidate, BranchStat, DriveTrackInfo } from "@/services/adminApi";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

type BranchFilterType = "ALL" | "CIVIL" | "MECH" | "EEE_ECE" | "CSE_IT" | "AI_DS";

export default function ShortlistingPage() {
  const [targetDrive, setTargetDrive] = useState("1"); // TechCorp Campus Drive 2026
  const [drives, setDrives] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<ShortlistCandidate[]>([]);
  const [branchBreakdown, setBranchBreakdown] = useState<Record<string, BranchStat>>({});
  const [driveInfo, setDriveInfo] = useState<DriveTrackInfo | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<BranchFilterType>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [radarStudent, setRadarStudent] = useState<ShortlistCandidate | null>(null);

  useEffect(() => {
    adminApi.getDrives().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setDrives(data);
        if (data.some(d => d.id.toString() === "1")) {
          setTargetDrive("1");
        } else {
          setTargetDrive(data[0].id.toString());
        }
      }
    }).catch(err => {
      console.warn("Could not load dynamic drives list:", err);
    });
  }, []);

  const loadShortlist = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getAiShortlist(parseInt(targetDrive));
      setCandidates(res.candidates || []);
      setBranchBreakdown(res.branch_breakdown || {});
      setDriveInfo(res.drive_info || null);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to fetch shortlist");
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const fetchShortlist = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminApi.getAiShortlist(parseInt(targetDrive));
        if (!isCancelled) {
          setCandidates(res.candidates || []);
          setBranchBreakdown(res.branch_breakdown || {});
          setDriveInfo(res.drive_info || null);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.response?.data?.message || err.message || "Failed to fetch shortlist");
          setLoading(false);
        }
      }
    };
    fetchShortlist();
    return () => {
      isCancelled = true;
    };
  }, [targetDrive]);

  // Map student branch to filter categories
  const getBranchCategory = (branch: string): BranchFilterType => {
    const b = (branch || "").toUpperCase();
    if (b.includes("CIVIL")) return "CIVIL";
    if (b.includes("MECH")) return "MECH";
    if (b.includes("ELECTRICAL") || b.includes("ELECTRONIC") || b.includes("EEE") || b.includes("ECE")) return "EEE_ECE";
    if (b.includes("AI") || b.includes("ARTIFICIAL") || b.includes("DATA SCIENCE") || b.includes("DS") || b.includes("MACHINE LEARNING")) return "AI_DS";
    if (b.includes("COMPUTER") || b.includes("CSE") || b.includes("INFORMATION") || b.includes("IT")) return "CSE_IT";
    return "ALL";
  };

  // Branch badge styling
  const renderBranchBadge = (branch: string) => {
    const cat = getBranchCategory(branch);
    switch (cat) {
      case "CIVIL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span>🏗️</span> {branch}
          </span>
        );
      case "MECH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            <span>⚙️</span> {branch}
          </span>
        );
      case "EEE_ECE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <span>⚡</span> {branch}
          </span>
        );
      case "AI_DS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <span>🧠</span> {branch}
          </span>
        );
      case "CSE_IT":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span>💻</span> {branch}
          </span>
        );
    }
  };

  // Filter candidates according to selected branch tab
  const filteredCandidates = useMemo(() => {
    if (selectedBranchFilter === "ALL") return candidates;
    return candidates.filter(c => getBranchCategory(c.branch) === selectedBranchFilter);
  }, [candidates, selectedBranchFilter]);

  // Branch statistics for pills
  const branchCounts = useMemo(() => {
    const counts = {
      ALL: { total: candidates.length, eligible: candidates.filter(c => c.is_eligible).length },
      CIVIL: { total: 0, eligible: 0 },
      MECH: { total: 0, eligible: 0 },
      EEE_ECE: { total: 0, eligible: 0 },
      CSE_IT: { total: 0, eligible: 0 },
      AI_DS: { total: 0, eligible: 0 },
    };

    candidates.forEach(c => {
      const cat = getBranchCategory(c.branch);
      if (counts[cat]) {
        counts[cat].total++;
        if (c.is_eligible) counts[cat].eligible++;
      }
    });

    return counts;
  }, [candidates]);

  const getRankBadge = (rank: number | null | undefined, isEligible: boolean) => {
    if (!isEligible || rank === null || rank === undefined) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
          Rank N/A
        </span>
      );
    }
    if (rank === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
          🥇 #1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-slate-100 text-slate-800 border border-slate-300 shadow-xs">
          🥈 #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-xs">
          🥉 #3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-campusblue-50 text-campusblue-800 border border-campusblue-200">
        #{rank}
      </span>
    );
  };

  const getTierBadge = (tier: string, isEligible: boolean) => {
    if (!isEligible) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider">
          Disqualified
        </span>
      );
    }
    switch (tier) {
      case "HIGHLY_EMPLOYABLE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
            Highly Employable
          </span>
        );
      case "QUALIFIED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 uppercase tracking-wider">
            Qualified
          </span>
        );
      case "NOT_READY":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider">
            Not Ready
          </span>
        );
    }
  };

  const formatProficiency = (level: number) => {
    switch (level) {
      case 1: return "Beginner (1)";
      case 2: return "Intermediate (2)";
      case 3: return "Advanced (3)";
      case 4: return "Expert (4)";
      default: return "None (0)";
    }
  };

  // Export CSV
  const handleDownloadCsv = async () => {
    const driveId = parseInt(targetDrive, 10);
    if (!driveId || isNaN(driveId)) return;
    try {
      await adminApi.exportRoundsCsv(driveId);
    } catch (err: any) {
      setError(err?.message || "Failed to download rounds CSV report.");
    }
  };

  // Check if current drive has core branch focus
  const currentDriveTrack = driveInfo?.track || "Software & Technology Track";
  const isCivilDrive = currentDriveTrack.includes("Civil");
  const isMechDrive = currentDriveTrack.includes("Automotive") || currentDriveTrack.includes("Mechanical");
  const isElecDrive = currentDriveTrack.includes("Automation") || currentDriveTrack.includes("Grid");

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader 
        title="AI Shortlisting & Branch Placement Console" 
        description="Dynamic candidate ranking, canonical branch segregation, and domain-tailored competency benchmarks for Core and Tech placements." 
        actionLabel="Export Shortlist (.csv / Excel)"
        onAction={handleDownloadCsv}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Drive Selector & Core Track Overview Card */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            <div className="flex-1 w-full max-w-2xl">
              <label className="block text-xs font-bold text-campusblue-700 uppercase tracking-wider mb-2">
                Active Placement Drive
              </label>
              <select 
                className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm font-semibold p-2.5 bg-white text-slate-800"
                value={targetDrive}
                onChange={(e) => {
                  setTargetDrive(e.target.value);
                  setSelectedBranchFilter("ALL");
                }}
              >
                {drives.length > 0 ? (
                  drives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name.includes("Civil") || d.name.includes("Construction") ? "🏗️ " : d.name.includes("Motors") || d.name.includes("Mechanical") ? "⚙️ " : d.name.includes("Siemens") || d.name.includes("Electrical") ? "⚡ " : "💻 "}
                      {d.name} ({d.company_name || d.company?.name || "General"})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">💻 TechCorp Campus Drive 2026 (TechCorp Updated)</option>
                    <option value="2">💻 Innovate Intern Drive (Innovate Ltd)</option>
                  </>
                )}
              </select>
            </div>
            
            {/* Drive Track Badge & Round 2 Navigation */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-2xl">
                  {isCivilDrive ? "🏗️" : isMechDrive ? "⚙️" : isElecDrive ? "⚡" : "💻"}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Placement Track</div>
                  <div className="text-sm font-bold text-slate-800">{currentDriveTrack}</div>
                </div>
              </div>

              <Link
                href={`/dashboard/tpo/rounds?drive_id=${targetDrive}&round=2`}
                className="px-4 py-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <span>🚀</span> Dispatch Technical Quiz & Manage Rounds →
              </Link>
            </div>
          </div>

          {/* Domain-Specific Placement Banner */}
          {isCivilDrive && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-900 flex items-start gap-3">
              <span className="text-xl">📐</span>
              <div>
                <strong className="font-bold text-emerald-950">Civil Engineering Placement Specialization Active:</strong>
                <p className="mt-0.5 text-emerald-800">
                  Evaluated on AutoCAD Civil drafting, STAAD.Pro finite element structural analysis, Concrete Tech mix design, and IS 456 building code compliance. Candidates are ranked for infrastructure site readiness.
                </p>
              </div>
            </div>
          )}

          {isMechDrive && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-3">
              <span className="text-xl">🏎️</span>
              <div>
                <strong className="font-bold text-amber-950">Mechanical & Automotive Placement Specialization Active:</strong>
                <p className="mt-0.5 text-amber-800">
                  Evaluated on SolidWorks 3D parametric modeling, ANSYS FEA stress simulation, ASME Y14.5 GD&T precision tolerancing, and EV powertrain thermal dynamics.
                </p>
              </div>
            </div>
          )}

          {isElecDrive && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3.5 text-xs text-purple-900 flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <strong className="font-bold text-purple-950">Electrical & Industrial Automation Specialization Active:</strong>
                <p className="mt-0.5 text-purple-800">
                  Evaluated on PLC & SCADA industrial control, MATLAB dynamic modeling, Smart Grid power distribution, and microcontroller firmware reliability.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Round Recruitment Pipeline Progression Banner */}
        <div className="bg-gradient-to-r from-campusblue-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-campusblue-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold shadow-inner shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-300">Recruitment Pipeline</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Round 1: AI Eligibility Complete
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5">
                {candidates.filter(c => c.is_eligible && (c.tier === "HIGHLY_EMPLOYABLE" || c.tier === "QUALIFIED")).length} Candidates Qualified for Round 2 (Technical Quiz Assessment)
              </h3>
              <p className="text-xs text-blue-200 mt-0.5 max-w-2xl">
                Qualified candidates advance to the in-depth technical assessment evaluating required job skills (<strong className="text-white">Hard Difficulty</strong>), followed by technical group discussions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link
              href={`/dashboard/tpo/rounds?drive_id=${targetDrive}&round=2`}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              <span>Give Technical Quiz (Round 2)</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </Link>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition border border-white/20"
            >
              <span>📥</span> CSV
            </button>
          </div>
        </div>

        {/* Branch Segregation Filter Bar */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-campusblue-700 uppercase tracking-wider">
              Segregate Cohort by Department / Branch
            </span>
            <span className="text-xs text-slate-500">
              Showing {filteredCandidates.length} of {candidates.length} candidates
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* All Branches */}
            <button
              type="button"
              onClick={() => setSelectedBranchFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedBranchFilter === "ALL"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🌐 All Branches</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranchFilter === "ALL" ? "bg-slate-700 text-slate-200" : "bg-white text-slate-600"}`}>
                {branchCounts.ALL.total}
              </span>
            </button>

            {/* Civil */}
            <button
              type="button"
              onClick={() => setSelectedBranchFilter("CIVIL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedBranchFilter === "CIVIL"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <span>🏗️ Civil Engineering</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranchFilter === "CIVIL" ? "bg-emerald-800 text-emerald-100" : "bg-emerald-200/70 text-emerald-900"}`}>
                {branchCounts.CIVIL.total}
              </span>
            </button>

            {/* Mechanical */}
            <button
              type="button"
              onClick={() => setSelectedBranchFilter("MECH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedBranchFilter === "MECH"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <span>⚙️ Mechanical</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranchFilter === "MECH" ? "bg-amber-800 text-amber-100" : "bg-amber-200/70 text-amber-900"}`}>
                {branchCounts.MECH.total}
              </span>
            </button>

            {/* Electrical / ECE */}
            <button
              type="button"
              onClick={() => setSelectedBranchFilter("EEE_ECE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedBranchFilter === "EEE_ECE"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
              }`}
            >
              <span>⚡ Electrical / ECE</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranchFilter === "EEE_ECE" ? "bg-purple-800 text-purple-100" : "bg-purple-200/70 text-purple-900"}`}>
                {branchCounts.EEE_ECE.total}
              </span>
            </button>

            {/* CSE / IT */}
            <button
              type="button"
              onClick={() => setSelectedBranchFilter("CSE_IT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedBranchFilter === "CSE_IT"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              <span>💻 Computer Science & IT</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranchFilter === "CSE_IT" ? "bg-blue-800 text-blue-100" : "bg-blue-200/70 text-blue-900"}`}>
                {branchCounts.CSE_IT.total}
              </span>
            </button>

            {/* AI / DS */}
            <button
              type="button"
              onClick={() => setSelectedBranchFilter("AI_DS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedBranchFilter === "AI_DS"
                  ? "bg-cyan-700 text-white shadow-xs"
                  : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200"
              }`}
            >
              <span>🧠 AI & Data Science</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedBranchFilter === "AI_DS" ? "bg-cyan-800 text-cyan-100" : "bg-cyan-200/70 text-cyan-900"}`}>
                {branchCounts.AI_DS.total}
              </span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-campusblue-100 bg-campusblue-50/40 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-campusblue-900 text-sm">
                Candidate Ranking & Recruiter Radar Match
              </h3>
              <p className="text-xs text-campusblue-600 mt-0.5">
                Multi-stage sorted: Hard Eligibility &rarr; Radar Fit % &rarr; Mandatory Skills &rarr; Readiness &rarr; CGPA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                Active Filter: <strong className="text-campusblue-800">{selectedBranchFilter}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-campusblue-50 text-left">
              <thead className="bg-campusblue-50/30">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">Rank</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">Candidate & Branch</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">Job Fit % (Radar Match)</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">Readiness %</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">Radar Preview</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">AI Tier & Justification</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-campusblue-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-campusblue-50">
                {loading && (
                  <tr><td colSpan={7} className="px-6 py-12"><LoadingState message="Calculating Recruiter Radar Fit across branch competencies..." /></td></tr>
                )}
                {error && !loading && (
                  <tr><td colSpan={7} className="px-6 py-12"><ErrorState message={error} onRetry={loadShortlist} /></td></tr>
                )}
                {!loading && !error && filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                      No candidates match the selected branch filter (<span className="font-bold">{selectedBranchFilter}</span>) for this drive.
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredCandidates.map((student, idx) => {
                  const fit = typeof student.fit_score === "number" ? student.fit_score : 0;
                  const readiness = typeof student.readiness_score === "number" ? student.readiness_score : 0;
                  
                  return (
                    <tr 
                      key={student.student_id || idx} 
                      className={`transition ${student.is_eligible ? 'hover:bg-campusblue-50/30' : 'bg-rose-50/20 hover:bg-rose-50/40'}`}
                    >
                      {/* Rank Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getRankBadge(student.rank, student.is_eligible)}
                      </td>

                      {/* Candidate ID, Name & Branch */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-campusblue-700 bg-campusblue-50 px-2 py-0.5 rounded border border-campusblue-100">
                            {student.student_identifier}
                          </span>
                          <span className="text-sm font-bold text-campusblue-900">{student.student_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderBranchBadge(student.branch)}
                          {student.cgpa !== null && student.cgpa !== undefined && (
                            <span className="text-[11px] text-slate-500">
                              CGPA: <strong className="text-slate-700">{student.cgpa}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Job Fit % (Recruiter Radar Match) - Unrounded Exact Score */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-black ${fit >= 75 ? 'text-emerald-700' : fit >= 50 ? 'text-blue-700' : 'text-amber-700'}`}>
                            {fit.toFixed(1)}%
                          </span>
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${fit >= 75 ? 'bg-emerald-500' : fit >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                              style={{ width: `${Math.min(100, Math.max(0, fit))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Global Readiness % - Unrounded Exact Score */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-campusblue-800">
                          {readiness.toFixed(1)}%
                        </span>
                      </td>

                      {/* Radar Preview Trigger */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => setRadarStudent(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white border border-campusblue-200 text-campusblue-700 hover:bg-campusblue-50 hover:border-campusblue-300 transition shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          View Radar
                        </button>
                      </td>

                      {/* AI Recommendation Tier & Justification */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {getTierBadge(student.tier, student.is_eligible)}
                          {student.is_eligible && (student.tier === "HIGHLY_EMPLOYABLE" || student.tier === "QUALIFIED") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span>✓</span> Qualified for Round 2 (Quiz)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              <span>✕</span> Not Qualified for Round 2
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-campusblue-700 mt-1 max-w-sm whitespace-normal leading-tight">
                          {student.justification}
                        </div>
                        {!student.is_eligible && student.failed_criteria && student.failed_criteria.length > 0 && (
                          <div className="text-[10px] text-rose-600 mt-0.5 font-medium">
                            Disqualification: {student.failed_criteria.join("; ")}
                          </div>
                        )}
                      </td>

                      {/* Action: View Full Profile / Resume */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-campusblue-800 hover:text-campusblue-900 bg-campusblue-50 px-3 py-1.5 rounded-md hover:bg-campusblue-100 font-medium text-xs transition border border-campusblue-100 shadow-xs" 
                          onClick={() => setSelectedStudent(student)}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Recruiter Requirement Radar Comparison Drawer / Modal */}
      {radarStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-campusblue-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-campusblue-50/70 border-b border-campusblue-100 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-campusblue-900">
                    Recruiter Radar Fit & Competency Polygon
                  </h3>
                  {getRankBadge(radarStudent.rank, radarStudent.is_eligible)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-campusblue-700 font-medium">
                    {radarStudent.student_name} ({radarStudent.student_identifier})
                  </span>
                  &bull;
                  {renderBranchBadge(radarStudent.branch)}
                </div>
              </div>
              <button 
                onClick={() => setRadarStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Score Metric Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50/80 p-3.5 rounded-lg border border-emerald-200 text-center">
                  <div className="text-2xl font-black text-emerald-800">
                    {radarStudent.fit_score?.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                    Job Fit (Radar Overlap)
                  </div>
                </div>
                <div className="bg-blue-50/80 p-3.5 rounded-lg border border-blue-200 text-center">
                  <div className="text-2xl font-black text-blue-800">
                    {radarStudent.readiness_score?.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mt-0.5">
                    Global Readiness
                  </div>
                </div>
                <div className="bg-purple-50/80 p-3.5 rounded-lg border border-purple-200 text-center">
                  <div className="text-base font-black text-purple-900 mt-1">
                    {radarStudent.tier.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mt-1">
                    AI Tier Status
                  </div>
                </div>
              </div>

              {/* Core Branch Placement Highlights Banner */}
              {getBranchCategory(radarStudent.branch) === "CIVIL" && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏗️</span>
                    <div>
                      <strong className="font-bold">Civil Technical Credentials:</strong> IS 456 Structural Analysis & Concrete Mix Quality Verified
                    </div>
                  </div>
                  <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded">Site Ready</span>
                </div>
              )}

              {getBranchCategory(radarStudent.branch) === "MECH" && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <div>
                      <strong className="font-bold">Mechanical Technical Credentials:</strong> SolidWorks Parametric CAD & ANSYS FEA Stress Model Verified
                    </div>
                  </div>
                  <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">DFM / FEA Ready</span>
                </div>
              )}

              {/* Radar Chart Visual */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Competency Polygon Overlay
                  </span>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-slate-400 inline-block"></span>
                      <span className="text-slate-600">Recruiter Target (Gray)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                      <span className="text-blue-700 font-semibold">Candidate Actual (Blue)</span>
                    </span>
                  </div>
                </div>

                {radarStudent.radar_data && radarStudent.radar_data.length > 0 ? (
                  <div className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarStudent.radar_data}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }} 
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 4]} 
                          tick={{ fill: '#64748b', fontSize: 10 }} 
                        />
                        <Radar
                          name="Recruiter Target"
                          dataKey="required"
                          stroke="#64748b"
                          fill="#94a3b8"
                          fillOpacity={0.35}
                        />
                        <Radar
                          name="Candidate Actual"
                          dataKey="actual"
                          stroke="#2563eb"
                          fill="#3b82f6"
                          fillOpacity={0.5}
                        />
                        <Tooltip />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No specific skill requirements configured for this placement drive.
                  </div>
                )}
              </div>

              {/* Requirement Matrix Table */}
              {radarStudent.radar_data && radarStudent.radar_data.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Evaluated Skill Dimensions
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-slate-600">Skill</th>
                          <th className="px-3 py-2 text-center font-bold text-slate-600">Type</th>
                          <th className="px-3 py-2 text-center font-bold text-slate-600">Target</th>
                          <th className="px-3 py-2 text-center font-bold text-slate-600">Candidate</th>
                          <th className="px-3 py-2 text-center font-bold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {radarStudent.radar_data.map((r, i) => {
                          const meets = r.actual >= r.required;
                          const partial = r.actual > 0 && r.actual < r.required;
                          return (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-semibold text-slate-800">{r.subject}</td>
                              <td className="px-3 py-2 text-center">
                                {r.mandatory ? (
                                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">Mandatory</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">Preferred</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-700 font-medium">{formatProficiency(r.required)}</td>
                              <td className="px-3 py-2 text-center text-slate-700 font-medium">{formatProficiency(r.actual)}</td>
                              <td className="px-3 py-2 text-center">
                                {meets ? (
                                  <span className="text-emerald-700 font-bold">✓ Met</span>
                                ) : partial ? (
                                  <span className="text-amber-700 font-medium">&Delta; Partial</span>
                                ) : (
                                  <span className="text-rose-600 font-bold">&times; Missing</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setRadarStudent(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition shadow-xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Modal */}
      <ResumeModal 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        studentId={selectedStudent?.student_id?.toString() || ""} 
        studentName={selectedStudent?.student_name}
        readinessScore={selectedStudent?.readiness_score}
      />
    </AppLayout>
  );
}
