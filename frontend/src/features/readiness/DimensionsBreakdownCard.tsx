"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { ReadinessData } from "./types";
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

export interface DimensionsBreakdownCardProps {
  readiness: ReadinessData | null;
}

export const DimensionsBreakdownCard: React.FC<DimensionsBreakdownCardProps> = ({ readiness }) => {
  if (!readiness) return null;

  const comps = readiness.components || {};

  const dimensions = [
    { key: "academic", label: "Academic Foundation", shortLabel: "Academic", score: comps.academic },
    { key: "technical", label: "Technical Skills Mastery", shortLabel: "Technical", score: comps.technical },
    { key: "projects", label: "Applied Projects", shortLabel: "Projects", score: comps.projects },
    { key: "certifications", label: "Industry Certifications", shortLabel: "Certifications", score: comps.certifications },
    { key: "assessments", label: "Standardized Assessments", shortLabel: "Assessments", score: comps.assessments },
    { key: "communication", label: "Communication & Soft Skills", shortLabel: "Communication", score: comps.communication },
    { key: "interview", label: "Mock Interviews & Aptitude", shortLabel: "Interview", score: comps.interview },
  ];

  const chartData = dimensions.map((dim) => ({
    subject: dim.shortLabel,
    score: Math.round(dim.score || 0),
    fullMark: 100,
  }));

  const getBarColor = (score: number) => {
    if (score >= 75) return "bg-campusblue-200";
    if (score >= 50) return "bg-campusblue-200";
    if (score > 0) return "bg-campusblue-200";
    return "bg-white 200";
  };

  return (
    <Card
      title="Multidimensional Breakdown (7 Core Dimensions)"
      subtitle="Examine your performance across each evaluated pillar and its dynamically normalized weight."
    >
      <div className="mb-4">
        <p className="text-sm text-campusblue-700 font-medium mb-2 text-center">Your readiness across the key placement dimensions.</p>
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Radar
                name="Readiness Score"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.4}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t pt-6 border-campusblue-50">
        {dimensions.map((dim) => {
          const effectiveWeight = Math.round(((readiness.effective_weights || {})[dim.key] || 0) * 100);
          const score = Math.round(dim.score || 0);

          return (
            <div key={dim.key} className="p-4 bg-white border border-campusblue-50 rounded-lg shadow-sm font-serif space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-campusblue-900">{dim.label}</span>
                <span className="text-sm font-bold text-campusblue-900">{score} / 100</span>
              </div>

              <div className="w-full bg-campusblue-50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getBarColor(score)}`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-2xs text-campusblue-500 pt-0.5">
                <span>Effective Weight: <strong className="text-campusblue-800">{effectiveWeight}%</strong></span>
                <span>Configured: <strong className="text-campusblue-800">{Math.round(((readiness.configured_weights || {})[dim.key] || 0) * 100)}%</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};






