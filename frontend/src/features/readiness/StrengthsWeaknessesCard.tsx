"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { ReadinessData } from "./types";

export interface StrengthsWeaknessesCardProps {
  readiness: ReadinessData | null;
}

export const StrengthsWeaknessesCard: React.FC<StrengthsWeaknessesCardProps> = ({ readiness }) => {
  if (!readiness) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Strengths */}
      <Card
        title="Identified Strengths"
        subtitle="Key competitive advantages detected from your profile and scores."
        className="border-campusblue-50"
      >
        {readiness.strengths && readiness.strengths.length > 0 ? (
          <ul className="space-y-2.5">
            {readiness.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-campusblue-900 font-serif">
                <span className="w-5 h-5 rounded-full bg-campusblue-50 text-campusblue-900 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="leading-relaxed">{str}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-campusblue-500">
            No distinct strengths registered yet. Expand skills and complete assessments.
          </p>
        )}
      </Card>

      {/* Weaknesses / Growth Areas */}
      <Card
        title="Recommended Growth Areas"
        subtitle="Actionable dimensions to improve before placement interview season."
        className="border-campusblue-50"
      >
        {readiness.weaknesses && readiness.weaknesses.length > 0 ? (
          <ul className="space-y-2.5">
            {readiness.weaknesses.map((weak, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-campusblue-900 font-serif">
                <span className="w-5 h-5 rounded-full bg-campusblue-50 text-campusblue-900 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <span className="leading-relaxed">{weak}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-campusblue-700 font-medium">
            Outstanding! No critical weakness dimensions detected.
          </p>
        )}
      </Card>
    </div>
  );
};





