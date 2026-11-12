"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { SkillGapAnalysis, SkillGapItem } from "./types";

interface RecommendationCellProps {
  recommendation: string;
  status: "MISSING" | "PARTIAL" | "MATCHED";
}

const RecommendationCell: React.FC<RecommendationCellProps> = ({
  recommendation,
  status,
}) => {
  if (!recommendation) return null;

  const lines = recommendation
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return (
      <div className="font-normal text-campusblue-900 leading-relaxed font-sans text-xs">
        {recommendation}
      </div>
    );
  }

  const header = lines[0];
  const items = lines.slice(1);

  return (
    <div className="space-y-2 py-1 font-sans text-xs max-w-2xl">
      {/* Header / Diagnosis */}
      <div
        className={`font-semibold leading-snug ${
          status === "MISSING"
            ? "text-rose-950"
            : status === "PARTIAL"
            ? "text-amber-950"
            : "text-campusblue-950"
        }`}
      >
        {header}
      </div>

      {/* Structured Action Items */}
      <div className="space-y-1.5 pl-0.5">
        {items.map((item, idx) => {
          const cleanItem = item.startsWith("•")
            ? item.substring(1).trim()
            : item.trim();
          const colonIndex = cleanItem.indexOf(":");

          if (colonIndex > 0 && colonIndex < 35) {
            const label = cleanItem.substring(0, colonIndex);
            const content = cleanItem.substring(colonIndex + 1);

            return (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    status === "MISSING"
                      ? "bg-rose-500"
                      : status === "PARTIAL"
                      ? "bg-amber-500"
                      : "bg-campusblue-500"
                  }`}
                />
                <div className="text-campusblue-900">
                  <span className="font-semibold text-campusblue-950">
                    {label}:
                  </span>
                  <span>{content}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-campusblue-400 flex-shrink-0" />
              <div className="text-campusblue-900">{cleanItem}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface SkillGapTableProps {
  jobs: any[];
  selectedJobId: number | null;
  onSelectJob: (jobId: number) => void;
  skillGap: SkillGapAnalysis | null;
  loading: boolean;
}

export const SkillGapTable: React.FC<SkillGapTableProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  skillGap,
  loading,
}) => {
  return (
    <Card
      title="Target Job Skill-Gap Analysis"
      subtitle="Compare your acquired competencies against the exact requirements of any posted placement opportunity."
      className="border-campusblue-50"
    >
      {/* Job selector */}
      <div className="max-w-md mb-6">
        <label className="block text-xs font-semibold text-campusblue-800 mb-1">
          Select Target Job to Compare
        </label>
        <Select
          value={selectedJobId || ""}
          onChange={(e) => onSelectJob(Number(e.target.value))}
        >
          <option value="" disabled>-- Select a Job Opportunity --</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} {job.company_name ? `(${job.company_name})` : ""}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <LoadingState message="Analyzing skill overlap and gap severity..." />
      ) : skillGap ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-campusblue-50 border border-campusblue-100 shadow-sm rounded-xl">
              <span className="text-2xs font-semibold uppercase tracking-wider text-campusblue-900 font-serif block">
                Job Readiness
              </span>
              <span className="text-2xl font-black text-campusblue-800 mt-1 block">
                {Math.round(skillGap.job_readiness_score)}%
              </span>
            </div>

            <div className="p-4 bg-campusblue-50 border border-campusblue-100 shadow-sm rounded-xl">
              <span className="text-2xs font-semibold uppercase tracking-wider text-campusblue-900 font-serif block">
                Matched Skills
              </span>
              <span className="text-2xl font-black text-campusblue-800 mt-1 block">
                {skillGap.matched_count}
              </span>
            </div>

            <div className="p-4 bg-campusblue-50 border border-campusblue-100 shadow-sm rounded-xl">
              <span className="text-2xs font-semibold uppercase tracking-wider text-campusblue-900 font-serif block">
                Partial Matches
              </span>
              <span className="text-2xl font-black text-campusblue-800 mt-1 block">
                {skillGap.partial_count}
              </span>
            </div>

            <div className="p-4 bg-campusblue-50 border border-campusblue-100 shadow-sm rounded-xl">
              <span className="text-2xs font-semibold uppercase tracking-wider text-campusblue-900 font-serif block">
                Missing Skills
              </span>
              <span className="text-2xl font-black text-campusblue-800 mt-1 block">
                {skillGap.missing_count}
              </span>
            </div>
          </div>

          {/* Gap Detail Table: Prioritizes Critical and Missing Competency Gaps First */}
          <div className="border border-campusblue-100 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-campusblue-50/70 px-4 py-2 border-b border-campusblue-100 flex items-center justify-between text-2xs text-campusblue-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Competency Priority: Gaps requiring urgent recovery are listed first.</span>
              </span>
              <span className="text-3xs text-campusblue-500">Sorted: Missing → Partial → Matched</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-campusblue-50 border-b border-campusblue-100 text-campusblue-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Skill / Competency</th>
                    <th className="px-4 py-3">Requirement</th>
                    <th className="px-4 py-3">Your Level</th>
                    <th className="px-4 py-3">Remediation Urgency</th>
                    <th className="px-4 py-3 min-w-[360px]">Actionable Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-campusblue-50 bg-white/90 font-serif">
                  {/* 1. Missing Skills (Highest Priority for Remediation) */}
                  {skillGap.missing_skills.map((s) => (
                    <tr key={s.skill_id} className="bg-rose-50/20 hover:bg-rose-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-campusblue-900 flex items-center gap-1.5 whitespace-nowrap">
                        <span>{s.skill_name}</span>
                        {s.is_mandatory ? (
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                            Mandatory Gap
                          </span>
                        ) : (
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-campusblue-700 whitespace-nowrap">{s.required_proficiency}</td>
                      <td className="px-4 py-3 font-medium text-rose-700 italic whitespace-nowrap">Not in profile</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={s.severity || "CRITICAL"} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-campusblue-900">
                        <RecommendationCell recommendation={s.recommendation} status="MISSING" />
                      </td>
                    </tr>
                  ))}

                  {/* 2. Partial Skills (Intermediate Priority) */}
                  {skillGap.partial_skills.map((s) => (
                    <tr key={s.skill_id} className="bg-amber-50/15 hover:bg-amber-50/35 transition-colors">
                      <td className="px-4 py-3 font-semibold text-campusblue-900 flex items-center gap-1.5 whitespace-nowrap">
                        <span>{s.skill_name}</span>
                        {s.is_mandatory && (
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            Mandatory Req
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-campusblue-700 whitespace-nowrap">{s.required_proficiency}</td>
                      <td className="px-4 py-3 font-medium text-amber-800 whitespace-nowrap">
                        {s.student_proficiency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={s.severity || "MEDIUM"} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-campusblue-900">
                        <RecommendationCell recommendation={s.recommendation} status="PARTIAL" />
                      </td>
                    </tr>
                  ))}

                  {/* 3. Matched Skills (Acquired Competencies) */}
                  {skillGap.matched_skills.map((s) => (
                    <tr key={s.skill_id} className="hover:bg-campusblue-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-campusblue-900 flex items-center gap-1.5 whitespace-nowrap">
                        <span>{s.skill_name}</span>
                        {s.is_mandatory && (
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-campusblue-50 text-campusblue-800 font-bold border border-campusblue-100">
                            Req
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-campusblue-700 whitespace-nowrap">{s.required_proficiency}</td>
                      <td className="px-4 py-3 font-medium text-emerald-800 whitespace-nowrap">
                        {s.student_proficiency || "Matched"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status="LOW" size="sm" />
                      </td>
                      <td className="px-4 py-3 text-campusblue-700">
                        <RecommendationCell recommendation={s.recommendation} status="MATCHED" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Select a job to view gap analysis"
          description="Choose an opportunity from the dropdown above to view an instant side-by-side competency comparison."
        />
      )}
    </Card>
  );
};






