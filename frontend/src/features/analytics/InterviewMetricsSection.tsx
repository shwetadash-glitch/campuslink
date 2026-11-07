"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { InterviewMetricsData } from "@/services/analyticsApi";

export interface InterviewMetricsSectionProps {
  interviewData: InterviewMetricsData | null;
  isLoading?: boolean;
}

export const InterviewMetricsSection: React.FC<InterviewMetricsSectionProps> = ({
  interviewData,
  isLoading = false,
}) => {
  if (isLoading || !interviewData) {
    return (
      <Card title="Interview & Evaluation Telemetry" subtitle="Physical scheduling, round progression, and AI practice metrics">
        <div className="h-64 flex items-center justify-center animate-pulse">
          <div className="text-sm text-campusblue-400 font-serif">Loading interview telemetry...</div>
        </div>
      </Card>
    );
  }

  const {
    attendance_tracking,
    limitation_note,
    scheduled_interviews_count,
    candidates_reached_interview_stage_count,
    completed_round_evaluations_count,
    ai_mock_interviews_completed_count,
    ai_mock_interviews_average_score,
    drive_rounds_breakdown_by_type,
  } = interviewData;

  const roundTypes = Object.entries(drive_rounds_breakdown_by_type);

  return (
    <Card
      title="Interview & Evaluation Telemetry"
      subtitle="Evaluation progress, scheduling telemetry, and AI interview practice metrics"
      action={
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-campusblue-50 text-campusblue-700 border border-campusblue-200">
          Evaluations &amp; Schedules
        </span>
      }
    >
      <div className="space-y-6">
        {/* Prominent Physical Attendance Schema Limitation Alert */}
        <div className="bg-campusblue-50 border border-campusblue-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-campusblue-100 text-campusblue-800 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-900">
                  Physical Candidate Interview Attendance Tracking:
                </h4>
                <span className="inline-block px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider bg-campusblue-200 text-campusblue-900">
                  {attendance_tracking}
                </span>
              </div>
              <p className="text-xs text-campusblue-700 mt-1">
                {limitation_note}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scheduled Interviews */}
          <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Scheduled Interviews
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {scheduled_interviews_count.toLocaleString()}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">Slot assignments in schedule</span>
          </div>

          {/* Reached Interview Stage */}
          <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Reached Interview Stage
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {candidates_reached_interview_stage_count.toLocaleString()}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">Advanced beyond round 1 screening</span>
          </div>

          {/* Completed Evaluations */}
          <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              Round Evaluations Recorded
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {completed_round_evaluations_count.toLocaleString()}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">Explicit PASSED / FAILED decisions</span>
          </div>

          {/* AI Mock Interviews */}
          <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm">
            <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-500 block">
              AI Mock Practice Sessions
            </span>
            <div className="text-2xl font-black text-campusblue-900 mt-1">
              {ai_mock_interviews_completed_count.toLocaleString()}
            </div>
            <span className="text-2xs text-campusblue-600 block mt-1">
              Avg Score:{" "}
              <strong className="text-campusblue-800">
                {ai_mock_interviews_average_score !== null ? `${ai_mock_interviews_average_score} / 100` : "N/A"}
              </strong>
            </span>
          </div>
        </div>

        {/* Round Types Breakdown */}
        {roundTypes.length > 0 && (
          <div className="border border-campusblue-100 rounded-lg p-4 bg-campusblue-50/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-700 mb-3">
              Configured Drive Round Types Distribution
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {roundTypes.map(([type, count]) => (
                <div key={type} className="bg-white border border-campusblue-100 rounded p-2.5">
                  <span className="text-2xs font-medium text-campusblue-500 block truncate" title={type}>
                    {type.replace(/_/g, " ")}
                  </span>
                  <div className="text-base font-bold text-campusblue-900 mt-0.5">{count} rounds</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
