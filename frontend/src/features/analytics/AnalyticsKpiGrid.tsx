"use client";

import React from "react";
import { InstitutionalOverviewData } from "@/services/analyticsApi";

export interface AnalyticsKpiGridProps {
  overview: InstitutionalOverviewData | null;
  isLoading?: boolean;
}

export const AnalyticsKpiGrid: React.FC<AnalyticsKpiGridProps> = ({ overview, isLoading = false }) => {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-campusblue-100 p-5 h-36">
            <div className="h-3 bg-campusblue-100 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-campusblue-100 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-campusblue-50 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const { cohort, participation, placement, placements_outside_baseline_eligibility, compensation } = overview;
  const eligiblePercent = cohort.total_students > 0
    ? ((cohort.eligible_students / cohort.total_students) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-4">
      {/* Primary KPI Grid (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Enrolled Cohort */}
        <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm flex flex-col justify-between hover:border-campusblue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Total Cohort</span>
              <span className="text-2xs px-2 py-0.5 rounded bg-campusblue-50 text-campusblue-700 font-medium">Enrolled</span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mt-2">{cohort.total_students.toLocaleString()}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-campusblue-50 text-2xs text-campusblue-600">
            <span className="font-semibold text-campusblue-800">{cohort.ineligible_students}</span> ineligible (
            <span title="Backlog ineligibility">{cohort.ineligibility_breakdown.backlog_ineligible} BL</span> /{" "}
            <span title="CGPA ineligibility">{cohort.ineligibility_breakdown.cgpa_ineligible} CGPA</span> /{" "}
            <span title="Both backlog and CGPA">{cohort.ineligibility_breakdown.both_ineligible} Both</span>)
          </div>
        </div>

        {/* 2. Baseline Eligible Cohort */}
        <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm flex flex-col justify-between hover:border-campusblue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Eligible Cohort</span>
              <span className="text-2xs px-2 py-0.5 rounded bg-campusblue-100 text-campusblue-800 font-bold">{eligiblePercent}%</span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mt-2">{cohort.eligible_students.toLocaleString()}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-campusblue-50 text-2xs text-campusblue-600">
            Criteria: <span className="font-medium text-campusblue-800">0 Backlogs &amp; CGPA &ge; 6.0</span>
          </div>
        </div>

        {/* 3. Student Participation */}
        <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm flex flex-col justify-between hover:border-campusblue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Participating</span>
              <span className="text-2xs px-2 py-0.5 rounded bg-campusblue-50 text-campusblue-700 font-bold">{participation.participation_rate}%</span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mt-2">{participation.participating_students.toLocaleString()}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-campusblue-50 text-2xs text-campusblue-600">
            From baseline cohort &bull; <span className="font-semibold text-campusblue-800">{participation.gross_applications}</span> gross apps
          </div>
        </div>

        {/* 4. Formally Issued Offers */}
        <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm flex flex-col justify-between hover:border-campusblue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Issued Offers</span>
              <span className="text-2xs px-2 py-0.5 rounded bg-campusblue-50 text-campusblue-700 font-medium">Offers</span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mt-2">{participation.formally_issued_offers.toLocaleString()}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-campusblue-50 text-2xs text-campusblue-600">
            Includes all formal offer statuses
          </div>
        </div>

        {/* 5. Verified Placements (Key Institutional Success Metric) */}
        <div className="bg-campusblue-50 rounded-lg border-2 border-campusblue-400 p-4 shadow-sm flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-black uppercase tracking-wider text-campusblue-800">Verified Placed</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-campusblue-800 text-white font-black">
                {placement.placement_rate}%
              </span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mt-2">{placement.placed_students.toLocaleString()}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-campusblue-200 text-2xs text-campusblue-700">
            <span className="font-bold text-campusblue-900">VERIFIED</span> &amp; <span className="font-bold text-campusblue-900">ACCEPTED / JOINED</span>
          </div>
        </div>

        {/* 6. Unplaced Eligible Students */}
        <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm flex flex-col justify-between hover:border-campusblue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500">Unplaced Eligible</span>
              <span className="text-2xs px-2 py-0.5 rounded bg-campusblue-50 text-campusblue-700 font-bold">{placement.unplaced_rate}%</span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mt-2">{placement.unplaced_students.toLocaleString()}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-campusblue-50 text-2xs text-campusblue-600">
            Eligible students seeking placement
          </div>
        </div>
      </div>

      {/* Placements Outside Baseline Eligibility (Auditable Complement Card) */}
      <div className="bg-white rounded-lg border border-campusblue-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-campusblue-50 border border-campusblue-200 text-campusblue-700 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-campusblue-900">
                  Verified Placements Outside Baseline Eligibility:
                </h4>
                <span className="text-base font-black px-2.5 py-0.5 bg-campusblue-100 text-campusblue-900 rounded-md">
                  {placements_outside_baseline_eligibility.total_count} Students
                </span>
                <span className="text-2xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-campusblue-50 text-campusblue-700 border border-campusblue-200">
                  Audit Segregated
                </span>
              </div>
              <p className="text-xs text-campusblue-600 mt-1">
                {placements_outside_baseline_eligibility.note}
              </p>
              <p className="text-2xs text-campusblue-500 italic mt-0.5">
                Note: {placements_outside_baseline_eligibility.special_clearance_limitation_note}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs bg-campusblue-50 px-4 py-2.5 rounded-md border border-campusblue-100 shrink-0">
            <div>
              <span className="text-campusblue-500 block text-2xs uppercase">Primary Avg CTC</span>
              <span className="font-bold text-campusblue-900">
                {compensation.student_level_primary.average_ctc !== null
                  ? `${compensation.student_level_primary.average_ctc} ${compensation.unit}`
                  : "N/A"}
              </span>
            </div>
            <div className="border-l border-campusblue-200 pl-4">
              <span className="text-campusblue-500 block text-2xs uppercase">Primary Median CTC</span>
              <span className="font-bold text-campusblue-900">
                {compensation.student_level_primary.median_ctc !== null
                  ? `${compensation.student_level_primary.median_ctc} ${compensation.unit}`
                  : "N/A"}
              </span>
            </div>
            <div className="border-l border-campusblue-200 pl-4">
              <span className="text-campusblue-500 block text-2xs uppercase">Evaluated / Unspec</span>
              <span className="font-bold text-campusblue-900">
                {compensation.student_level_primary.placed_students_evaluated} / {compensation.student_level_primary.placed_students_with_unspecified_compensation}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
