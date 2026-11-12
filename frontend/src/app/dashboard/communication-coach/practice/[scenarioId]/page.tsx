"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FeedbackDisplay } from "@/components/communication/FeedbackDisplay";
import { AudioRecordingCockpit } from "@/components/communication/AudioRecordingCockpit";
import {
  communicationCoachApi,
  CommunicationScenarioItem,
  CommunicationPracticeSessionData,
} from "@/services/communicationCoachApi";

export default function PracticeRoomPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const resolvedParams = use(params);
  const scenarioId = parseInt(resolvedParams.scenarioId, 10);
  const router = useRouter();

  const [scenario, setScenario] = useState<CommunicationScenarioItem | null>(null);
  const [session, setSession] = useState<CommunicationPracticeSessionData | null>(null);
  const [responseText, setResponseText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [revising, setRevising] = useState<boolean>(false);
  const [shuffling, setShuffling] = useState<boolean>(false);
  const [practiceMode, setPracticeMode] = useState<"AUDIO" | "TEXT">("TEXT");
  const [deferralNotice, setDeferralNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<{ code: string; message: string; canRetry: boolean } | null>(null);

  useEffect(() => {
    initPractice();
  }, [scenarioId]);

  const initPractice = async () => {
    setLoading(true);
    setErrorBanner(null);
    setDeferralNotice(null);
    try {
      const [scenRes, sessRes] = await Promise.all([
        communicationCoachApi.getScenario(scenarioId),
        communicationCoachApi.startSession(scenarioId),
      ]);
      setScenario(scenRes.scenario);
      setSession(sessRes.session);

      // Default to voice mode for speech categories
      const isVoiceCategory =
        scenRes.scenario.category === "TECHNICAL_EXPLANATION" ||
        scenRes.scenario.category === "STRUCTURED_SPEAKING";

      if (sessRes.session?.submission_mode === "AUDIO" || (isVoiceCategory && !sessRes.session?.student_response)) {
        setPracticeMode("AUDIO");
      } else {
        setPracticeMode("TEXT");
      }

      if (sessRes.session?.student_response) {
        setResponseText(sessRes.session.student_response);
      }
    } catch (err: any) {
      setErrorBanner({
        code: "LOAD_ERROR",
        message: err?.message || "Failed to initialize practice session.",
        canRetry: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const wordCount = responseText.trim() ? responseText.trim().split(/\s+/).length : 0;

  const handleSubmitText = async () => {
    if (!session || !scenario) return;

    if (wordCount < scenario.min_word_limit) {
      setErrorBanner({
        code: "WORD_COUNT_LOW",
        message: `Response is too short (${wordCount} words). Minimum required for this scenario is ${scenario.min_word_limit} words.`,
        canRetry: false,
      });
      return;
    }

    if (wordCount > scenario.max_word_limit) {
      setErrorBanner({
        code: "WORD_COUNT_HIGH",
        message: `Response exceeds maximum word limit (${wordCount} words). Maximum allowed is ${scenario.max_word_limit} words.`,
        canRetry: false,
      });
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await communicationCoachApi.submitResponse(session.id, responseText);
      setSession(res.session);
    } catch (err: any) {
      const status = err?.status;
      setErrorBanner({
        code: err?.fieldErrors?.error || `HTTP_${status}`,
        message: err?.message || "An error occurred while evaluating your response.",
        canRetry: status === 502 || status === 503 || status === 504,
      });

      try {
        const refreshed = await communicationCoachApi.getSession(session.id);
        setSession(refreshed.session);
      } catch (_) {}
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAudio = async (payload: {
    audioBlob: Blob | null;
    transcript: string;
    duration: number;
    telemetry: any;
  }) => {
    if (!session || !scenario) return;

    setSubmitting(true);
    setErrorBanner(null);

    try {
      const formData = new FormData();
      if (payload.audioBlob) {
        formData.append("audio", payload.audioBlob, "spoken_attempt.webm");
      }
      formData.append("transcript", payload.transcript);
      formData.append("duration_seconds", String(payload.duration));
      if (payload.telemetry) {
        formData.append("telemetry", JSON.stringify(payload.telemetry));
      }

      const res = await communicationCoachApi.submitAudioResponse(session.id, formData);
      setSession(res.session);
      setResponseText(res.session.student_response || payload.transcript);
    } catch (err: any) {
      const status = err?.status;
      setErrorBanner({
        code: err?.fieldErrors?.error || `HTTP_${status}`,
        message: err?.message || "An error occurred while evaluating your spoken delivery.",
        canRetry: status === 502 || status === 503 || status === 504,
      });

      try {
        const refreshed = await communicationCoachApi.getSession(session.id);
        setSession(refreshed.session);
      } catch (_) {}
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!session) return;
    setRetrying(true);
    setErrorBanner(null);

    try {
      const res = await communicationCoachApi.retryEvaluation(session.id);
      setSession(res.session);
    } catch (err: any) {
      const status = err?.status;
      setErrorBanner({
        code: err?.fieldErrors?.error || `HTTP_${status}`,
        message: err?.message || "Evaluation retry failed. Please try again.",
        canRetry: true,
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleDraftRevision = async () => {
    if (!session) return;
    setRevising(true);
    try {
      const res = await communicationCoachApi.createRevision(session.id);
      setSession(res.session);
      setResponseText(res.session.student_response || "");
    } catch (err: any) {
      setErrorBanner({
        code: "REVISION_ERROR",
        message: err?.message || "Failed to create revision session.",
        canRetry: false,
      });
    } finally {
      setRevising(false);
    }
  };

  const handleShuffleDynamicTopic = async () => {
    setShuffling(true);
    setErrorBanner(null);
    try {
      const res = await communicationCoachApi.generateDynamicEmail();
      router.push(`/dashboard/communication-coach/practice/${res.scenario.id}`);
    } catch (err: any) {
      setErrorBanner({
        code: "SHUFFLE_ERROR",
        message: err?.message || "Failed to generate a new topic.",
        canRetry: false,
      });
      setShuffling(false);
    }
  };

  const handleToggleVoiceMode = () => {
    if (!scenario) return;

    if (scenario.category === "GROUP_DISCUSSION") {
      setDeferralNotice(
        "Group Discussion voice mode is deferred for subsequent multi-participant conversational turn-taking phase. Please use typed practice for this exercise."
      );
      setPracticeMode("TEXT");
      return;
    }

    setDeferralNotice(null);
    setPracticeMode((prev) => (prev === "AUDIO" ? "TEXT" : "AUDIO"));
  };

  if (loading) {
    return (
      <AppLayout allowedRoles={["STUDENT"]}>
        <div className="py-12 text-center text-xs text-campusblue-600">Initializing practice room...</div>
      </AppLayout>
    );
  }

  if (!scenario || !session) {
    return (
      <AppLayout allowedRoles={["STUDENT"]}>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-base font-bold text-slate-800">
            {errorBanner ? "Failed to Load Practice Room" : "Practice Scenario Not Found"}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {errorBanner?.message || "The requested communication practice scenario or session could not be retrieved."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/dashboard/communication-coach">
              <Button variant="outline" className="text-xs">
                ← Back to Coaching Hub
              </Button>
            </Link>
            <Button onClick={initPractice} className="bg-campusblue-700 text-white text-xs">
              Retry Loading ↻
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isEvaluated = session.status === "EVALUATED" && session.feedback;
  const isEmailScenario = scenario.category === "PROFESSIONAL_EMAIL";
  const isSpokenCategory =
    scenario.category === "TECHNICAL_EXPLANATION" || scenario.category === "STRUCTURED_SPEAKING";

  return (
    <AppLayout allowedRoles={["STUDENT"]}>
      {/* Top Navigation & Status */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/communication-coach"
          className="text-xs font-semibold text-campusblue-700 hover:text-campusblue-900 inline-flex items-center gap-1"
        >
          <span>← Back to Coaching Hub</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {scenario.is_dynamic && (
            <span className="px-2.5 py-0.5 text-2xs font-bold rounded-full bg-purple-100 text-purple-900 border border-purple-300">
              ✨ Dynamic Scenario
            </span>
          )}
          {session.is_follow_up && (
            <span className="px-2.5 py-0.5 text-2xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
              Revision {session.revision_number} (Attempt {session.attempt_number})
            </span>
          )}
          <StatusBadge status={session.status} size="sm" />
        </div>
      </div>

      {/* Page Header with Action Buttons */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <PageHeader
          title={scenario.title}
          subtitle={`${scenario.category.replace("_", " ")} Practice Exercise`}
        />

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Mode Switcher Toggle */}
          <Button
            onClick={handleToggleVoiceMode}
            variant="outline"
            size="sm"
            className="text-xs font-bold border-campusblue-200 text-campusblue-900 hover:bg-campusblue-50"
          >
            {practiceMode === "AUDIO" ? "⌨️ Switch to Typed Practice" : "🎙️ Switch to Voice Practice"}
          </Button>

          {/* Dynamic Re-roll Topic Button */}
          {isEmailScenario && (
            <Button
              onClick={handleShuffleDynamicTopic}
              disabled={shuffling}
              size="sm"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm"
            >
              {shuffling ? "🎲 Shuffling Topic..." : "🎲 Generate Another Topic"}
            </Button>
          )}
        </div>
      </div>

      {/* Deferral Notice Banner */}
      {deferralNotice && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">ℹ️</span>
            <div>
              <strong className="block font-bold">Group Discussion Voice Mode Deferred</strong>
              <span>{deferralNotice}</span>
            </div>
          </div>
          <button
            onClick={() => setDeferralNotice(null)}
            className="text-amber-800 hover:text-amber-950 text-xs font-bold px-2 py-1"
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Error / Warning Banner */}
      {errorBanner && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
          <div>
            <strong className="block text-rose-900 font-semibold mb-0.5">Evaluation Status Notice:</strong>
            <span>{errorBanner.message}</span>
            <span className="block mt-1 text-2xs text-rose-700 font-medium">Your response has been saved safely.</span>
          </div>
          {errorBanner.canRetry && (
            <Button
              onClick={handleRetry}
              disabled={retrying}
              size="sm"
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs shrink-0"
            >
              {retrying ? "Retrying..." : "Retry Evaluation ↻"}
            </Button>
          )}
        </div>
      )}

      {/* Main Practice Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Scenario Brief */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 bg-white border border-campusblue-100 shadow-sm space-y-4">
            <div>
              <span className="text-2xs uppercase tracking-wider text-campusblue-600 font-bold block mb-1">
                Context & Setting
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{scenario.context_scenario}</p>
            </div>

            <div>
              <span className="text-2xs uppercase tracking-wider text-campusblue-600 font-bold block mb-1">
                Target Audience
              </span>
              <div className="p-2.5 bg-campusblue-50/60 rounded-lg border border-campusblue-100/60 text-xs font-semibold text-campusblue-900">
                🎯 {scenario.target_audience}
              </div>
            </div>

            <div>
              <span className="text-2xs uppercase tracking-wider text-campusblue-600 font-bold block mb-1">
                Recommended Length / Pacing
              </span>
              <div className="text-xs text-slate-600">
                {practiceMode === "AUDIO" ? (
                  <>
                    <strong>Speak for 60 to 180 seconds</strong> (Optimal target: 130–155 WPM)
                  </>
                ) : (
                  <>
                    <strong>{scenario.recommended_min_words} – {scenario.recommended_max_words} words</strong> (Hard limits: {scenario.min_word_limit} min / {scenario.max_word_limit} max)
                  </>
                )}
              </div>
            </div>

            {scenario.key_focus_areas?.length > 0 && (
              <div>
                <span className="text-2xs uppercase tracking-wider text-campusblue-600 font-bold block mb-1.5">
                  Key Focus Areas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {scenario.key_focus_areas.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-2xs font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Previous Revision Snippet if this is a follow-up */}
          {session.parent_session?.student_response && (
            <Card className="p-4 bg-purple-50/40 border border-purple-200/80 shadow-sm">
              <span className="text-2xs uppercase tracking-wider text-purple-900 font-bold block mb-1">
                Prior Attempt Reference (Attempt {session.parent_session.attempt_number})
              </span>
              <p className="text-2xs text-purple-950 italic line-clamp-4 font-serif">
                &ldquo;{session.parent_session.student_response}&rdquo;
              </p>
            </Card>
          )}
        </div>

        {/* Right Workspace: Voice Cockpit or Typed Drafting */}
        <div className="lg:col-span-8 space-y-6">
          {/* Task Prompt Banner */}
          <Card className="p-5 bg-white border border-campusblue-100 shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-sm font-bold text-campusblue-900">Task Prompt</h3>
              <span className="text-2xs text-slate-500 font-medium">Read instructions carefully</span>
            </div>
            <div className="p-3.5 bg-campusblue-50/40 rounded-lg border border-campusblue-100 text-xs font-semibold text-campusblue-950 leading-relaxed font-serif">
              {scenario.prompt_text}
            </div>
          </Card>

          {/* Spoken Audio Recording Cockpit */}
          {practiceMode === "AUDIO" ? (
            <AudioRecordingCockpit
              onSubmitAudio={handleSubmitAudio}
              onSwitchToTyped={() => setPracticeMode("TEXT")}
              submitting={submitting}
              minDurationSeconds={30}
              maxDurationSeconds={180}
            />
          ) : (
            /* Typed Response Workspace */
            <Card className="p-6 bg-white border border-campusblue-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700">Your Written Response</label>
                <div className="flex items-center gap-2 text-2xs">
                  <span
                    className={`font-bold ${
                      wordCount < scenario.min_word_limit || wordCount > scenario.max_word_limit
                        ? "text-amber-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {wordCount} words
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">{responseText.length} chars</span>
                </div>
              </div>

              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your response here. Focus on clear organization, appropriate audience adaptation, and professional workplace tone..."
                rows={10}
                className="w-full p-4 border border-slate-300 rounded-lg text-xs leading-relaxed font-serif focus:ring-2 focus:ring-campusblue-500 focus:border-transparent outline-none transition disabled:bg-slate-50"
                disabled={submitting || retrying || revising}
              />

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
                <span className="text-2xs text-slate-500">
                  AI evaluation is formative only and does not influence placement eligibility.
                </span>
                <div className="flex items-center gap-3">
                  {session.status === "EVALUATION_FAILED" && (
                    <Button
                      onClick={handleRetry}
                      disabled={retrying}
                      variant="outline"
                      className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      {retrying ? "Retrying..." : "Retry Evaluation ↻"}
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmitText}
                    disabled={submitting || retrying || wordCount === 0}
                    className="bg-campusblue-700 hover:bg-campusblue-800 text-white text-xs font-bold"
                  >
                    {submitting
                      ? "Evaluating Response..."
                      : isEvaluated
                      ? "Re-submit & Re-evaluate"
                      : "Submit for AI Coaching →"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Structured Feedback Section */}
          {isEvaluated && session.feedback && (
            <FeedbackDisplay
              feedback={session.feedback}
              studentResponseText={session.student_response}
              audioStorageUrl={
                session.audio_storage_path
                  ? communicationCoachApi.getAudioStreamUrl(session.id)
                  : null
              }
              onDraftRevision={handleDraftRevision}
              isRevisionLoading={revising}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
