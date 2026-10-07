"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResumeModal } from "@/features/students/ResumeModal";
import { adminApi, ShortlistCandidate } from "@/services/adminApi";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useEffect } from "react";

export default function ShortlistingPage() {
  
  const [targetDrive, setTargetDrive] = useState("1");
  const [candidates, setCandidates] = useState<ShortlistCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchShortlist = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminApi.getAiShortlist(parseInt(targetDrive), {}, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setCandidates(res.candidates || []);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          return;
        }
        setError(err?.response?.data?.message || err.message || "Failed to fetch shortlist");
        setLoading(false);
      }
    };
    fetchShortlist();
    return () => {
      controller.abort();
    };
  }, [targetDrive]);


  const getTierBadge = (tier: string) => {
    switch(tier) {
      case "HIGHLY_EMPLOYABLE":
        return <span className="bg-campusblue-50 text-campusblue-900 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Highly Employable</span>;
      case "QUALIFIED":
        return <span className="bg-campusblue-50 text-campusblue-900 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Qualified</span>;
      case "NOT_READY":
      default:
        return <span className="bg-campusblue-50 text-campusblue-900 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Not Ready</span>;
    }
  };

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader 
        title="AI Shortlisting Console" 
        description="Configure predictive models and readiness thresholds to automatically filter student cohorts for specific job profiles." 
        actionLabel="Export Shortlist"
        onAction={() => alert("Exporting shortlist...")}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls */}
        <div className="bg-white/90 rounded-lg border border-campusblue-100 shadow-sm p-6 mb-6 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-campusblue-500 uppercase tracking-wider mb-2">Target Placement Drive</label>
            <select 
              className="w-full max-w-md border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm font-semibold"
              value={targetDrive}
              onChange={(e) => setTargetDrive(e.target.value)}
            >
              <option value="1">TechCorp Campus Drive 2026</option>
              <option value="2">Innovate Intern Hiring</option>
            </select>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-campusblue-50 px-4 py-3 rounded-md border border-campusblue-50 text-center min-w-[120px]">
              <div className="text-2xl font-black text-campusblue-900">{candidates.length}</div>
              <div className="text-[10px] font-bold text-campusblue-500 uppercase tracking-wider mt-1">Total Matched</div>
            </div>
            <div className="bg-campusblue-50 px-4 py-3 rounded-md border border-campusblue-50 text-center min-w-[120px]">
              <div className="text-2xl font-black text-campusblue-900">
                {candidates.filter(s => s.tier === "HIGHLY_EMPLOYABLE").length}
              </div>
              <div className="text-[10px] font-bold text-campusblue-500 uppercase tracking-wider mt-1">Highly Employable</div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white/90 rounded-lg border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-campusblue-100 bg-campusblue-50/50 flex justify-between items-center">
            <h3 className="font-bold text-campusblue-900 text-sm">AI Shortlisted Candidates</h3>
            <span className="text-xs font-semibold text-campusblue-500 bg-white px-3 py-1 rounded-full border border-campusblue-100 shadow-sm">
              Model: Readiness Baseline v1.2
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-campusblue-50">
              <thead className="bg-campusblue-50/30">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Candidate ID</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Student Profile</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Readiness %</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">AI Recommendation Tier</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-campusblue-50">
                {loading && (
                  <tr><td colSpan={6} className="px-6 py-10"><LoadingState message="Generating AI Shortlist..." /></td></tr>
                )}
                {error && !loading && (
                  <tr><td colSpan={6} className="px-6 py-10"><ErrorState message={error} /></td></tr>
                )}
                {!loading && !error && candidates.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-campusblue-500 font-medium">No candidates found for this drive.</td></tr>
                )}
                {!loading && !error && candidates.map((student, idx) => (
                  <tr key={idx} className="hover:bg-campusblue-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono font-semibold text-campusblue-700 bg-campusblue-50 px-2 py-1 rounded border border-campusblue-100">
                        {student.student_identifier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-campusblue-900">{student.student_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-campusblue-700 font-medium">
                      {student.branch}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black ${student.readiness_score >= 80 ? 'text-campusblue-700' : student.readiness_score >= 50 ? 'text-campusblue-700' : 'text-red-600'}`}>
                          {Math.round(student.readiness_score)}%
                        </span>
                        <div className="w-20 bg-campusblue-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${student.readiness_score >= 80 ? 'bg-campusblue-300' : student.readiness_score >= 50 ? 'bg-campusblue-300' : 'bg-campusblue-300'}`} 
                            style={{ width: `${student.readiness_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTierBadge(student.tier)}
                      <div className="text-[10px] text-campusblue-500 mt-2 max-w-xs whitespace-normal leading-tight italic">
                        {student.justification}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-campusblue-800 hover:text-campusblue-900 bg-campusblue-50 px-3 py-1.5 rounded-md hover:bg-campusblue-100 font-serif transition" onClick={() => setSelectedStudent(student)}>View Profile</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
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








