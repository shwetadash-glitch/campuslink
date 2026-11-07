"use client";

import React from "react";
import { CommunicationFeedbackData } from "@/services/communicationCoachApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface FeedbackDisplayProps {
  feedback: CommunicationFeedbackData;
  onDraftRevision?: () => void;
  isRevisionLoading?: boolean;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  feedback,
  onDraftRevision,
  isRevisionLoading = false,
}) => {
  const { rubric_scores, factual_technical_evaluation } = feedback;

  const dimensionLabels: Record<string, { label: string; desc: string }> = {
    clarity: { label: "Clarity", desc: "Syntactic precision, directness, and ease of understanding" },
    relevance: { label: "Relevance to Prompt", desc: "Topical alignment and addressing scenario requirements" },
    coherence_organization: { label: "Coherence & Organization", desc: "Logical transitions, sequencing, and structural development" },
    grammar: { label: "Grammar & Mechanics", desc: "Grammatical accuracy, syntax, punctuation, and sentence construction" },
    professional_language: { label: "Professional Tone", desc: "Workplace-appropriate vocabulary and respectful tone" },
    conciseness: { label: "Conciseness", desc: "Information density and elimination of redundant phrasing" },
    audience_adaptation: { label: "Audience Adaptation", desc: "Terminology and framing appropriate for the specified stakeholder" },
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500 text-emerald-700";
    if (score >= 70) return "bg-blue-500 text-blue-700";
    if (score >= 50) return "bg-amber-500 text-amber-700";
    return "bg-rose-500 text-rose-700";
  };

  const getAlignmentBadge = (status: string) => {
    switch (status) {
      case "SUPPORTED_BY_GUIDANCE":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Supported by Guidance</span>;
      case "CONTRADICTS_GUIDANCE":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">Contradicts Guidance</span>;
      case "UNVERIFIED":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Unverified Domain Assertion</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-300">Not Applicable (General Communication)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Header */}
      <Card className="bg-gradient-to-r from-campusblue-900 to-campusblue-800 text-white p-6 shadow-md border-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-2xs uppercase tracking-widest text-campusblue-200 font-bold block mb-1">
              Communication Evaluation Results
            </span>
            <h2 className="text-2xl font-black">Composite Communication Score</h2>
            <p className="text-xs text-campusblue-100 mt-1 max-w-xl">
              Calculated deterministically as the equal-weighted arithmetic average across all 7 observable communication dimensions.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center shrink-0">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{feedback.overall_score}%</span>
            <span className="text-2xs block uppercase tracking-wider text-campusblue-200 mt-0.5">Overall Quality</span>
          </div>
        </div>
      </Card>

      {/* 7 Rubric Dimensions Breakdown */}
      <Card className="p-6 bg-white border border-campusblue-100 shadow-sm">
        <h3 className="text-base font-bold text-campusblue-900 mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Observable Communication Dimensions (0 – 100)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(dimensionLabels).map(([key, { label, desc }]) => {
            const score = rubric_scores[key as keyof typeof rubric_scores] ?? 0;
            return (
              <div key={key} className="p-3 rounded-lg bg-campusblue-50/50 border border-campusblue-100/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-campusblue-900">{label}</span>
                  <span className="text-xs font-bold text-campusblue-700">{score}%</span>
                </div>
                <div className="w-full bg-campusblue-200/50 rounded-full h-2 mb-1.5 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getScoreColor(score).split(" ")[0]}`}
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                  />
                </div>
                <p className="text-2xs text-campusblue-600 leading-tight">{desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Independent Factual & Guidance Alignment Check */}
      <Card className="p-6 bg-slate-50 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            <h3 className="text-sm font-bold text-slate-900">
              Model-Assisted Factual Guidance Alignment Check
            </h3>
          </div>
          <div>{getAlignmentBadge(factual_technical_evaluation.guidance_alignment_status)}</div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed mb-3">
          {factual_technical_evaluation.guidance_comparison_notes}
        </p>

        {factual_technical_evaluation.factual_concerns?.length > 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md mb-3">
            <span className="text-xs font-bold text-rose-800 block mb-1">Identified Factual Discrepancies:</span>
            <ul className="list-disc list-inside text-xs text-rose-700 space-y-0.5">
              {factual_technical_evaluation.factual_concerns.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-2xs text-slate-500 italic bg-white p-2.5 rounded border border-slate-200">
          <strong>Note:</strong> {factual_technical_evaluation.disclaimer}
        </div>
      </Card>

      {/* Strengths & Areas to Improve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-white border border-emerald-100 shadow-sm">
          <h3 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
            <span>✅</span>
            <span>Observable Strengths</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-700">
            {feedback.strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 bg-white border border-amber-100 shadow-sm">
          <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
            <span>🎯</span>
            <span>Areas for Improvement</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-700">
            {feedback.areas_to_improve.map((area, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Grounded Excerpts & Explanations */}
      {feedback.grounded_explanations?.length > 0 && (
        <Card className="p-5 bg-white border border-campusblue-100 shadow-sm">
          <h3 className="text-sm font-bold text-campusblue-900 mb-3 flex items-center gap-2">
            <span>🔍</span>
            <span>Grounded Response Excerpts</span>
          </h3>
          <div className="space-y-3">
            {feedback.grounded_explanations.map((item, i) => (
              <div key={i} className="p-3 bg-campusblue-50/40 rounded-lg border border-campusblue-100/60">
                <blockquote className="text-xs italic text-campusblue-950 font-serif border-l-2 border-campusblue-500 pl-2.5 mb-1.5">
                  &ldquo;{item.excerpt}&rdquo;
                </blockquote>
                <p className="text-xs text-campusblue-800">
                  <span className="font-semibold capitalize text-campusblue-900">[{item.dimension.replace("_", " ")}]:</span>{" "}
                  {item.feedback}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Suggested Rewrite (Clearly Labeled as AI Suggestion) */}
      <Card className="p-6 bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💡</span>
          <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
            AI-Suggested Revision (For Learning & Comparison Only)
          </h3>
        </div>
        <p className="text-2xs text-amber-800 mb-3 italic">
          This is an illustrative rewrite demonstrating how the feedback can be applied. It is not your original submission.
        </p>
        <div className="p-4 bg-white rounded-lg border border-amber-200/80 text-xs text-slate-800 leading-relaxed font-serif whitespace-pre-wrap">
          {feedback.improved_example_response}
        </div>
      </Card>

      {/* Next Step / Follow-Up Action */}
      {onDraftRevision && (
        <div className="flex justify-between items-center p-4 bg-white border border-campusblue-100 rounded-lg shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-campusblue-900">Ready to iterate?</h4>
            <p className="text-xs text-campusblue-600">Draft a follow-up revision incorporating the actionable feedback above.</p>
          </div>
          <Button onClick={onDraftRevision} disabled={isRevisionLoading} className="bg-campusblue-700 hover:bg-campusblue-800 text-white">
            {isRevisionLoading ? "Creating Revision..." : "Draft Revision →"}
          </Button>
        </div>
      )}
    </div>
  );
};
