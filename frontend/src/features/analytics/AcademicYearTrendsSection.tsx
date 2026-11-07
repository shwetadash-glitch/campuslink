"use client";

import React, { useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { AcademicYearTrendsData } from "@/services/analyticsApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface AcademicYearTrendsSectionProps {
  trendsData: AcademicYearTrendsData | null;
  isLoading?: boolean;
}

const emptySubscribe = () => () => {};

export const AcademicYearTrendsSection: React.FC<AcademicYearTrendsSectionProps> = ({
  trendsData,
  isLoading = false,
}) => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (isLoading || !trendsData) {
    return (
      <Card title="Multi-Year Institutional Trends" subtitle="Telemetry across historical graduating classes">
        <div className="h-72 flex items-center justify-center animate-pulse">
          <div className="text-sm text-campusblue-400 font-serif">Loading multi-year trends...</div>
        </div>
      </Card>
    );
  }

  const { trends, unit, branch_filter } = trendsData;

  const chartData = trends.map((t) => ({
    year: `Class of ${t.graduation_year}`,
    rawYear: t.graduation_year,
    placementRate: t.placement_rate,
    avgCtc: t.average_ctc || 0,
    placedCount: t.placed_students,
    eligibleCount: t.eligible_students,
  }));

  return (
    <Card
      title="Multi-Year Placement & Compensation Trends"
      subtitle={
        branch_filter
          ? `Historical trajectory for ${branch_filter}`
          : "Institutional historical trajectory across graduating cohorts"
      }
      action={
        <div className="text-xs font-semibold text-campusblue-700 bg-campusblue-50 px-2.5 py-1 rounded border border-campusblue-100">
          {trends.length} Cohorts Tracked
        </div>
      }
    >
      <div className="space-y-6">
        {trends.length === 0 ? (
          <div className="py-12 text-center text-sm text-campusblue-400 font-serif">
            No historical graduating cohort telemetry found for the selected department filter.
          </div>
        ) : (
          <>
            {/* Trend Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trends.slice(-4).map((t) => (
                <div key={t.graduation_year} className="bg-campusblue-50/50 border border-campusblue-100 rounded-lg p-3">
                  <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
                    Class of {t.graduation_year}
                  </span>
                  <div className="text-xl font-black text-campusblue-900 mt-1">{t.placement_rate}%</div>
                  <div className="text-2xs text-campusblue-600 mt-0.5">
                    {t.placed_students} / {t.eligible_students} placed &bull; Avg:{" "}
                    <span className="font-semibold text-campusblue-800">
                      {t.average_ctc !== null ? `${t.average_ctc} ${unit}` : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dual-Axis Line Chart */}
            <div className="h-80 w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F9FD" />
                    <XAxis dataKey="year" stroke="#1B3554" fontSize={11} />
                    <YAxis
                      yAxisId="left"
                      stroke="#1B3554"
                      fontSize={11}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#5B86B6"
                      fontSize={11}
                      unit={` ${unit}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-campusblue-200 p-3 rounded-lg shadow-md text-xs font-serif">
                              <p className="font-bold text-campusblue-900 mb-1">{data.year}</p>
                              <p className="text-campusblue-700">
                                Placement Rate: <strong className="text-campusblue-900">{data.placementRate}%</strong>
                              </p>
                              <p className="text-campusblue-700">
                                Average CTC:{" "}
                                <strong className="text-campusblue-900">
                                  {data.avgCtc > 0 ? `${data.avgCtc} ${unit}` : "N/A"}
                                </strong>
                              </p>
                              <p className="text-campusblue-700">
                                Placed / Eligible:{" "}
                                <strong className="text-campusblue-900">
                                  {data.placedCount} / {data.eligibleCount}
                                </strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontFamily: "serif" }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="placementRate"
                      name="Verified Placement Rate (%)"
                      stroke="#1B3554"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#1B3554" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgCtc"
                      name={`Average Primary CTC (${unit})`}
                      stroke="#5B86B6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: "#5B86B6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-campusblue-400">
                  Initializing line chart...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
