"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressChart } from "@/components/communication/ProgressChart";
import {
  communicationCoachApi,
  CommunicationProgressData,
  CommunicationPracticeSessionData,
} from "@/services/communicationCoachApi";

export default function CommunicationHistoryPage() {
  const [progress, setProgress] = useState<CommunicationProgressData | null>(null);
  const [sessions, setSessions] = useState<CommunicationPracticeSessionData[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [categoryFilter]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, histRes] = await Promise.all([
        communicationCoachApi.getProgress(),
        communicationCoachApi.getHistory({
          category: categoryFilter === "ALL" ? undefined : categoryFilter,
        }),
      ]);
      setProgress(progRes);
      setSessions(histRes.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load practice history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout allowedRoles={["STUDENT"]}>
      <div className="mb-4">
        <Link
          href="/dashboard/communication-coach"
          className="text-xs font-semibold text-campusblue-700 hover:text-campusblue-900 inline-flex items-center gap-1"
        >
          <span>← Back to Coaching Hub</span>
        </Link>
      </div>

      <PageHeader
        title="Communication Practice History & Analytics"
        subtitle="Track your longitudinal communication growth, 7-dimension competency trends, and past feedback reports."
      />

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Progress Chart */}
      {progress && progress.total_completed_sessions > 0 && (
        <div className="mb-8">
          <ProgressChart
            dimensionAverages={progress.dimension_averages}
            totalCompleted={progress.total_completed_sessions}
            overallAverage={progress.overall_average_score}
          />
        </div>
      )}

      {/* Filter and Sessions Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h3 className="text-base font-bold text-campusblue-900 flex items-center gap-2">
            <span>📋</span>
            <span>Practice Session Logs</span>
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">Filter Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-campusblue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="HR_INTERVIEW">HR Interview</option>
              <option value="TECHNICAL_EXPLANATION">Technical Explanation</option>
              <option value="GROUP_DISCUSSION">Group Discussion</option>
              <option value="PROFESSIONAL_EMAIL">Professional Email</option>
              <option value="STRUCTURED_SPEAKING">Structured Speaking</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-campusblue-600">Loading session history...</div>
        ) : sessions.length === 0 ? (
          <Card className="p-8 text-center bg-white border border-campusblue-100">
            <p className="text-xs text-campusblue-600 mb-3">No practice sessions found for the selected filter.</p>
            <Link href="/dashboard/communication-coach">
              <Button size="sm" className="bg-campusblue-700 text-white text-xs">
                Start a Practice Session
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => (
              <Card key={sess.id} className="p-4 bg-white border border-campusblue-100 hover:border-campusblue-300 transition shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-600">
                        {sess.category.replace("_", " ")}
                      </span>
                      <StatusBadge status={sess.status} size="sm" />
                      {sess.is_follow_up && (
                        <span className="px-2 py-0.5 text-2xs font-bold rounded bg-purple-100 text-purple-800">
                          Revision {sess.revision_number}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-campusblue-900">
                      {sess.scenario?.title || `Scenario #${sess.scenario_id}`}
                    </h4>
                    <div className="flex items-center gap-3 text-2xs text-slate-500">
                      <span>Attempt #{sess.attempt_number}</span>
                      <span>•</span>
                      <span>{sess.word_count ? `${sess.word_count} words` : "No text"}</span>
                      <span>•</span>
                      <span>{sess.evaluated_at ? new Date(sess.evaluated_at).toLocaleDateString() : new Date(sess.created_at || "").toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {sess.feedback?.overall_score !== undefined && (
                      <div className="text-right">
                        <span className="text-xl font-black text-campusblue-900 block leading-none">
                          {sess.feedback.overall_score}%
                        </span>
                        <span className="text-2xs text-slate-500 uppercase tracking-wider font-semibold">Score</span>
                      </div>
                    )}

                    <Link href={`/dashboard/communication-coach/practice/${sess.scenario_id}`}>
                      <Button variant="outline" size="sm" className="text-xs border-campusblue-200 text-campusblue-800 hover:bg-campusblue-50">
                        {sess.status === "EVALUATED" ? "View Report & Iterate →" : "Resume Practice →"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Non-Predictive Disclaimer */}
      <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg text-2xs text-slate-600 text-center">
        <strong>Educational Guidance Notice:</strong> Communication Skills Coach scores are formative learning metrics designed to help students refine workplace communication. They do not constitute formal hiring assessments, employment predictions, or placement eligibility determinations.
      </div>
    </AppLayout>
  );
}
