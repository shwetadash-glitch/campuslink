"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StudentAssessmentItem } from "./types";

export interface AssessmentsCardProps {
  assessments: StudentAssessmentItem[];
}

export const AssessmentsCard: React.FC<AssessmentsCardProps> = ({ assessments }) => {
  return (
    <Card
      title="Verified Assessments"
      subtitle="Standardized placement, aptitude, and coding test evaluations."
    >
      {assessments && assessments.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {assessments.map((a) => {
            const pct = Math.round((a.score / (a.max_score || 100)) * 100);
            return (
              <div key={a.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <h4 className="text-sm font-semibold text-campusblue-900">{a.assessment_type}</h4>
                  <p className="text-xs text-campusblue-500">
                    Evaluated on: {new Date(a.assessment_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-campusblue-800">
                    {a.score} / {a.max_score}
                  </span>
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-campusblue-50 text-campusblue-900 border border-campusblue-100">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No assessments recorded"
          description="Assessments conducted by placement coordinators will appear here automatically."
        />
      )}
    </Card>
  );
};



