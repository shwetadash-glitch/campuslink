"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { SkillGapAnalysis, SkillGapItem } from "./types";

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

          {/* Gap Detail Table */}
          <div className="border border-campusblue-100 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-campusblue-50 border-b border-campusblue-100 text-campusblue-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Skill</th>
                    <th className="px-4 py-3">Requirement</th>
                    <th className="px-4 py-3">Your Level</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-campusblue-50 bg-white/90 font-serif">
                  {/* Matched */}
                  {skillGap.matched_skills.map((s) => (
                    <tr key={s.skill_id} className="hover:bg-campusblue-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-campusblue-900 flex items-center gap-1.5">
                        <span>{s.skill_name}</span>
                        {s.is_mandatory && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-campusblue-50 text-campusblue-800 font-bold border border-campusblue-100">
                            Req
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-campusblue-700">{s.required_proficiency}</td>
                      <td className="px-4 py-3 font-medium text-campusblue-800">
                        {s.student_proficiency || "Matched"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status="LOW" size="sm" />
                      </td>
                      <td className="px-4 py-3 text-campusblue-700">{s.recommendation}</td>
                    </tr>
                  ))}

                  {/* Partial */}
                  {skillGap.partial_skills.map((s) => (
                    <tr key={s.skill_id} className="hover:bg-campusblue-50/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-campusblue-900 flex items-center gap-1.5">
                        <span>{s.skill_name}</span>
                        {s.is_mandatory && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-campusblue-50 text-campusblue-800 font-bold border border-campusblue-100">
                            Req
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-campusblue-700">{s.required_proficiency}</td>
                      <td className="px-4 py-3 font-medium text-campusblue-800">
                        {s.student_proficiency}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.severity || "MEDIUM"} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-campusblue-900 font-serif font-medium">{s.recommendation}</td>
                    </tr>
                  ))}

                  {/* Missing */}
                  {skillGap.missing_skills.map((s) => (
                    <tr key={s.skill_id} className="hover:bg-campusblue-50/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-campusblue-900 flex items-center gap-1.5">
                        <span>{s.skill_name}</span>
                        {s.is_mandatory && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-campusblue-50 text-campusblue-800 font-bold border border-campusblue-100">
                            Req
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-campusblue-700">{s.required_proficiency}</td>
                      <td className="px-4 py-3 font-medium text-campusblue-700 italic">Not in profile</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.severity || "CRITICAL"} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-campusblue-900 font-serif font-medium">{s.recommendation}</td>
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






