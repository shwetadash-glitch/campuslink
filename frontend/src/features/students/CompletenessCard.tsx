"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { CompletenessData } from "./types";

export interface CompletenessCardProps {
  completeness?: CompletenessData | null;
}

export const CompletenessCard: React.FC<CompletenessCardProps> = ({ completeness }) => {
  if (!completeness) return null;

  const percentage = Math.round(completeness.percentage || 0);

  const getBarColor = (pct: number) => {
    if (pct >= 80) return "bg-campusblue-500";
    if (pct >= 50) return "bg-campusblue-500";
    return "bg-campusblue-500";
  };

  return (
    <Card
      title="Profile Completeness"
      subtitle="Complete all sections to unlock maximum placement readiness."
      className="border-campusblue-50 bg-gradient-to-br from-white to-blue-50/30"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold text-campusblue-900">{percentage}%</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-campusblue-50 text-campusblue-900">
          {percentage === 100 ? "Complete" : `${completeness.missing_sections?.length || 0} Sections Pending`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-campusblue-100 rounded-full h-2.5 mb-6 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Completed */}
        <div>
          <h4 className="font-semibold text-campusblue-900 mb-1.5 flex items-center gap-1">
            <svg className="w-4 h-4 text-campusblue-700" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Completed Sections
          </h4>
          {completeness.completed_sections?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {completeness.completed_sections.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-campusblue-50 text-campusblue-800 rounded border border-campusblue-100">
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-campusblue-300">None completed yet</p>
          )}
        </div>

        {/* Missing */}
        <div>
          <h4 className="font-semibold text-campusblue-900 mb-1.5 flex items-center gap-1">
            <svg className="w-4 h-4 text-campusblue-700" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Missing / Action Needed
          </h4>
          {completeness.missing_sections?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {completeness.missing_sections.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-campusblue-50 text-campusblue-800 rounded border border-campusblue-100">
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-campusblue-700 font-medium">All profile sections complete!</p>
          )}
        </div>
      </div>
    </Card>
  );
};




