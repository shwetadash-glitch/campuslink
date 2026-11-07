"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { CompensationAnalyticsData } from "@/services/analyticsApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface CompensationAnalyticsSectionProps {
  compensationData: CompensationAnalyticsData | null;
  isLoading?: boolean;
}

const BRACKET_COLORS = [
  "#80AAD3", // < 5 LPA
  "#5B86B6", // 5-10 LPA
  "#3F6593", // 10-20 LPA
  "#1B3554", // > 20 LPA
];

const emptySubscribe = () => () => {};

export const CompensationAnalyticsSection: React.FC<CompensationAnalyticsSectionProps> = ({
  compensationData,
  isLoading = false,
}) => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [activeTab, setActiveTab] = useState<"primary" | "gross">("primary");

  if (isLoading || !compensationData) {
    return (
      <Card title="Compensation Telemetry" subtitle="Verified CTC distribution and statistical analysis">
        <div className="h-72 flex items-center justify-center animate-pulse">
          <div className="text-sm text-campusblue-400 font-serif">Loading compensation telemetry...</div>
        </div>
      </Card>
    );
  }

  const { student_level_primary, offer_level_gross, exclusions, unit } = compensationData;

  const currentStats = activeTab === "primary" ? student_level_primary : offer_level_gross;
  const currentBrackets = currentStats.brackets;

  const bracketData = [
    { name: "< 5 LPA", count: currentBrackets.below_5_lpa, color: BRACKET_COLORS[0] },
    { name: "5 - 10 LPA", count: currentBrackets["5_to_10_lpa"], color: BRACKET_COLORS[1] },
    { name: "10 - 20 LPA", count: currentBrackets["10_to_20_lpa"], color: BRACKET_COLORS[2] },
    { name: "> 20 LPA", count: currentBrackets.above_20_lpa, color: BRACKET_COLORS[3] },
  ];

  const totalEvaluated = activeTab === "primary"
    ? student_level_primary.placed_students_with_valid_compensation
    : offer_level_gross.total_verified_offers;

  return (
    <Card
      title="Verified Compensation Telemetry"
      subtitle="Auditable compensation metrics segregated into student-level primary offers and gross offer telemetry"
      action={
        <div className="flex items-center gap-1 bg-campusblue-50 p-1 rounded-lg border border-campusblue-200">
          <button
            type="button"
            onClick={() => setActiveTab("primary")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === "primary"
                ? "bg-campusblue-800 text-white shadow-sm"
                : "text-campusblue-700 hover:text-campusblue-900"
            }`}
          >
            Student Primary Offers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gross")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === "gross"
                ? "bg-campusblue-800 text-white shadow-sm"
                : "text-campusblue-700 hover:text-campusblue-900"
            }`}
          >
            Offer-Level Gross
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-campusblue-50/50 border border-campusblue-100 rounded-lg p-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Average Compensation
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {currentStats.average_ctc !== null ? `${currentStats.average_ctc} ${unit}` : "N/A"}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">
              {activeTab === "primary" ? "Deterministic primary offer" : "All verified qualifying offers"}
            </span>
          </div>

          <div className="bg-campusblue-50/50 border border-campusblue-100 rounded-lg p-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Median Compensation
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {currentStats.median_ctc !== null ? `${currentStats.median_ctc} ${unit}` : "N/A"}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">50th percentile distribution</span>
          </div>

          <div className="bg-campusblue-50/50 border border-campusblue-100 rounded-lg p-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Highest CTC
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {currentStats.highest_ctc !== null ? `${currentStats.highest_ctc} ${unit}` : "N/A"}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">Maximum verified package</span>
          </div>

          <div className="bg-campusblue-50/50 border border-campusblue-100 rounded-lg p-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Lowest CTC
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {currentStats.lowest_ctc !== null ? `${currentStats.lowest_ctc} ${unit}` : "N/A"}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">Minimum verified package</span>
          </div>
        </div>

        {/* Distribution & Population Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Brackets Chart */}
          <div className="lg:col-span-8">
            <div className="text-xs font-bold uppercase tracking-wider text-campusblue-600 mb-3">
              Salary Tier Distribution ({activeTab === "primary" ? "Placed Students" : "Verified Offers"})
            </div>
            {totalEvaluated === 0 ? (
              <div className="h-64 flex items-center justify-center border border-dashed border-campusblue-200 rounded-lg text-xs text-campusblue-400 font-serif">
                No verified compensation records available to display distribution.
              </div>
            ) : (
              <div className="h-64 w-full">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bracketData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <XAxis dataKey="name" stroke="#1B3554" fontSize={11} />
                      <YAxis stroke="#80AAD3" fontSize={11} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-campusblue-200 p-2.5 rounded-lg shadow-md text-xs font-serif">
                                <p className="font-bold text-campusblue-900">{data.name}</p>
                                <p className="text-campusblue-700">
                                  Count: <strong className="text-campusblue-900">{data.count}</strong>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {bracketData.map((entry, index) => (
                          <Cell key={`bracket-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-campusblue-400">
                    Initializing salary distribution...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Population Summary Box */}
          <div className="lg:col-span-4 bg-campusblue-50/80 border border-campusblue-100 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800">
              {activeTab === "primary" ? "Primary Placement Basis" : "Gross Offer Basis"}
            </h4>
            <div className="text-xs text-campusblue-700 space-y-2">
              {activeTab === "primary" ? (
                <>
                  <div className="flex justify-between py-1 border-b border-campusblue-100">
                    <span>Total Placed Students:</span>
                    <strong className="text-campusblue-900">{student_level_primary.placed_students_count}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-campusblue-100">
                    <span>Evaluated with Valid CTC:</span>
                    <strong className="text-campusblue-900">
                      {student_level_primary.placed_students_with_valid_compensation}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Unspecified Compensation:</span>
                    <strong className="text-campusblue-900">
                      {student_level_primary.placed_students_with_unspecified_compensation}
                    </strong>
                  </div>
                  <p className="text-2xs text-campusblue-500 pt-2 border-t border-campusblue-100">
                    Determined via: 1. JOINED &gt; ACCEPTED &bull; 2. Latest acceptance date &bull; 3. Highest CTC &bull; 4. Lowest ID.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-campusblue-100">
                    <span>Total Qualifying Offers:</span>
                    <strong className="text-campusblue-900">{offer_level_gross.total_verified_offers}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-campusblue-100">
                    <span>Evaluation Filter:</span>
                    <strong className="text-campusblue-900">VERIFIED &amp; ACCEPTED/JOINED</strong>
                  </div>
                  <p className="text-2xs text-campusblue-500 pt-2 border-t border-campusblue-100">
                    Includes all verified offers issued to baseline eligible students with CTC &gt; 0.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Auditable Exclusions Callout */}
        <div className="border border-campusblue-200 bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-campusblue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800">
              Auditable Telemetry Exclusions
            </h4>
          </div>
          <p className="text-xs text-campusblue-600 mb-3">
            To preserve institutional statistical integrity, offers failing any verified criterion are strictly excluded from compensation formulas:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-campusblue-50/50 rounded border border-campusblue-100">
              <span className="text-2xs text-campusblue-500 block uppercase font-bold">Unverified / Pending</span>
              <span className="text-lg font-bold text-campusblue-900">
                {exclusions.unverified_or_pending_offers_excluded_count} offers
              </span>
              <span className="text-2xs text-campusblue-500 block mt-0.5">Verification status != VERIFIED</span>
            </div>
            <div className="p-3 bg-campusblue-50/50 rounded border border-campusblue-100">
              <span className="text-2xs text-campusblue-500 block uppercase font-bold">Non-Accepted / Non-Joined</span>
              <span className="text-lg font-bold text-campusblue-900">
                {exclusions.non_accepted_or_joined_offers_excluded_count} offers
              </span>
              <span className="text-2xs text-campusblue-500 block mt-0.5">Declined, Deferred, or Pending decision</span>
            </div>
            <div className="p-3 bg-campusblue-50/50 rounded border border-campusblue-100">
              <span className="text-2xs text-campusblue-500 block uppercase font-bold">Zero or Null CTC</span>
              <span className="text-lg font-bold text-campusblue-900">
                {exclusions.zero_or_null_ctc_offers_excluded_count} offers
              </span>
              <span className="text-2xs text-campusblue-500 block mt-0.5">No numerical compensation provided</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
