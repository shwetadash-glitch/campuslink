"use client";

import React, { useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { BranchComparisonData } from "@/services/analyticsApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface BranchComparisonSectionProps {
  comparisonData: BranchComparisonData | null;
  isLoading?: boolean;
}

const emptySubscribe = () => () => {};

export const BranchComparisonSection: React.FC<BranchComparisonSectionProps> = ({
  comparisonData,
  isLoading = false,
}) => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (isLoading || !comparisonData) {
    return (
      <Card title="Academic Department & Branch Comparison" subtitle="Institutional breakdown across engineering departments">
        <div className="h-72 flex items-center justify-center animate-pulse">
          <div className="text-sm text-campusblue-400 font-serif">Loading department telemetry...</div>
        </div>
      </Card>
    );
  }

  const { branches, unit } = comparisonData;

  const chartData = branches.map((b) => ({
    name: b.branch.length > 18 ? `${b.branch.substring(0, 16)}...` : b.branch,
    fullName: b.branch,
    eligible: b.eligible_students,
    placed: b.placed_students,
    rate: b.placement_rate,
    avgCtc: b.average_ctc || 0,
  }));

  return (
    <Card
      title="Academic Department & Branch Comparison"
      subtitle="Comparative placement rates, cohort counts, and primary compensation telemetry"
      action={
        <div className="text-xs font-semibold text-campusblue-700 bg-campusblue-50 px-2.5 py-1 rounded border border-campusblue-100">
          {branches.length} Departments Evaluated
        </div>
      }
    >
      <div className="space-y-6">
        {/* Comparative Chart */}
        <div className="h-80 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F9FD" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#1B3554"
                  fontSize={11}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#80AAD3" fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-campusblue-200 p-3 rounded-lg shadow-md text-xs font-serif">
                          <p className="font-bold text-campusblue-900 mb-1">{data.fullName}</p>
                          <p className="text-campusblue-700">
                            Eligible Students: <strong className="text-campusblue-900">{data.eligible}</strong>
                          </p>
                          <p className="text-campusblue-700">
                            Verified Placed: <strong className="text-campusblue-900">{data.placed}</strong>
                          </p>
                          <p className="text-campusblue-700">
                            Placement Rate: <strong className="text-campusblue-900">{data.rate}%</strong>
                          </p>
                          <p className="text-campusblue-700">
                            Average CTC: <strong className="text-campusblue-900">{data.avgCtc > 0 ? `${data.avgCtc} ${unit}` : "N/A"}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "10px", fontSize: "12px", fontFamily: "serif" }}
                />
                <Bar dataKey="eligible" name="Baseline Eligible" fill="#3F6593" radius={[4, 4, 0, 0]} />
                <Bar dataKey="placed" name="Verified Placed" fill="#1B3554" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-campusblue-400">
              Initializing chart...
            </div>
          )}
        </div>

        {/* Detailed Data Table */}
        <div className="overflow-x-auto border border-campusblue-100 rounded-lg">
          <table className="w-full text-left text-xs font-serif divide-y divide-campusblue-100">
            <thead className="bg-campusblue-50 text-campusblue-800 font-bold uppercase tracking-wider text-2xs">
              <tr>
                <th className="px-4 py-3">Academic Department</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Eligible</th>
                <th className="px-3 py-3 text-right">Participating</th>
                <th className="px-3 py-3 text-right">Placed</th>
                <th className="px-3 py-3 text-right">Placement Rate</th>
                <th className="px-3 py-3 text-right">Unplaced</th>
                <th className="px-3 py-3 text-right">Avg CTC</th>
                <th className="px-3 py-3 text-right">Median CTC</th>
                <th className="px-3 py-3 text-right">Unspecified CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-campusblue-50 bg-white">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-campusblue-400">
                    No academic department records found for the applied filter.
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.branch} className="hover:bg-campusblue-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-campusblue-900">{b.branch}</td>
                    <td className="px-3 py-3 text-right text-campusblue-700">{b.total_students}</td>
                    <td className="px-3 py-3 text-right text-campusblue-700">{b.eligible_students}</td>
                    <td className="px-3 py-3 text-right text-campusblue-700">
                      {b.participating_students}{" "}
                      <span className="text-2xs text-campusblue-500">({b.participation_rate}%)</span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-campusblue-900">{b.placed_students}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded font-bold bg-campusblue-100 text-campusblue-800">
                        {b.placement_rate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-campusblue-700">{b.unplaced_students}</td>
                    <td className="px-3 py-3 text-right font-medium text-campusblue-900">
                      {b.average_ctc !== null ? `${b.average_ctc} ${unit}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-campusblue-900">
                      {b.median_ctc !== null ? `${b.median_ctc} ${unit}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-campusblue-500">
                      {b.placed_students_with_unspecified_compensation}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};
