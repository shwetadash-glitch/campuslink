"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReadinessData } from "./types";

export interface ReadinessScoreCardProps {
  readiness: ReadinessData | null;
  onRecalculate: () => void;
  recalculating: boolean;
}

export const ReadinessScoreCard: React.FC<ReadinessScoreCardProps> = ({
  readiness,
  onRecalculate,
  recalculating,
}) => {
  if (!readiness) return null;

  const score = Math.round(readiness.overall_score || 0);

  const getScoreColor = (sc: number) => {
    if (sc >= 75) return "text-campusblue-700";
    if (sc >= 50) return "text-campusblue-500";
    return "text-campusblue-400"; };

  return (
    <Card
      title="Overall Placement Readiness Score"
      subtitle="Transparent, explainable 7-dimension employability rating calculated by the deterministic readiness engine."
      action={
        <Button
          size="sm"
          onClick={onRecalculate}
          loading={recalculating}
          className="bg-campusblue-700 hover:bg-campusblue-800 focus:ring-campusblue-300 text-white font-serif"
        >
          Recalculate Score
        </Button>
      }
      className="border-campusblue-100 bg-gradient-to-br from-white to-campusblue-50"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Circular Score Badge */}
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-campusblue-300 bg-campusblue-50/50 shadow-inner">
            <span className={`text-4xl font-extrabold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="absolute bottom-3 text-2xs font-semibold uppercase tracking-wider text-campusblue-500">
              / 100
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-campusblue-700">Readiness Tier:</span>
              <StatusBadge status={readiness.readiness_level} size="md" />
            </div>
            <p className="text-xs text-campusblue-500">
              Model: <span className="font-mono text-campusblue-800">{readiness.model_version}</span>
            </p>
            <p className="text-xs text-campusblue-500 mt-0.5">
              Last Evaluated: {new Date(readiness.calculated_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Data Quality Indicator */}
        <div className="w-full sm:w-auto p-4 bg-white border border-campusblue-100 rounded-lg shadow-sm font-serif text-xs space-y-1">
          <span className="font-bold text-campusblue-900 block">Data Completeness & Reliability</span>
          <p className="text-campusblue-700">
            Available Dimensions: <span className="font-semibold text-campusblue-900">{readiness.data_quality?.available_dimensions?.length || 0} / 7</span>
          </p>
          <p className="text-campusblue-700">
            Weights Redistributed: <span className="font-semibold text-campusblue-900">{readiness.data_quality?.weights_redistributed ? "Yes (Fair scoring)" : "No (All active)"}</span>
          </p>
        </div>
      </div>
    </Card>
  );
};








