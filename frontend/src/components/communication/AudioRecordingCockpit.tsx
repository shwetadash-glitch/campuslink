"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AudioWaveformVisualizer } from "./AudioWaveformVisualizer";
import { useAudioRecorder, RecorderState } from "@/hooks/useAudioRecorder";

interface AudioRecordingCockpitProps {
  onSubmitAudio: (payload: {
    audioBlob: Blob | null;
    transcript: string;
    duration: number;
    telemetry: any;
  }) => Promise<void>;
  onSwitchToTyped: () => void;
  submitting?: boolean;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
}

export const AudioRecordingCockpit: React.FC<AudioRecordingCockpitProps> = ({
  onSubmitAudio,
  onSwitchToTyped,
  submitting = false,
  minDurationSeconds = 30,
  maxDurationSeconds = 180,
}) => {
  const {
    state,
    duration,
    errorMessage,
    audioBlob,
    audioUrl,
    liveTranscript,
    telemetry,
    analyserNode,
    requestMicAccess,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    setEvaluating,
    setLiveTranscript,
  } = useAudioRecorder();

  const [manualTranscript, setManualTranscript] = useState<string>("");
  const isEditingTranscript = true;

  const currentTranscript = manualTranscript || liveTranscript;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (currentState: RecorderState) => {
    switch (currentState) {
      case "RECORDING":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-rose-500 text-white animate-pulse flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white" />
            RECORDING LIVE AUDIO
          </span>
        );
      case "PAUSED":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-amber-500 text-white flex items-center gap-1.5 shadow-sm">
            <span>⏸️</span> PAUSED
          </span>
        );
      case "REVIEWING":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-blue-600 text-white flex items-center gap-1.5 shadow-sm">
            <span>🎧</span> READY FOR REVIEW
          </span>
        );
      case "TRANSCRIBING_EVALUATING":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-purple-600 text-white animate-pulse flex items-center gap-1.5 shadow-sm">
            <span>⚙️</span> ANALYZING DELIVERY
          </span>
        );
      case "STANDBY_READY":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-emerald-600 text-white flex items-center gap-1.5 shadow-sm">
            <span>🎙️</span> MIC READY TO RECORD
          </span>
        );
      case "PERMISSION_REQUEST":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-blue-500 text-white animate-pulse flex items-center gap-1.5 shadow-sm">
            <span>⏳</span> REQUESTING ACCESS
          </span>
        );
      case "PERMISSION_DENIED":
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-rose-600 text-white flex items-center gap-1.5 shadow-sm">
            <span>🚫</span> ACCESS DENIED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-2xs font-bold rounded-full bg-slate-600 text-white flex items-center gap-1.5 shadow-sm">
            <span>🎙️</span> HARDWARE UNINITIALIZED
          </span>
        );
    }
  };

  const handleSubmit = async () => {
    if (!currentTranscript.trim()) return;
    setEvaluating();
    await onSubmitAudio({
      audioBlob,
      transcript: currentTranscript.trim(),
      duration: Math.max(15, duration),
      telemetry,
    });
  };

  return (
    <Card className="p-6 bg-white border border-campusblue-100 shadow-sm space-y-5">
      {/* Cockpit Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-2xs uppercase tracking-wider text-campusblue-600 font-bold block mb-0.5">
            Voice-First Practice Cockpit
          </span>
          <h3 className="text-sm font-bold text-campusblue-950">Inbuilt Device Microphone Ingestion</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(state)}
          <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-800 border border-slate-200">
            ⏱️ {formatTime(duration)} / {formatTime(maxDurationSeconds)}
          </span>
        </div>
      </div>

      {/* Dynamic Audio Visualizer Canvas */}
      <AudioWaveformVisualizer
        analyserNode={analyserNode}
        isRecording={state === "RECORDING"}
        height={85}
      />

      {/* Permission Denied Callout */}
      {state === "PERMISSION_DENIED" && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <span>⚠️</span>
            <span>Microphone Access Required</span>
          </div>
          <p>{errorMessage || "Your browser has blocked microphone access."}</p>
          <div className="text-2xs text-rose-700 bg-white p-2.5 rounded border border-rose-200">
            <strong>How to unblock:</strong> Click the padlock or camera icon in your browser URL bar, change
            &quot;Microphone&quot; to <strong>Allow</strong>, and refresh the page.
          </div>
        </div>
      )}

      {/* Recording Control Console */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {state === "UNINITIALIZED" && (
            <Button
              onClick={requestMicAccess}
              className="bg-campusblue-700 hover:bg-campusblue-800 text-white text-xs font-bold px-4 py-2"
            >
              🎙️ Initialize Microphone
            </Button>
          )}

          {state === "STANDBY_READY" && (
            <Button
              onClick={startRecording}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2 flex items-center gap-2 shadow-sm"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              Start Recording
            </Button>
          )}

          {state === "RECORDING" && (
            <>
              <Button
                onClick={pauseRecording}
                variant="outline"
                className="text-xs font-bold border-amber-400 text-amber-700 hover:bg-amber-50"
              >
                ⏸️ Pause
              </Button>
              <Button
                onClick={stopRecording}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2"
              >
                ⏹️ Stop & Review
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                ↺ Discard
              </Button>
            </>
          )}

          {state === "PAUSED" && (
            <>
              <Button
                onClick={resumeRecording}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
              >
                ▶️ Resume
              </Button>
              <Button
                onClick={stopRecording}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4"
              >
                ⏹️ Stop & Review
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                ↺ Discard
              </Button>
            </>
          )}

          {state === "REVIEWING" && (
            <>
              <Button
                onClick={startRecording}
                variant="outline"
                className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-bold"
              >
                ↺ Re-record Attempt
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !currentTranscript.trim()}
                className="bg-campusblue-700 hover:bg-campusblue-800 text-white text-xs font-bold px-5 py-2 shadow-md"
              >
                {submitting ? "Evaluating Spoken Delivery..." : "🚀 Submit for AI Spoken Evaluation"}
              </Button>
            </>
          )}
        </div>

        {/* Accessibility Toggle */}
        <button
          onClick={onSwitchToTyped}
          type="button"
          className="text-2xs font-semibold text-campusblue-700 hover:text-campusblue-900 underline underline-offset-2 transition"
        >
          ⌨️ Switch to Typed Practice
        </button>
      </div>

      {/* Audio Playback Player when Reviewing */}
      {state === "REVIEWING" && audioUrl && (
        <div className="p-3.5 bg-campusblue-50/70 border border-campusblue-100 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-2xs font-semibold text-campusblue-900">
            <span>🎧 Listen to Your Spoken Recording:</span>
            <span>Recorded: {formatTime(duration)}</span>
          </div>
          <audio controls src={audioUrl} className="w-full h-9 rounded outline-none" />
        </div>
      )}

      {/* Real-Time Live Transcript Preview */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-xs">
          <label className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span>📝 Real-Time Speech Preview</span>
            <span className="text-2xs font-normal text-slate-500">(Auto-captured captions)</span>
          </label>
          <span className="text-2xs text-slate-500 font-mono">
            {currentTranscript.trim() ? currentTranscript.trim().split(/\s+/).length : 0} words
          </span>
        </div>

        <textarea
          value={currentTranscript}
          onChange={(e) => setManualTranscript(e.target.value)}
          placeholder={
            state === "RECORDING"
              ? "Listening to your spoken response in real-time... (Captions will appear here automatically)"
              : "Spoken transcript preview will appear here. You can also edit or adjust text before final submission."
          }
          rows={5}
          className="w-full p-3.5 border border-slate-300 rounded-lg text-xs font-serif leading-relaxed focus:ring-2 focus:ring-campusblue-500 focus:border-transparent outline-none transition bg-slate-50/50"
          disabled={state === "TRANSCRIBING_EVALUATING" || submitting}
        />
        <p className="text-2xs text-slate-500">
          Target optimal delivery: <strong>130 – 155 Words Per Minute</strong> with structural signposting and minimal filler words.
        </p>
      </div>
    </Card>
  );
};
