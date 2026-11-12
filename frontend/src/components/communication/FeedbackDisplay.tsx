"use client";

import React from "react";
import { CommunicationFeedbackData, GradeTier } from "@/services/communicationCoachApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface FeedbackDisplayProps {
  feedback: CommunicationFeedbackData;
  studentResponseText?: string | null;
  audioStorageUrl?: string | null;
  onDraftRevision?: () => void;
  isRevisionLoading?: boolean;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  feedback,
  studentResponseText,
  audioStorageUrl,
  onDraftRevision,
  isRevisionLoading = false,
}) => {
  const {
    rubric_scores,
    delivery_scores,
    acoustic_analytics,
    structural_framework_critique,
    factual_technical_evaluation,
    grade_tier,
    grade_label,
  } = feedback;

  const dimensionLabels: Record<string, { label: string; desc: string }> = {
    clarity: { label: "Clarity", desc: "Syntactic precision, directness, and ease of understanding" },
    relevance: { label: "Relevance to Prompt", desc: "Topical alignment and addressing scenario requirements" },
    coherence_organization: { label: "Coherence & Organization", desc: "Logical transitions, sequencing, and structural development" },
    grammar: { label: "Grammar & Mechanics", desc: "Grammatical accuracy, syntax, punctuation, and sentence construction" },
    professional_language: { label: "Professional Tone", desc: "Workplace-appropriate vocabulary and respectful tone" },
    conciseness: { label: "Conciseness", desc: "Information density and elimination of redundant phrasing" },
    audience_adaptation: { label: "Audience Adaptation", desc: "Terminology and framing appropriate for the specified stakeholder" },
  };

  const deliveryLabels: Record<string, { label: string; desc: string }> = {
    pacing_fluency: { label: "Pacing & Velocity", desc: "Cadence control relative to executive sweet spot (130-155 WPM)" },
    filler_word_control: { label: "Filler Word Control", desc: "Absence of verbal crutches (um, uh, basically, like)" },
    structural_signposting: { label: "Structural Signposting", desc: "Usage of navigational phrases (First, Consequently, In summary)" },
    vocal_confidence_clarity: { label: "Articulation & Enunciation", desc: "Steady vocal clarity without trailing off" },
    audience_adaptation: { label: "Spoken Tone Calibration", desc: "Accessible framing tailored to target stakeholder" },
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500 text-emerald-700";
    if (score >= 70) return "bg-blue-500 text-blue-700";
    if (score >= 50) return "bg-amber-500 text-amber-700";
    return "bg-rose-500 text-rose-700";
  };

  const getGradeTierBadge = (tier: GradeTier | string | undefined | null) => {
    switch (tier) {
      case "E":
        return {
          bg: "bg-emerald-500/20 text-emerald-300 border-emerald-400",
          pill: "bg-emerald-600 text-white",
          label: "Grade E: Exemplary (Expert)",
          desc: "Exceptional flow, optimal pacing (130–155 WPM), near-zero fillers (<1%), crisp articulation, and authoritative yet accessible tone.",
        };
      case "A":
        return {
          bg: "bg-blue-500/20 text-blue-300 border-blue-400",
          pill: "bg-blue-600 text-white",
          label: "Grade A: Accomplished (Advanced)",
          desc: "Highly fluent and clear, well-paced (120–165 WPM), infrequent filler words (<2%), solid structure with smooth transitions.",
        };
      case "P":
      case "B":
        return {
          bg: "bg-cyan-500/20 text-cyan-300 border-cyan-400",
          pill: "bg-cyan-600 text-white",
          label: "Grade P: Proficient (Competent)",
          desc: "Understandable delivery, acceptable pacing, noticeable filler words (2–4%), occasional rambling with room for tighter structure.",
        };
      case "C":
        return {
          bg: "bg-amber-500/20 text-amber-300 border-amber-400",
          pill: "bg-amber-600 text-white",
          label: "Grade C: Developing (Conditional)",
          desc: "Inconsistent pacing, frequent filler words (4–6%), frequent awkward pauses, disorganized thought progression.",
        };
      case "D":
      default:
        return {
          bg: "bg-rose-500/20 text-rose-300 border-rose-400",
          pill: "bg-rose-600 text-white",
          label: "Grade D: Deficient (Needs Improvement)",
          desc: "Strained delivery, heavy hesitation (>6% fillers), excessive long silences, severe disorganization requiring foundational drills.",
        };
    }
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

  const tierInfo = getGradeTierBadge(grade_tier);
  const isSpokenEvaluation = !!delivery_scores || !!acoustic_analytics;

  // Render highlighted transcript for spoken delivery
  const renderHighlightedTranscript = (text: string) => {
    if (!text) return null;
    const fillers = ["um", "uh", "like", "basically", "you know", "sort of", "kind of", "actually", "literally", "right"];
    const regex = new RegExp(`\\b(${fillers.join("|")})\\b`, "gi");

    const parts = text.split(regex);
    return (
      <div className="p-4 bg-white rounded-lg border border-slate-200 text-xs leading-relaxed font-serif">
        {parts.map((part, index) => {
          if (fillers.includes(part.toLowerCase())) {
            return (
              <span
                key={index}
                className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300 mx-0.5 inline-flex items-center gap-1 group relative cursor-help"
                title={`Filler word detected: "${part}"`}
              >
                <span>⚠️ {part}</span>
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Score & Tier Header */}
      <Card className="bg-gradient-to-r from-campusblue-950 via-campusblue-900 to-campusblue-800 text-white p-6 shadow-md border-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xs uppercase tracking-widest text-campusblue-200 font-bold">
                Spoken & Linguistic Assessment
              </span>
              <span className={`px-2.5 py-0.5 text-2xs font-black uppercase rounded-full border ${tierInfo.bg}`}>
                {tierInfo.label}
              </span>
            </div>
            <h2 className="text-2xl font-black">Composite Communication Score</h2>
            <p className="text-xs text-campusblue-100 max-w-xl leading-relaxed">
              {tierInfo.desc}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center">
              <span className="text-4xl font-black tracking-tight">{feedback.overall_score}%</span>
              <span className="text-2xs block uppercase tracking-wider text-campusblue-200 mt-0.5">
                {grade_label || "Overall Quality"}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-xl border border-white/20 text-center">
              <span className="text-3xl font-black tracking-tight">{grade_tier || "E"}</span>
              <span className="text-2xs block uppercase tracking-wider text-campusblue-200 mt-0.5">
                Tier Band
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Spoken Audio Playback if available */}
      {audioStorageUrl && (
        <Card className="p-4 bg-campusblue-50/70 border border-campusblue-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-campusblue-950">
            <span>🎧</span>
            <span>Recorded Spoken Delivery Audio</span>
          </div>
          <audio controls src={audioStorageUrl} className="w-full sm:w-80 h-9 rounded outline-none" />
        </Card>
      )}

      {/* Pillar 1: Acoustic & Spoken Delivery Metrics */}
      {isSpokenEvaluation && acoustic_analytics && (
        <Card className="p-6 bg-white border border-campusblue-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-base font-bold text-campusblue-900 flex items-center gap-2">
              <span>🎙️</span>
              <span>Pillar 1: Acoustic & Spoken Delivery Analytics (How You Speak)</span>
            </h3>
            <span className="text-2xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-700">
              Optimal: 130–155 WPM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* WPM Gauge */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Velocity (WPM)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{acoustic_analytics.words_per_minute}</span>
                <span className="text-2xs text-slate-500">words/min</span>
              </div>
              <div className="mt-2 text-2xs font-semibold">
                {acoustic_analytics.pacing_assessment === "OPTIMAL" ? (
                  <span className="text-emerald-700 font-bold">🟢 Optimal Velocity Band</span>
                ) : acoustic_analytics.pacing_assessment === "SLIGHTLY_SLOW" || acoustic_analytics.pacing_assessment === "TOO_SLOW" ? (
                  <span className="text-amber-700 font-bold">🟡 Slower than Target (&lt;130 WPM)</span>
                ) : (
                  <span className="text-rose-700 font-bold">🔴 Faster than Target (&gt;155 WPM)</span>
                )}
              </div>
            </div>

            {/* Filler Density */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Filler Word Density
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {acoustic_analytics.filler_density_percentage}%
                </span>
                <span className="text-2xs text-slate-500">of total words</span>
              </div>
              <div className="mt-2 text-2xs font-semibold">
                {acoustic_analytics.filler_density_percentage < 2.0 ? (
                  <span className="text-emerald-700 font-bold">🟢 Crisp Delivery (&lt;2% fillers)</span>
                ) : (
                  <span className="text-amber-700 font-bold">🟡 Noticeable Fillers Detected</span>
                )}
              </div>
            </div>

            {/* Speaking Duration */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Speaking Duration
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {Math.round(acoustic_analytics.total_speaking_duration_seconds)}s
                </span>
                <span className="text-2xs text-slate-500">total time</span>
              </div>
              <div className="mt-2 text-2xs text-slate-600">
                Silence: <strong>{acoustic_analytics.silence_duration_seconds}s</strong>
              </div>
            </div>

            {/* Framework Used */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Framework Signposting
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {structural_framework_critique?.framework_used || "PREP"}
                </span>
                <span className="text-2xs text-slate-500">Methodology</span>
              </div>
              <div className="mt-2 text-2xs text-campusblue-700 font-semibold">
                Point → Reason → Example → Recap
              </div>
            </div>
          </div>

          {/* 5 Delivery Rubric Scores */}
          {delivery_scores && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {Object.entries(deliveryLabels).map(([key, { label, desc }]) => {
                const score = delivery_scores[key as keyof typeof delivery_scores] ?? 0;
                return (
                  <div key={key} className="p-3 rounded-lg bg-slate-50/70 border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">{label}</span>
                      <span className="text-xs font-bold text-campusblue-700">{score}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${getScoreColor(score).split(" ")[0]}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                    <p className="text-2xs text-slate-500">{desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamped Filler Occurrences */}
          {acoustic_analytics.filler_words_detected?.length > 0 && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs space-y-1.5">
              <span className="font-bold text-amber-900 block">
                Timestamped Filler Word Highlights:
              </span>
              <div className="flex flex-wrap gap-2">
                {acoustic_analytics.filler_words_detected.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white text-amber-900 rounded border border-amber-200 text-2xs font-semibold shadow-2xs"
                  >
                    &ldquo;{item.word}&rdquo; ({item.count}x) — {item.timestamp_instances?.join(", ") || "throughout"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Interactive Transcript Highlighter */}
      {studentResponseText && isSpokenEvaluation && (
        <Card className="p-5 bg-white border border-campusblue-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-campusblue-900 flex items-center gap-2">
              <span>🔍</span>
              <span>Spoken Transcript Inspection & Word Highlights</span>
            </h3>
            <span className="text-2xs text-slate-500 font-medium">Yellow badges highlight filler qualifiers</span>
          </div>
          {renderHighlightedTranscript(studentResponseText)}
        </Card>
      )}

      {/* Structural Framework Critique (PREP / STAR) */}
      {structural_framework_critique && (
        <Card className="p-5 bg-white border border-purple-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
            <span>📐</span>
            <span>Structural Framework Breakdown ({structural_framework_critique.framework_used})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {structural_framework_critique.framework_used === "PREP" ? (
              <>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Point (Opening Stance):</strong>
                  <p className="text-slate-700">{structural_framework_critique.point_clarity}</p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Reason (Logical Drivers):</strong>
                  <p className="text-slate-700">{structural_framework_critique.reason_validity}</p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Example (Concrete Scenario):</strong>
                  <p className="text-slate-700">{structural_framework_critique.example_effectiveness}</p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Point Recap (Closing Takeaway):</strong>
                  <p className="text-slate-700">{structural_framework_critique.point_recap}</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Situation:</strong>
                  <p className="text-slate-700">{structural_framework_critique.situation_clarity}</p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Task:</strong>
                  <p className="text-slate-700">{structural_framework_critique.task_definition}</p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Action:</strong>
                  <p className="text-slate-700">{structural_framework_critique.action_execution}</p>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60">
                  <strong className="block text-purple-950 mb-1">Result:</strong>
                  <p className="text-slate-700">{structural_framework_critique.result_impact}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Pillar 2: 7 Observable Linguistic Dimensions */}
      <Card className="p-6 bg-white border border-campusblue-100 shadow-sm">
        <h3 className="text-base font-bold text-campusblue-900 mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Pillar 2: Observable Linguistic Dimensions (What You Said)</span>
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
            <span>Actionable Verbal Drills & Practice Goals</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-700">
            {feedback.actionable_suggestions.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Suggested Rewrite */}
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
