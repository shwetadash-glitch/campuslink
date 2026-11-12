"use client";

import React, { useState, useEffect, useRef } from "react";
import { studentsApi, GdPanelConfigResponse } from "@/services/studentsApi";
import { GroupDiscussionSetupModal } from "./GroupDiscussionSetupModal";

interface GdSessionProps {
  driveId?: number;
  scenarioId?: number;
  scenarioTitle?: string;
  scenarioDescription?: string;
  panelData?: GdPanelConfigResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GroupDiscussionVideoRoomModal({
  driveId,
  scenarioId,
  scenarioTitle,
  scenarioDescription,
  panelData,
  isOpen,
  onClose,
  onSuccess,
}: GdSessionProps) {
  // Session data & lifecycle
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Video & audio states for Student (User)
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [studentAudioLevel, setStudentAudioLevel] = useState(45);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>("PEER-01");
  const [activeTurnText, setActiveTurnText] = useState<string>("");

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

  // Fallback peer turns if no server-provided dialogue turns
  const fallbackPeerTurns = [
    {
      peerId: "PEER-01",
      name: "Aarav Sharma",
      color: "#3b82f6",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      text: "From a scalability perspective, microservices allow us to scale stateless API gateways independently from stateful payment ledgers. If payment throughput surges, we don't scale the entire monolith.",
      duration: 7000,
    },
    {
      peerId: "PEER-02",
      name: "Priya Patel",
      color: "#8b5cf6",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
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
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
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

  // 1. Fetch / Initialize Session Data on Open
  useEffect(() => {
    if (!isOpen) return;

    // If pre-configured panel was passed in directly
    if (panelData) {
      applySessionConfig(panelData);
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        if (driveId) {
          const res = await studentsApi.getGdSession(driveId);
          if (mounted) {
            applySessionConfig(res.session);
            setLoading(false);
          }
        } else {
          // Communication coach scenario mode: configure panel
          const res = await studentsApi.configureGdPanel({
            mode: "RANDOM",
            scenario_id: scenarioId,
            topic_title: scenarioTitle,
          });
          if (mounted) {
            applySessionConfig(res);
            setLoading(false);
          }
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
  }, [driveId, scenarioId, panelData, isOpen]);

  const applySessionConfig = (data: any) => {
    setSessionData(data);
    const topicTitle =
      data?.group_panel?.topic?.title ||
      data?.topic?.title ||
      scenarioTitle ||
      "Group Discussion Scenario";
    const panelName =
      data?.group_panel?.panel_name ||
      data?.panel_name ||
      "Group Discussion Panel";

    // Initialize transcript with moderator greeting
    setTranscript([
      {
        id: "MOD-01",
        speaker: "AI Moderator",
        color: "#6366f1",
        text: `Welcome candidates to ${panelName}. Your assigned topic is: "${topicTitle}". You have 15 minutes. Ensure constructive dialogue, active listening, and collaborative synthesis.`,
        time: "00:01",
      },
    ]);
  };

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
        console.warn(
          "Webcam access unavailable or permission denied, using simulated HD video feed.",
          err
        );
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

  // Active dialogue turns
  const activeDialogueTurns =
    sessionData?.dialogue_turns && sessionData.dialogue_turns.length > 0
      ? sessionData.dialogue_turns
      : fallbackPeerTurns;

  // 4. Simulated Multi-Candidate Speaking Progression
  useEffect(() => {
    if (!isOpen || loading || evaluationResult) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= activeDialogueTurns.length) {
        stepIndex = 0; // loop progression
      }

      const turn = activeDialogueTurns[stepIndex];
      setActiveSpeakerId(turn.peerId);
      setActiveTurnText(turn.text);

      // Add to transcript
      const currentMin = Math.floor((15 * 60 - timeLeft) / 60);
      const currentSec = (15 * 60 - timeLeft) % 60;
      const timeStr = `${String(currentMin).padStart(2, "0")}:${String(
        currentSec
      ).padStart(2, "0")}`;

      setTranscript((prev) => [
        ...prev,
        {
          id: `MSG-${Date.now()}-${stepIndex}`,
          speaker: turn.name,
          color: turn.color || "#3b82f6",
          avatar: turn.avatar,
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
          creativity_and_perspectivity: Math.min(
            20,
            r.creativity_and_perspectivity + 0.2
          ),
        }));
      } else {
        setStudentAudioLevel(15);
      }

      stepIndex++;
    }, 9000);

    return () => clearInterval(interval);
  }, [isOpen, loading, evaluationResult, timeLeft, activeDialogueTurns]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Student manual speak action
  const handleStudentContribute = (presetText?: string) => {
    setActiveSpeakerId("USER");
    setStudentAudioLevel(85);

    const topicTitle =
      sessionData?.group_panel?.topic?.title ||
      sessionData?.topic?.title ||
      scenarioTitle ||
      "";

    let userSpeech = presetText;
    if (!userSpeech) {
      if (topicTitle.includes("MongoDB") || topicTitle.includes("Architectural")) {
        userSpeech =
          "While MongoDB offers schema flexibility, financial transaction ledgers require strict mathematical invariants and double-entry bookkeeping. A relational database with ACID isolation prevents balance corruption and guarantees auditability.";
      } else if (topicTitle.includes("CSS") || topicTitle.includes("Derailing")) {
        userSpeech =
          "Those UI design choices are valid points for the frontend polish phase. However, we only have 10 minutes remaining on our clock, and our primary deliverable is establishing the Disaster Recovery architecture. Let's refocus on the failover design first.";
      } else if (topicTitle.includes("Conflicting") || topicTitle.includes("SaaS")) {
        userSpeech =
          "Both arguments capture crucial trade-offs: data governance on one side, and urgent time-to-market on the other. A hybrid strategy achieves consensus: purchase the SaaS solution for immediate operational velocity, while designing clean API adapter layers.";
      } else {
        userSpeech =
          "Building on the architectural trade-offs discussed, high-concurrency systems should adopt hexagonal architecture. This keeps business domain entities purely decoupled from transport protocols, enabling seamless transitions from monolith to microservices when traffic warrants it.";
      }
    }

    const currentMin = Math.floor((15 * 60 - timeLeft) / 60);
    const currentSec = (15 * 60 - timeLeft) % 60;
    const timeStr = `${String(currentMin).padStart(2, "0")}:${String(
      currentSec
    ).padStart(2, "0")}`;

    const userName = sessionData?.candidate?.name
      ? `${sessionData.candidate.name} (You)`
      : "Cornelius Nicolas (You)";

    setTranscript((prev) => [
      ...prev,
      {
        id: `MSG-USER-${Date.now()}`,
        speaker: userName,
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
    const topicTitle =
      sessionData?.group_panel?.topic?.title ||
      sessionData?.topic?.title ||
      scenarioTitle ||
      "Technical Group Discussion";

    const transcriptPayload = transcript
      .map((t) => `${t.speaker}: ${t.text}`)
      .join("\n");

    try {
      if (driveId) {
        const res = await studentsApi.submitGdSession(driveId, {
          topic: topicTitle,
          clarity_and_fluency: liveRubrics.clarity_and_fluency,
          active_listening: liveRubrics.active_listening,
          body_language: liveRubrics.body_language,
          topic_knowledge: liveRubrics.topic_knowledge,
          creativity_and_perspectivity: liveRubrics.creativity_and_perspectivity,
          speaking_duration_seconds: 185,
          speech_transcript: transcriptPayload,
          remarks:
            "Exemplary performance across all 5 dimensions. Highly articulate in domain analysis, active listening with synthesized rebuttals, direct camera gaze, and balanced perspective.",
        });
        setEvaluationResult(res.result);
      } else {
        const res = await studentsApi.submitGdEvaluation({
          scenario_id: scenarioId,
          topic: topicTitle,
          clarity_and_fluency: liveRubrics.clarity_and_fluency,
          active_listening: liveRubrics.active_listening,
          body_language: liveRubrics.body_language,
          topic_knowledge: liveRubrics.topic_knowledge,
          creativity_and_perspectivity: liveRubrics.creativity_and_perspectivity,
          speaking_duration_seconds: 185,
          speech_transcript: transcriptPayload,
          remarks:
            "Exemplary performance in peer discussion. Strong constructive synthesis and diplomatic leadership.",
        });
        setEvaluationResult(res.result);
      }
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

  const handlePanelReconfigured = (newConfig: GdPanelConfigResponse) => {
    applySessionConfig(newConfig);
    setTranscript((prev) => [
      ...prev,
      {
        id: `SYS-${Date.now()}`,
        speaker: "AI Moderator",
        color: "#6366f1",
        text: `Panel reconfigured: ${
          newConfig.mode === "FRIENDS"
            ? `Friends panel assembled (${newConfig.peers
                .map((p) => p.name)
                .join(", ")})`
            : "Matched with fresh random student cohort."
        }`,
        time: "00:02",
      },
    ]);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  // Active peers roster
  const peersList = sessionData?.peers || [
    {
      id: "PEER-01",
      student_identifier: "STU004",
      name: "Aarav Sharma",
      branch: "Computer Science",
      avatar_url:
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
      color: "#3b82f6",
      mode_badge: "Cohort Peer",
    },
    {
      id: "PEER-02",
      student_identifier: "STU002",
      name: "Priya Patel",
      branch: "Information Technology",
      avatar_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      color: "#8b5cf6",
      mode_badge: "Cohort Peer",
    },
    {
      id: "PEER-03",
      student_identifier: "STU007",
      name: "Rohan Gupta",
      branch: "Electronics & Communication",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      color: "#f59e0b",
      mode_badge: "Cohort Peer",
    },
  ];

  const currentTopicTitle =
    sessionData?.group_panel?.topic?.title ||
    sessionData?.topic?.title ||
    scenarioTitle ||
    "Monolithic vs Microservices Architecture in Hyperscale Systems";

  const panelMode = sessionData?.mode || (sessionData?.group_panel ? "DRIVE" : "RANDOM");

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-7xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[96vh]">
          {/* ROOM TOP HEADER */}
          <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="text-3xs font-extrabold uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                  LIVE GD ROOM
                </span>
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                  <span>{sessionData?.company_name || "CampusLink GD"}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-blue-400 font-semibold text-xs sm:text-sm">
                    {sessionData?.group_panel?.panel_name ||
                      sessionData?.panel_name ||
                      "Group Discussion Panel"}
                  </span>
                </h2>
              </div>

              {/* Panel Mode Badge */}
              <div className="hidden md:flex items-center gap-1.5">
                {panelMode === "FRIENDS" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 text-3xs font-extrabold flex items-center gap-1">
                    <span>👥</span>
                    <span>Friends Panel</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-3xs font-extrabold flex items-center gap-1">
                    <span>🎲</span>
                    <span>Random Cohort Panel</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Change Panel / Add Friends trigger button */}
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-3xs sm:text-2xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
                title="Change panel members: Add friends or randomize"
              >
                <span>👥</span>
                <span>Change Panel</span>
              </button>

              {/* Live AI Observer badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-3xs font-semibold">
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
              <div className="min-w-0">
                <span className="text-4xs uppercase tracking-widest text-blue-300 font-extrabold block">
                  Assigned Discussion Topic:
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                  {currentTopicTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-3xs text-slate-400">
                  Candidates: <strong>4</strong> (You + 3 Peers)
                </span>
              </div>
            </div>
          </div>

          {/* MAIN BODY: 2x2 VIDEO GRID + LIVE TELEMETRY & TRANSCRIPT */}
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
                  {/* Top Overlay: AI Vision Tracking */}
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
                            style={{
                              height: `${Math.min(12, studentAudioLevel / 7)}px`,
                            }}
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

                  {/* Video Area */}
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
                          YOU
                        </div>
                        <span className="text-2xs text-slate-400">Camera Off</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none"></div>

                    {/* Speech Bubble when user speaking */}
                    {activeSpeakerId === "USER" && (
                      <div className="absolute bottom-10 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-emerald-500/50 text-2xs text-emerald-100 shadow-lg animate-fade-in">
                        <span className="font-bold text-emerald-400 block mb-0.5">
                          You (Speaking):
                        </span>
                        <p className="line-clamp-2">
                          {activeTurnText ||
                            "Building on the architectural trade-offs discussed..."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Video Overlay: Name & Speaking State */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900/90 text-white font-bold text-xs backdrop-blur-xs border border-slate-700">
                        {sessionData?.candidate?.name || "Cornelius Nicolas"}{" "}
                        <strong className="text-emerald-400">(You)</strong>
                      </span>
                      <span className="text-3xs text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                        {sessionData?.candidate?.branch || "Computer Science"}
                      </span>
                    </div>

                    {activeSpeakerId === "USER" && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-3xs uppercase tracking-wider animate-pulse">
                        Speaking Now
                      </span>
                    )}
                  </div>
                </div>

                {/* TILES 2, 3, 4: DYNAMIC PEERS (FRIENDS OR RANDOM STUDENTS) */}
                {peersList.slice(0, 3).map((peer: any, idx: number) => {
                  const peerId = `PEER-0${idx + 1}`;
                  const isSpeaking = activeSpeakerId === peerId;
                  const modeBadge =
                    peer.mode_badge ||
                    (panelMode === "FRIENDS" ? "Friend / Added Peer" : "Random Match");

                  return (
                    <div
                      key={peer.id || peer.student_identifier || idx}
                      className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all duration-300 flex flex-col justify-between p-3 ${
                        isSpeaking
                          ? "border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                          : "border-slate-800"
                      }`}
                    >
                      {/* Top Overlay: Peer Info & Badge */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span
                          className={`text-4xs font-bold px-2 py-0.5 rounded border ${
                            modeBadge.includes("Friend")
                              ? "bg-indigo-950/90 text-indigo-300 border-indigo-700/80"
                              : "bg-emerald-950/90 text-emerald-300 border-emerald-700/80"
                          }`}
                        >
                          {modeBadge} • {peer.student_identifier || `STU00${idx + 2}`}
                        </span>
                        <span className="text-3xs bg-slate-900/80 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                          🎙️ Active
                        </span>
                      </div>

                      {/* Peer Video Image */}
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <img
                          src={peer.avatar_url}
                          alt={peer.name}
                          className="w-full h-full object-cover opacity-85 filter brightness-95"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 pointer-events-none"></div>

                        {/* Speech Bubble when speaking */}
                        {isSpeaking && (
                          <div className="absolute bottom-10 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-blue-500/50 text-2xs text-blue-100 shadow-lg animate-fade-in">
                            <span className="font-bold text-blue-400 block mb-0.5">
                              {peer.name} (Speaking):
                            </span>
                            <p className="line-clamp-2">
                              "{activeTurnText || peer.perspective || "Discussing..."}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Overlay: Peer Name & Speaking Indicator */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-slate-900/90 text-white font-bold text-xs backdrop-blur-xs border border-slate-700 truncate">
                            {peer.name}
                          </span>
                          <span className="text-4xs text-slate-400 bg-slate-900/80 px-1 py-0.5 rounded truncate">
                            {peer.branch}
                          </span>
                        </div>

                        {isSpeaking && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-black text-3xs uppercase tracking-wider animate-pulse shrink-0">
                            Speaking
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                        style={{
                          width: `${(liveRubrics.clarity_and_fluency / 20) * 100}%`,
                        }}
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
                        style={{
                          width: `${(liveRubrics.active_listening / 20) * 100}%`,
                        }}
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
                        style={{
                          width: `${(liveRubrics.body_language / 20) * 100}%`,
                        }}
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
                        style={{
                          width: `${(liveRubrics.topic_knowledge / 20) * 100}%`,
                        }}
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
                    AI Multi-Candidate Evaluation Completed
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black mt-2">
                    🎉 Group Discussion Cleared!
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto">
                    The AI multi-modal evaluator has analyzed all group candidates across the 5 canonical dimensions.
                  </p>
                </div>

                {/* Scorecard Highlight */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-3xs uppercase font-extrabold text-emerald-300 tracking-wider">
                      Candidate Overall Score
                    </span>
                    <div className="text-3xl font-black text-white mt-0.5">
                      {evaluationResult.overall_score}{" "}
                      <span className="text-base text-slate-400">/ 100</span>
                      {evaluationResult.grade_tier && (
                        <span className="ml-3 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                          Grade {evaluationResult.grade_tier} ({evaluationResult.grade_label})
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-emerald-200 mt-1 max-w-md">
                      Decision: <strong className="text-white font-extrabold">{evaluationResult.decision}</strong> • {evaluationResult.remarks}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-3xs uppercase font-extrabold text-slate-400 block mb-1">
                      Status
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs inline-block">
                      {driveId ? "✓ Advanced to Round 4 Interview" : "✓ Completed & Recorded"}
                    </span>
                  </div>
                </div>

                {/* 5-Rubric Breakdown for Student */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Your 5-Rubric Performance Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {evaluationResult.rubrics
                      ? Object.entries(evaluationResult.rubrics).map(([key, data]: any) => (
                          <div
                            key={key}
                            className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center"
                          >
                            <span className="text-3xs text-slate-400 font-bold block mb-1">
                              {data.label || key}
                            </span>
                            <div className="text-lg font-black text-emerald-400">
                              {data.score} <span className="text-3xs text-slate-500">/ {data.max || 20}</span>
                            </div>
                          </div>
                        ))
                      : evaluationResult.scores
                      ? Object.entries(evaluationResult.scores).map(([key, score]: any) => (
                          <div
                            key={key}
                            className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center"
                          >
                            <span className="text-3xs text-slate-400 font-bold block mb-1 capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <div className="text-lg font-black text-emerald-400">
                              {score} <span className="text-3xs text-slate-500">/ 20</span>
                            </div>
                          </div>
                        ))
                      : null}
                  </div>
                </div>

                {/* Strengths & Improvements */}
                {evaluationResult.strengths && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <h5 className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                        <span>✓</span>
                        <span>Key Strengths</span>
                      </h5>
                      <ul className="space-y-1 text-slate-300">
                        {evaluationResult.strengths.map((str: string, i: number) => (
                          <li key={i}>• {str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <h5 className="font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                        <span>💡</span>
                        <span>Actionable Feedback</span>
                      </h5>
                      <ul className="space-y-1 text-slate-300">
                        {(evaluationResult.areas_to_improve || [
                          "Synthesize quieter peer opinions during conclusion",
                        ]).map((area: string, i: number) => (
                          <li key={i}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Final Action Button */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      onClose();
                      if (onSuccess) onSuccess();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>
                      {driveId
                        ? "Continue Placement Journey"
                        : "Return to Coaching Hub"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* IN-ROOM PANEL SWITCHER MODAL */}
      <GroupDiscussionSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        scenarioId={scenarioId}
        driveId={driveId}
        scenarioTitle={currentTopicTitle}
        onPanelReady={handlePanelReconfigured}
      />
    </>
  );
}
