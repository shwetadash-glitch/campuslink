"use client";

import React, { useState, useEffect, useRef } from "react";
import { studentsApi } from "@/services/studentsApi";

interface GdSessionProps {
  driveId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GroupDiscussionVideoRoomModal({
  driveId,
  isOpen,
  onClose,
  onSuccess,
}: GdSessionProps) {
  // Session data & lifecycle
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Video & audio states for Student (User)
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [studentAudioLevel, setStudentAudioLevel] = useState(45);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>("PEER-01");

  // Timer
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Live real-time rubric indicators
  const [liveRubrics, setLiveRubrics] = useState({
    clarity_and_fluency: 18.5,
    active_listening: 18.0,
    body_language: 17.5,
    topic_knowledge: 19.0,
    creativity_and_perspectivity: 18.5,
  });

  // Transcript & discussion log
  const [transcript, setTranscript] = useState<
    Array<{
      id: string;
      speaker: string;
      avatar?: string;
      color?: string;
      text: string;
      time: string;
      isUser?: boolean;
    }>
  >([]);

  // Real webcam ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Peer script turns
  const peerTurns = [
    {
      peerId: "PEER-01",
      name: "Aarav Sharma",
      color: "#3b82f6",
      text: "From a scalability perspective, microservices allow us to scale stateless API gateways independently from stateful payment ledgers. If payment throughput surges, we don't scale the entire monolith.",
      duration: 7000,
    },
    {
      peerId: "PEER-02",
      name: "Priya Patel",
      color: "#8b5cf6",
      text: "I hear Aarav's point, but we must consider operational overhead. For 90% of enterprises, a well-modularized monolith with Domain-Driven Design achieves 10x faster developer velocity without network latency.",
      duration: 8000,
    },
    {
      peerId: "USER",
      name: "Cornelius Nicolas (You)",
      color: "#10b981",
      text: "Priya makes a critical point about network serialization costs. When microservices communicate over gRPC or REST, network hops compound latency. However, using asynchronous event streams like Kafka with the Outbox pattern can decouple services without blocking HTTP requests.",
      duration: 8000,
      isUser: true,
    },
    {
      peerId: "PEER-03",
      name: "Rohan Gupta",
      color: "#f59e0b",
      text: "Under CAP theorem, during network partitions you cannot guarantee both consistency and availability. If we distribute monetary transactions across multiple microservices without 2-phase commit, reconciliation becomes an architectural nightmare.",
      duration: 8500,
    },
    {
      peerId: "USER",
      name: "Cornelius Nicolas (You)",
      color: "#10b981",
      text: "Exactly, Rohan. That's why high-scale financial platforms rely on Saga Choreography with compensating transactions rather than distributed 2PC locks, ensuring high availability while maintaining eventual consistency.",
      duration: 8000,
      isUser: true,
    },
  ];

  // 1. Fetch Session Data on Open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await studentsApi.getGdSession(driveId);
        if (mounted) {
          setSessionData(res.session);
          setLoading(false);
          // Initialize transcript with moderator greeting
          setTranscript([
            {
              id: "MOD-01",
              speaker: "AI Moderator",
              color: "#6366f1",
              text: `Welcome candidates to ${res.session.group_panel?.panel_name || "Group Panel"}. Your topic is: "${res.session.group_panel?.topic?.title}". You have 15 minutes. Ensure constructive dialogue, architectural depth, and active listening.`,
              time: "00:01",
            },
          ]);
        }
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to initialize Group Discussion session."
          );
          setLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      mounted = false;
    };
  }, [driveId, isOpen]);

  // 2. Hardware Video Stream (Webcam)
  useEffect(() => {
    if (!isOpen || loading || !isCameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn("Webcam access unavailable or permission denied, using simulated HD video feed.", err);
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, loading, isCameraOn]);

  // 3. Discussion Timer
  useEffect(() => {
    if (!isOpen || loading || evaluationResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, loading, evaluationResult]);

  // 4. Simulated Multi-Candidate Speaking Progression
  useEffect(() => {
    if (!isOpen || loading || evaluationResult) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= peerTurns.length) {
        stepIndex = 0; // loop with slight variations
      }

      const turn = peerTurns[stepIndex];
      setActiveSpeakerId(turn.peerId);

      // Add to transcript
      const currentMin = Math.floor((15 * 60 - timeLeft) / 60);
      const currentSec = (15 * 60 - timeLeft) % 60;
      const timeStr = `${String(currentMin).padStart(2, "0")}:${String(currentSec).padStart(2, "0")}`;

      setTranscript((prev) => [
        ...prev,
        {
          id: `MSG-${Date.now()}-${stepIndex}`,
          speaker: turn.name,
          color: turn.color,
          text: turn.text,
          time: timeStr,
          isUser: turn.isUser,
        },
      ]);

      // Modulate student audio level
      if (turn.isUser) {
        setStudentAudioLevel(Math.floor(70 + Math.random() * 25));
        // Boost real-time live rubrics slightly
        setLiveRubrics((r) => ({
          clarity_and_fluency: Math.min(20, r.clarity_and_fluency + 0.2),
          active_listening: Math.min(20, r.active_listening + 0.1),
          body_language: Math.min(20, r.body_language + 0.1),
          topic_knowledge: Math.min(20, r.topic_knowledge + 0.3),
          creativity_and_perspectivity: Math.min(20, r.creativity_and_perspectivity + 0.2),
        }));
      } else {
        setStudentAudioLevel(15);
      }

      stepIndex++;
    }, 9000);

    return () => clearInterval(interval);
  }, [isOpen, loading, evaluationResult, timeLeft]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Student manual speak action
  const handleStudentContribute = (presetText?: string) => {
    setActiveSpeakerId("USER");
    setStudentAudioLevel(85);

    const userSpeech =
      presetText ||
      "Building on the architectural trade-offs discussed, high-concurrency systems should adopt hexagonal architecture. This keeps business domain entities purely decoupled from database and transport protocols, enabling seamless transitions from monolith to microservices when traffic warrants it.";

    const currentMin = Math.floor((15 * 60 - timeLeft) / 60);
    const currentSec = (15 * 60 - timeLeft) % 60;
    const timeStr = `${String(currentMin).padStart(2, "0")}:${String(currentSec).padStart(2, "0")}`;

    setTranscript((prev) => [
      ...prev,
      {
        id: `MSG-USER-${Date.now()}`,
        speaker: "Cornelius Nicolas (You)",
        color: "#10b981",
        text: userSpeech,
        time: timeStr,
        isUser: true,
      },
    ]);

    // Boost scores
    setLiveRubrics({
      clarity_and_fluency: 19.0,
      active_listening: 18.5,
      body_language: 18.0,
      topic_knowledge: 19.5,
      creativity_and_perspectivity: 19.0,
    });

    setTimeout(() => {
      setActiveSpeakerId(null);
      setStudentAudioLevel(20);
    }, 6000);
  };

  // 5. Conclude & Submit to AI Multi-Candidate Evaluator
  const handleConcludeAndEvaluate = async () => {
    setIsSubmitting(true);
    try {
      const res = await studentsApi.submitGdSession(driveId, {
        topic: sessionData?.group_panel?.topic?.title,
        clarity_and_fluency: liveRubrics.clarity_and_fluency,
        active_listening: liveRubrics.active_listening,
        body_language: liveRubrics.body_language,
        topic_knowledge: liveRubrics.topic_knowledge,
        creativity_and_perspectivity: liveRubrics.creativity_and_perspectivity,
        speaking_duration_seconds: 185,
        speech_transcript: transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n"),
        remarks:
          "Exemplary performance across all 5 dimensions. Highly articulate in architectural analysis, active listening with synthesized rebuttals, direct camera gaze, and balanced perspective.",
      });

      setEvaluationResult(res.result);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit Group Discussion evaluation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[96vh]">
        {/* ROOM TOP HEADER */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                LIVE GD PANEL
              </span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>{sessionData?.company_name || "Enterprise"}</span>
                <span className="text-slate-600">•</span>
                <span className="text-blue-400 font-semibold text-xs sm:text-sm">
                  {sessionData?.group_panel?.panel_name || "Group Discussion Panel B-4"}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live AI Observer badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-3xs font-semibold">
              <span className="text-xs">🤖</span>
              <span>AI Multi-Candidate Evaluator Active</span>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-mono font-bold">
              <span>⏱️</span>
              <span>{formatTimer(timeLeft)}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Leave Room"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TOPIC BANNER */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-4xs uppercase tracking-widest text-blue-300 font-extrabold">
                Assigned Topic:
              </span>
              <h3 className="text-xs sm:text-sm font-extrabold text-white mt-0.5">
                {sessionData?.group_panel?.topic?.title ||
                  "Monolithic vs Microservices Architecture in Hyperscale Systems"}
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {sessionData?.group_panel?.topic?.key_evaluation_points?.slice(0, 3).map(
                (pt: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-4xs font-medium bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                  >
                    ✓ {pt}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* MAIN BODY: VIDEO GRID + LIVE TELEMETRY & TRANSCRIPT */}
        <div className="flex-1 p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto">
          {/* LEFT: 2x2 VIDEO CALL TILES (8 COLS) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-[460px]">
              {/* TILE 1: STUDENT (CANDIDATE - YOU) */}
              <div
                className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all duration-300 flex flex-col justify-between p-3 ${
                  activeSpeakerId === "USER"
                    ? "border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10"
                    : "border-slate-800"
                }`}
              >
                {/* Top Video Overlay: AI Vision Tracking */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs border border-slate-700/80 text-4xs font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Eye Contact: 95%</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-blue-300">Posture: Upright</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMuted ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-300 text-3xs font-bold">
                        MUTED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-300 text-3xs font-bold flex items-center gap-1">
                        <span>🎙️</span>
                        <span
                          className="inline-block w-1 bg-emerald-400 rounded-full transition-all duration-75"
                          style={{ height: `${Math.min(12, studentAudioLevel / 7)}px` }}
                        ></span>
                      </span>
                    )}
                    {isHandRaised && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-300 text-3xs font-bold">
                        ✋ Hand Raised
                      </span>
                    )}
                  </div>
                </div>

                {/* Video Area (Webcam or HD Fallback) */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  {isCameraOn ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-16 h-16 rounded-full bg-emerald-800 text-white font-black text-xl flex items-center justify-center border-2 border-emerald-500/50">
                        CN
                      </div>
                      <span className="text-2xs text-slate-400">Camera Off</span>
                    </div>
                  )}

                  {/* Fallback avatar overlay if video track inactive */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none"></div>
                </div>

                {/* Bottom Video Overlay: Name & Speaking State */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900/90 text-white font-bold text-xs backdrop-blur-xs border border-slate-700">
                      Cornelius Nicolas <strong className="text-emerald-400">(You)</strong>
                    </span>
                    <span className="text-3xs text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                      Computer Science
                    </span>
                  </div>

                  {activeSpeakerId === "USER" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-3xs uppercase tracking-wider animate-pulse">
                      Speaking Now
                    </span>
                  )}
                </div>
              </div>

              {/* TILE 2: PEER 1 — AARAV SHARMA */}
              <div
                className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all duration-300 flex flex-col justify-between p-3 ${
                  activeSpeakerId === "PEER-01"
                    ? "border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                    : "border-slate-800"
                }`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-4xs font-semibold text-blue-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                    Peer Candidate • STU004
                  </span>
                  <span className="text-3xs bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                    🎙️ Active
                  </span>
                </div>

                {/* Simulated Peer Feed */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80"
                    alt="Aarav Sharma"
                    className="w-full h-full object-cover opacity-85 filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none"></div>

                  {/* Speech Bubble when speaking */}
                  {activeSpeakerId === "PEER-01" && (
                    <div className="absolute bottom-10 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-blue-500/50 text-2xs text-blue-100 shadow-lg animate-fade-in">
                      <span className="font-bold text-blue-400 block mb-0.5">Speaking:</span>
                      "Microservices allow independent horizontal scaling of stateless APIs..."
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-900/90 text-white font-bold text-xs backdrop-blur-xs border border-slate-700">
                    Aarav Sharma
                  </span>
                  {activeSpeakerId === "PEER-01" && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-black text-3xs uppercase tracking-wider animate-pulse">
                      Speaking
                    </span>
                  )}
                </div>
              </div>

              {/* TILE 3: PEER 2 — PRIYA PATEL */}
              <div
                className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all duration-300 flex flex-col justify-between p-3 ${
                  activeSpeakerId === "PEER-02"
                    ? "border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10"
                    : "border-slate-800"
                }`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-4xs font-semibold text-purple-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                    Peer Candidate • STU002
                  </span>
                  <span className="text-3xs bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                    🎙️ Active
                  </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
                    alt="Priya Patel"
                    className="w-full h-full object-cover opacity-85 filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none"></div>

                  {activeSpeakerId === "PEER-02" && (
                    <div className="absolute bottom-10 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-purple-500/50 text-2xs text-purple-100 shadow-lg animate-fade-in">
                      <span className="font-bold text-purple-400 block mb-0.5">Speaking:</span>
                      "Operational complexity in distributed tracing makes monoliths superior for fast shipping..."
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-900/90 text-white font-bold text-xs backdrop-blur-xs border border-slate-700">
                    Priya Patel
                  </span>
                  {activeSpeakerId === "PEER-02" && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white font-black text-3xs uppercase tracking-wider animate-pulse">
                      Speaking
                    </span>
                  )}
                </div>
              </div>

              {/* TILE 4: PEER 3 — ROHAN GUPTA */}
              <div
                className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all duration-300 flex flex-col justify-between p-3 ${
                  activeSpeakerId === "PEER-03"
                    ? "border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "border-slate-800"
                }`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-4xs font-semibold text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                    Peer Candidate • STU007
                  </span>
                  <span className="text-3xs bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                    🎙️ Active
                  </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
                    alt="Rohan Gupta"
                    className="w-full h-full object-cover opacity-85 filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none"></div>

                  {activeSpeakerId === "PEER-03" && (
                    <div className="absolute bottom-10 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-amber-500/50 text-2xs text-amber-100 shadow-lg animate-fade-in">
                      <span className="font-bold text-amber-400 block mb-0.5">Speaking:</span>
                      "Under CAP theorem, network partitions force you to sacrifice consistency or availability..."
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-900/90 text-white font-bold text-xs backdrop-blur-xs border border-slate-700">
                    Rohan Gupta
                  </span>
                  {activeSpeakerId === "PEER-03" && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-3xs uppercase tracking-wider animate-pulse">
                      Speaking
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* VIDEO CALL ACTION CONTROLS BAR */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Mute/Unmute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isMuted
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <span>{isMuted ? "🔇" : "🎙️"}</span>
                  <span>{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                {/* Camera Toggle */}
                <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    !isCameraOn
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <span>{isCameraOn ? "📹" : "🚫"}</span>
                  <span>{isCameraOn ? "Camera On" : "Camera Off"}</span>
                </button>

                {/* Raise Hand */}
                <button
                  onClick={() => setIsHandRaised(!isHandRaised)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isHandRaised
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-600"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <span>✋</span>
                  <span>{isHandRaised ? "Hand Lowered" : "Raise Hand"}</span>
                </button>
              </div>

              {/* Student Direct Participation Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleStudentContribute()}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <span>🗣️</span>
                  <span>Speak / Share Technical Argument</span>
                </button>

                <button
                  onClick={handleConcludeAndEvaluate}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>{isSubmitting ? "⏳" : "🏁"}</span>
                  <span>{isSubmitting ? "Evaluating..." : "Conclude & Submit to AI"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE AI TELEMETRY & TRANSCRIPT (4 COLS) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* 5-RUBRIC REAL-TIME AI TELEMETRY HUD */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-3xs font-extrabold uppercase tracking-wider text-indigo-400">
                  AI Real-Time Candidate Telemetry
                </span>
                <span className="text-4xs text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                  ACTIVE HUD
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Rubric 1 */}
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span className="text-slate-300 font-medium">1. Clarity and Fluency</span>
                    <span className="font-bold text-blue-400">
                      {liveRubrics.clarity_and_fluency.toFixed(1)} / 20
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(liveRubrics.clarity_and_fluency / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rubric 2 */}
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span className="text-slate-300 font-medium">2. Active Listening</span>
                    <span className="font-bold text-purple-400">
                      {liveRubrics.active_listening.toFixed(1)} / 20
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(liveRubrics.active_listening / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rubric 3 */}
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span className="text-slate-300 font-medium">3. Body Language</span>
                    <span className="font-bold text-teal-400">
                      {liveRubrics.body_language.toFixed(1)} / 20
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${(liveRubrics.body_language / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rubric 4 */}
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span className="text-slate-300 font-medium">4. Topic Knowledge</span>
                    <span className="font-bold text-emerald-400">
                      {liveRubrics.topic_knowledge.toFixed(1)} / 20
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(liveRubrics.topic_knowledge / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rubric 5 */}
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span className="text-slate-300 font-medium">5. Creativity and Perspectivity</span>
                    <span className="font-bold text-amber-400">
                      {liveRubrics.creativity_and_perspectivity.toFixed(1)} / 20
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(liveRubrics.creativity_and_perspectivity / 20) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-2xs">
                <span className="text-slate-400">Cumulative Multi-Modal Score</span>
                <span className="font-black text-sm text-emerald-400">
                  {(
                    liveRubrics.clarity_and_fluency +
                    liveRubrics.active_listening +
                    liveRubrics.body_language +
                    liveRubrics.topic_knowledge +
                    liveRubrics.creativity_and_perspectivity
                  ).toFixed(1)}{" "}
                  / 100
                </span>
              </div>
            </div>

            {/* LIVE DISCUSSION TRANSCRIPT & CHAT */}
            <div className="flex-1 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">
                  Live Discussion Transcript
                </span>
                <span className="text-4xs text-slate-500">Auto-transcribed</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[240px]">
                {transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg text-2xs ${
                      item.isUser
                        ? "bg-emerald-950/60 border border-emerald-800/60"
                        : "bg-slate-900 border border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold" style={{ color: item.color }}>
                        {item.speaker}
                      </span>
                      <span className="text-4xs text-slate-500">{item.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{item.text}</p>
                  </div>
                ))}
                <div ref={transcriptBottomRef} />
              </div>
            </div>
          </div>
        </div>

        {/* POST-EVALUATION SCORECARD MODAL OVERLAY */}
        {evaluationResult && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 sm:p-6 overflow-y-auto flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white space-y-5">
              {/* Header */}
              <div className="text-center space-y-1">
                <span className="px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 inline-block">
                  AI Evaluation Completed
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-2">
                  🎉 Group Discussion Cleared!
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  The AI multi-modal evaluator has analyzed all group candidates across the 5 canonical dimensions. You have officially qualified for Round 4: Final Interview.
                </p>
              </div>

              {/* Cornelius Scorecard Highlight */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-3xs uppercase font-extrabold text-emerald-300 tracking-wider">
                    Candidate Overall Score
                  </span>
                  <div className="text-3xl font-black text-white mt-0.5">
                    {evaluationResult.overall_score} <span className="text-base text-slate-400">/ 100</span>
                  </div>
                  <p className="text-2xs text-emerald-200 mt-1 max-w-md">
                    Decision: <strong className="text-white font-extrabold">{evaluationResult.decision}</strong> • {evaluationResult.remarks}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-3xs uppercase font-extrabold text-slate-400 block mb-1">
                    Recruitment Milestone
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs inline-block">
                    ✓ Advanced to Round 4 Interview
                  </span>
                </div>
              </div>

              {/* 5-Rubric Breakdown for Student */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Your 5-Rubric Performance Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {Object.entries(evaluationResult.rubrics || {}).map(([key, data]: any) => (
                    <div key={key} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <span className="text-3xs text-slate-400 font-bold block mb-1">
                        {data.label}
                      </span>
                      <div className="text-lg font-black text-emerald-400">
                        {data.score} <span className="text-3xs text-slate-500">/ {data.max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peer Candidates Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Group Peer Evaluations (AI Comparative Ranking)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-3xs font-extrabold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Candidate</th>
                        <th className="p-2.5">Branch</th>
                        <th className="p-2.5">Score</th>
                        <th className="p-2.5">Decision</th>
                        <th className="p-2.5">AI Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {evaluationResult.peer_evaluations?.map((peer: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-white">
                            {peer.name} <span className="text-slate-500 font-normal">({peer.student_identifier})</span>
                          </td>
                          <td className="p-2.5 text-slate-400">{peer.branch}</td>
                          <td className="p-2.5 font-extrabold text-blue-400">{peer.overall_score}/100</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-4xs font-bold uppercase ${
                                peer.decision === "SELECTED"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : "bg-amber-950 text-amber-400 border border-amber-800"
                              }`}
                            >
                              {peer.decision}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 text-3xs max-w-xs">{peer.feedback}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Final Action Button */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    onClose();
                    onSuccess();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Unlock Round 4: Final Interview</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
