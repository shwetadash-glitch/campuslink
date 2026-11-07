"use client";

import React from "react";
import { Card } from "@/components/ui/Card";

interface ProgressChartProps {
  dimensionAverages: Record<string, number>;
  totalCompleted: number;
  overallAverage: number;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  dimensionAverages,
  totalCompleted,
  overallAverage,
}) => {
  const dimensionLabels: Record<string, string> = {
    clarity: "Clarity",
    relevance: "Relevance",
    coherence_organization: "Coherence & Organization",
    grammar: "Grammar & Mechanics",
    professional_language: "Professional Tone",
    conciseness: "Conciseness",
    audience_adaptation: "Audience Adaptation",
  };

  const getBarColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <Card className="p-6 bg-white border border-campusblue-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-campusblue-900">Communication Competency Breakdown</h3>
          <p className="text-xs text-campusblue-600 mt-0.5">
            Average performance across all {totalCompleted} completed practice sessions.
          </p>
        </div>
        <div className="px-4 py-2 bg-campusblue-50 border border-campusblue-100 rounded-lg text-right shrink-0">
          <span className="text-2xs text-campusblue-600 block uppercase font-bold">Historical Mean</span>
          <span className="text-xl font-black text-campusblue-900">{overallAverage}%</span>
        </div>
      </div>

      <div className="space-y-3.5">
        {Object.entries(dimensionLabels).map(([key, label]) => {
          const score = dimensionAverages[key] ?? 0;
          return (
            <div key={key}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-campusblue-900">{label}</span>
                <span className="font-bold text-campusblue-700">{score}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ${getBarColor(score)}`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
