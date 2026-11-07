"use client";

import React, { useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { PlacementFunnelData } from "@/services/analyticsApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface PlacementFunnelSectionProps {
  funnelData: PlacementFunnelData | null;
  isLoading?: boolean;
}

const STAGE_COLORS = [
  "#1B3554", // Enrolled Cohort (Darkest navy)
  "#3F6593", // Baseline Eligible
  "#4D75A4", // Participating
  "#5B86B6", // Interview Stage
  "#6D95C4", // Offered
  "#1B3554", // Verified Placed (Campusblue highlight)
];

const emptySubscribe = () => () => {};

export const PlacementFunnelSection: React.FC<PlacementFunnelSectionProps> = ({
  funnelData,
  isLoading = false,
}) => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (isLoading || !funnelData) {
    return (
      <Card title="Institutional Placement Funnel" subtitle="Telemetry across placement conversion milestones">
        <div className="h-72 flex items-center justify-center animate-pulse">
          <div className="text-sm text-campusblue-400 font-serif">Loading funnel telemetry...</div>
        </div>
      </Card>
    );
  }

  const { stages } = funnelData;

  const chartData = stages.map((s, idx) => ({
    name: s.label,
    count: s.count,
    rate: s.conversion_rate,
    overallRate: s.overall_placement_rate,
    color: STAGE_COLORS[idx % STAGE_COLORS.length],
  }));

  return (
    <Card
      title="Institutional Placement Funnel"
      subtitle="Strict end-to-end conversion telemetry from enrolled cohort to verified institutional placements"
      action={
        <div className="text-xs text-campusblue-600 font-medium">
          {stages.length} Milestones Tracked
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Visual Chart */}
        <div className="lg:col-span-7 h-80 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <XAxis type="number" stroke="#80AAD3" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#1B3554"
                  fontSize={11}
                  width={150}
                  tick={{ fill: "#1B3554" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-campusblue-200 p-3 rounded-lg shadow-md text-xs font-serif">
                          <p className="font-bold text-campusblue-900 mb-1">{data.name}</p>
                          <p className="text-campusblue-700">
                            Count: <strong className="text-campusblue-900">{data.count.toLocaleString()} students</strong>
                          </p>
                          <p className="text-campusblue-700">
                            Conversion from prior stage:{" "}
                            <strong className="text-campusblue-900">{data.rate}%</strong>
                          </p>
                          {data.overallRate !== undefined && (
                            <p className="text-campusblue-700 pt-1 border-t border-campusblue-100 mt-1">
                              Eligible Cohort Placement Rate:{" "}
                              <strong className="text-campusblue-900">{data.overallRate}%</strong>
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-campusblue-400">
              Initializing visualization...
            </div>
          )}
        </div>

        {/* Milestone Step Table / Progression */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-campusblue-600 mb-2">
            Conversion Milestones
          </div>
          <div className="divide-y divide-campusblue-100 border border-campusblue-100 rounded-lg overflow-hidden bg-white">
            {stages.map((st, i) => (
              <div key={st.stage} className="p-3 flex items-center justify-between hover:bg-campusblue-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-campusblue-100 text-campusblue-800 text-2xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-campusblue-900 block">{st.label}</span>
                    <span className="text-2xs text-campusblue-500">
                      {st.stage === "total_cohort" && "Full registered enrollment"}
                      {st.stage === "eligible_cohort" && "0 Backlogs & CGPA >= 6.0"}
                      {st.stage === "participating" && "Active drive or off-campus submission"}
                      {st.stage === "interview_stage" && "Advanced past screening / scheduling"}
                      {st.stage === "offered" && "Issued formal placement offer"}
                      {st.stage === "verified_placed" && "Verified & Accepted/Joined"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-campusblue-900 block">
                    {st.count.toLocaleString()}
                  </span>
                  <span className="text-2xs font-medium text-campusblue-600">
                    {i === 0 ? "100%" : `${st.conversion_rate}% conv`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
