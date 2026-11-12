"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  assessmentsApi,
  AssessmentItem,
  CandidateSession,
  CandidateQuestion,
  AssessmentResult,
  RunCodeResult,
} from "@/services/assessmentsApi";
import { Button } from "@/components/ui/Button";

export const StudentAssessmentsView: React.FC = () => {
  const [viewMode, setViewMode] = useState<"LIST" | "EXAM" | "RESULT">("LIST");
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Exam State
  const [activeSession, setActiveSession] = useState<CandidateSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [codeLanguages, setCodeLanguages] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<string>("All changes saved");
  const [submitting, setSubmitting] = useState(false);
  const [runCodeLoading, setRunCodeLoading] = useState(false);
  const [runCodeOutput, setRunCodeOutput] = useState<RunCodeResult | null>(null);
  const [resultData, setResultData] = useState<AssessmentResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadAvailable = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await assessmentsApi.getAvailableAssessments();
      setAssessments(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load verified assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailable();
  }, []);

  // Countdown Timer & Deadline Monitor
  useEffect(() => {
    if (viewMode === "EXAM" && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode, secondsLeft]);

  // Examination Integrity Telemetry (Tab Switch / Window Blur)
  useEffect(() => {
    if (viewMode !== "EXAM" || !activeSession) return;

    const handleBlur = () => {
      assessmentsApi.sendTelemetry(activeSession.id, "WINDOW_BLUR", {
        timestamp: new Date().toISOString(),
      });
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        assessmentsApi.sendTelemetry(activeSession.id, "FULLSCREEN_EXIT", {
          timestamp: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [viewMode, activeSession]);

  const handleStartOrResume = async (assessmentId: number) => {
    setLoading(true);
    setError(null);
    try {
      const session = await assessmentsApi.startSession(assessmentId);
      setActiveSession(session);
      setSecondsLeft(session.seconds_remaining);

      // Populate saved answers
      const initialAnswers: Record<number, string> = {};
      const initialLangs: Record<number, string> = {};
      if (session.saved_answers) {
        Object.values(session.saved_answers).forEach((sa) => {
          initialAnswers[sa.question_id] = sa.answer_text;
          if (sa.code_language) initialLangs[sa.question_id] = sa.code_language;
        });
      }
      setAnswers(initialAnswers);
      setCodeLanguages(initialLangs);
      setCurrentQuestionIndex(0);
      setViewMode("EXAM");
    } catch (err: any) {
      setError(err?.message || "Could not start assessment session.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (questionId: number, val: string, lang?: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    setSaveStatus("Saving draft...");

    try {
      await assessmentsApi.saveAnswer(activeSession!.id, questionId, val, lang || codeLanguages[questionId]);
      setSaveStatus("All changes saved");
    } catch {
      setSaveStatus("Offline (will retry on submit)");
    }
  };

  const handleRunSampleCode = async (q: CandidateQuestion) => {
    const code = answers[q.id] || q.code_snippet || "";
    const lang = codeLanguages[q.id] || q.programming_language || "php";

    setRunCodeLoading(true);
    setRunCodeOutput(null);
    try {
      const res = await assessmentsApi.runSampleCode(activeSession!.id, q.id, code, lang);
      setRunCodeOutput(res);
    } catch (err: any) {
      alert(err?.message || "Failed to execute code in sandbox.");
    } finally {
      setRunCodeLoading(false);
    }
  };

  const handleSubmitTest = async () => {
    if (!confirm("Are you sure you want to finish and submit your examination?")) return;
    setSubmitting(true);
    try {
      await assessmentsApi.submitSession(activeSession!.id);
      const fullResult = await assessmentsApi.getResult(activeSession!.id);
      setResultData(fullResult);
      setViewMode("RESULT");
    } catch (err: any) {
      alert(err?.message || "Failed to submit examination.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (!activeSession) return;
    try {
      await assessmentsApi.submitSession(activeSession.id);
      const fullResult = await assessmentsApi.getResult(activeSession.id);
      setResultData(fullResult);
      setViewMode("RESULT");
    } catch {
      alert("Your examination time has expired and your answers have been recorded.");
      loadAvailable();
      setViewMode("LIST");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. VIEW MODE: AVAILABLE ASSESSMENTS */}
      {viewMode === "LIST" && (
        <div className="space-y-6">
          <div className="bg-white border border-campusblue-100 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Stage 3 &bull; Candidate Portal
                </span>
                <span className="text-2xs text-gray-400">&bull; Verified Examinations Only</span>
              </div>
              <h2 className="text-xl font-black text-campusblue-900 mt-1">
                Online Assessments &amp; Examinations
              </h2>
              <p className="text-xs text-campusblue-600 mt-0.5">
                Participate in secure, time-limited technical evaluations for campus placement drives. Only assessments{" "}
                <span className="font-bold underline text-campusblue-900">verified by the Placement Officer</span> are scheduled here.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={loadAvailable} disabled={loading}>
              Refresh Tests
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-semibold">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-xs text-campusblue-500 animate-pulse bg-white rounded-xl border border-campusblue-100">
              Loading verified placement examinations...
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-campusblue-100 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-campusblue-50 text-campusblue-600 flex items-center justify-center mx-auto text-xl">
                ⏳
              </div>
              <h3 className="text-base font-bold text-campusblue-900">No verified assessments currently scheduled</h3>
              <p className="text-xs text-campusblue-600 max-w-md mx-auto">
                Assessments designed by Administrators must first undergo verification by the Placement Officer (TPO)
                before they appear in your active schedule.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-campusblue-100 shadow-xs p-6 flex flex-col justify-between hover:border-campusblue-300 transition-all hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-2xs font-mono font-bold text-campusblue-700 bg-campusblue-50 px-2 py-0.5 rounded border border-campusblue-200">
                        {a.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ Verified by TPO
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-campusblue-900 mb-1">{a.title}</h3>

                    {a.company_name && (
                      <p className="text-xs font-semibold text-campusblue-700 mb-1">
                        Corporate Partner: <span className="text-campusblue-900">{a.company_name}</span>
                      </p>
                    )}

                    {a.description && (
                      <p className="text-xs text-campusblue-600 line-clamp-2 mb-3">{a.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-2xs text-campusblue-700 bg-campusblue-50/60 p-3 rounded-lg mb-4 border border-campusblue-100">
                      <div>
                        Duration: <span className="font-bold text-campusblue-900">{a.duration_minutes} mins</span>
                      </div>
                      <div>
                        Questions: <span className="font-bold text-campusblue-900">{a.questions_count ?? 20} MCQs</span>
                      </div>
                      <div>
                        Total Marks: <span className="font-bold text-campusblue-900">{a.total_marks} pts</span>
                      </div>
                      <div>
                        Pass Cutoff: <span className="font-bold text-campusblue-900">{a.pass_percentage}%</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-campusblue-100 flex items-center justify-between text-3xs text-campusblue-600">
                        <span>Pacing: ~{((a.duration_minutes) / (a.questions_count || 20)).toFixed(1)} mins/question</span>
                        <span>Attempts: {a.attempts_used} / {a.max_attempts}</span>
                      </div>
                      {a.last_score !== undefined && a.last_score !== null && (
                        <div className="col-span-2 pt-1 border-t border-campusblue-100">
                          Last Result:{" "}
                          <span className={`font-black ${a.last_passed ? "text-emerald-700" : "text-rose-700"}`}>
                            {a.last_score} pts ({a.last_passed ? "Passed" : "Failed"})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-2">
                    {a.last_session_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const fullResult = await assessmentsApi.getResult(a.last_session_id!);
                            setResultData(fullResult);
                            setViewMode("RESULT");
                          } catch (err: any) {
                            setError(err?.message || "Failed to load diagnostic result.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full text-xs font-bold text-campusblue-900 border-campusblue-300 hover:bg-campusblue-50"
                      >
                        📊 View Diagnostic &amp; Recovery Report
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartOrResume(a.id)}
                      disabled={!a.can_attempt}
                      className={`w-full font-bold text-xs ${
                        a.active_session_id
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : a.can_attempt
                          ? "bg-campusblue-900 hover:bg-campusblue-800 text-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {a.active_session_id
                        ? "Resume In-Progress Examination"
                        : a.can_attempt
                        ? "Start Assessment"
                        : "Attempts Exhausted"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. VIEW MODE: ACTIVE EXAMINATION ROOM */}
      {viewMode === "EXAM" && activeSession && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white border border-campusblue-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-20">
            <div>
              <span className="text-2xs font-bold text-campusblue-800 bg-campusblue-50 px-2 py-0.5 rounded uppercase border border-campusblue-200">
                Official Examination Session #{activeSession.id}
              </span>
              <h2 className="text-lg font-black text-campusblue-900 mt-1">{activeSession.assessment_title}</h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-2xs font-bold text-campusblue-500 uppercase tracking-wider">Time Remaining</div>
                <div
                  className={`text-2xl font-mono font-black ${
                    secondsLeft < 300 ? "text-rose-600 animate-pulse" : "text-campusblue-900"
                  }`}
                >
                  {formatTime(secondsLeft)}
                </div>
              </div>

              <div className="hidden sm:block text-2xs text-campusblue-600 border-l border-campusblue-200 pl-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{saveStatus}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitTest}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submitting ? "Submitting..." : "Submit Final Test"}
              </Button>
            </div>
          </div>

          {/* Question Layout: Question Palette + Question Body */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Question Content */}
            <div className="lg:col-span-3 space-y-6">
              {(() => {
                const q = activeSession.questions[currentQuestionIndex];
                if (!q) return null;

                return (
                  <div className="bg-white border border-campusblue-200 rounded-xl p-6 shadow-xs space-y-6">
                    {/* Question Header */}
                    <div className="flex items-center justify-between border-b border-campusblue-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-2xs font-bold bg-campusblue-100 text-campusblue-900 rounded">
                          Question {currentQuestionIndex + 1} of {activeSession.questions.length}
                        </span>
                        <span className="px-2 py-0.5 text-2xs font-semibold bg-blue-50 text-blue-700 rounded">
                          {q.type}
                        </span>
                        <span className="px-2 py-0.5 text-2xs font-semibold bg-gray-50 text-gray-600 rounded">
                          {q.difficulty}
                        </span>
                      </div>
                      <div className="text-2xs font-semibold text-campusblue-700">
                        Marks: <span className="text-campusblue-900 font-bold">+{q.marks}</span>
                        {q.negative_marks > 0 && (
                          <span className="text-rose-600 ml-2">(-{q.negative_marks} if wrong)</span>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="text-sm font-semibold text-campusblue-900 leading-relaxed whitespace-pre-wrap">
                      {q.question_text}
                    </div>

                    {/* TYPE 1: MCQ Options */}
                    {q.type === "MCQ" && q.options && (
                      <div className="space-y-3 pt-2">
                        {q.options.map((opt) => {
                          const isSelected = answers[q.id] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              className={`flex items-start p-3.5 border rounded-lg cursor-pointer transition ${
                                isSelected
                                  ? "border-campusblue-800 bg-campusblue-50/70 shadow-xs"
                                  : "border-campusblue-100 hover:bg-campusblue-50/30"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(q.id, opt.id)}
                                className="mt-1 h-4 w-4 text-campusblue-800 focus:ring-campusblue-800 border-campusblue-300"
                              />
                              <div className="ml-3 text-xs text-campusblue-900">
                                <span className="font-bold mr-2 text-campusblue-800">{opt.id}.</span>
                                {opt.text}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* TYPE 2: Descriptive / Subjective Answer */}
                    {q.type === "DESCRIPTIVE" && (
                      <div className="space-y-2 pt-2">
                        <label className="block text-2xs font-bold text-campusblue-800 uppercase">
                          Your Written Response:
                        </label>
                        <textarea
                          rows={8}
                          value={answers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Write your explanation or derivation clearly..."
                          className="w-full border border-campusblue-200 rounded-lg p-3 text-xs text-campusblue-900 focus:ring-1 focus:ring-campusblue-800 font-sans"
                        />
                      </div>
                    )}

                    {/* TYPE 3: Programming / Sandbox Code Question */}
                    {q.type === "PROGRAMMING" && (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-2xs font-bold text-campusblue-800 uppercase">
                            Candidate Code Solution:
                          </label>
                          <select
                            value={codeLanguages[q.id] || q.programming_language || "php"}
                            onChange={(e) => {
                              setCodeLanguages((prev) => ({ ...prev, [q.id]: e.target.value }));
                              handleAnswerChange(q.id, answers[q.id] || q.code_snippet || "", e.target.value);
                            }}
                            className="text-xs border border-campusblue-200 rounded-md px-2 py-1 bg-white font-mono"
                          >
                            <option value="php">PHP 8.2</option>
                            <option value="python">Python 3</option>
                            <option value="javascript">JavaScript (Node)</option>
                            <option value="cpp">C++ (GCC)</option>
                          </select>
                        </div>

                        <textarea
                          rows={12}
                          value={answers[q.id] !== undefined ? answers[q.id] : q.code_snippet || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value, codeLanguages[q.id])}
                          placeholder="Write your solution here. Input is passed via standard input (STDIN)..."
                          className="w-full border rounded-lg p-3.5 text-xs text-gray-100 font-mono bg-gray-950 focus:ring-1 focus:ring-campusblue-800"
                        />

                        {/* Sample Test Cases View */}
                        {q.sample_test_cases && q.sample_test_cases.length > 0 && (
                          <div className="bg-campusblue-50/50 border border-campusblue-200 rounded-lg p-3.5 space-y-2 text-2xs">
                            <div className="font-bold text-campusblue-800 uppercase">Visible Sample Test Cases:</div>
                            {q.sample_test_cases.map((tc, tcIdx) => (
                              <div key={tcIdx} className="grid grid-cols-2 gap-2 bg-white p-2 border rounded font-mono">
                                <div>
                                  Input: <span className="text-campusblue-900">{tc.input}</span>
                                </div>
                                <div>
                                  Expected: <span className="text-emerald-700 font-semibold">{tc.expected_output}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleRunSampleCode(q)}
                            disabled={runCodeLoading}
                            className="bg-gray-800 hover:bg-black text-white text-xs font-bold"
                          >
                            {runCodeLoading ? "Executing in Sandbox..." : "Run Sample Test Cases"}
                          </Button>
                        </div>

                        {/* Sandbox Execution Feedback */}
                        {runCodeOutput && (
                          <div className="bg-gray-950 text-gray-100 p-4 rounded-lg font-mono text-2xs space-y-2 border border-gray-800">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                              <span className="font-bold text-blue-400">
                                Sandbox Result: {runCodeOutput.result.status}
                              </span>
                              <span>
                                Passed {runCodeOutput.result.passed_test_cases} / {runCodeOutput.result.total_test_cases}{" "}
                                Samples
                              </span>
                            </div>
                            {runCodeOutput.result.test_case_results.map((tr) => (
                              <div key={tr.test_case_number} className="text-2xs">
                                <span className={tr.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                  Test Case #{tr.test_case_number}: {tr.passed ? "PASSED" : tr.status}
                                </span>
                                {!tr.passed && tr.actual_output && (
                                  <div className="text-gray-400 pl-4 mt-1">
                                    Actual Output: &quot;{tr.actual_output}&quot; | Expected: &quot;{tr.expected_output}&quot;
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between border-t border-campusblue-100 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setCurrentQuestionIndex((prev) => Math.min(activeSession.questions.length - 1, prev + 1))
                        }
                        disabled={currentQuestionIndex === activeSession.questions.length - 1}
                      >
                        Save &amp; Next
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right: Question Navigation Palette */}
            <div className="bg-white border border-campusblue-200 rounded-xl p-5 shadow-xs space-y-4 h-fit">
              <h4 className="text-2xs font-bold uppercase text-campusblue-800 tracking-wider">Question Jump Palette</h4>
              <div className="grid grid-cols-5 gap-2">
                {activeSession.questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id] && answers[q.id].trim().length > 0;
                  const isCurrent = idx === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 w-full rounded font-mono text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? "ring-2 ring-campusblue-800 bg-campusblue-900 text-white"
                          : isAnswered
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-campusblue-50 text-campusblue-700 hover:bg-campusblue-100"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-campusblue-100 pt-3 text-2xs text-campusblue-600 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-campusblue-50 border border-campusblue-200"></span>
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-campusblue-900 text-white"></span>
                  <span>Current Question</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. VIEW MODE: POST-SUBMISSION PERFORMANCE REPORT & REMEDIATION */}
      {viewMode === "RESULT" && resultData && (() => {
        const roadmap = resultData.improvement_roadmap || resultData.evaluation_summary?.improvement_roadmap;
        const categories = resultData.evaluation_summary?.categories || {};

        return (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Main Score Overview Card */}
            <div className="bg-white border border-campusblue-200 rounded-2xl p-8 shadow-sm space-y-6 text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  resultData.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {resultData.passed ? (
                  <span className="text-3xl font-black">✓</span>
                ) : (
                  <span className="text-3xl font-black">✕</span>
                )}
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    resultData.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {resultData.passed ? "Assessment Cleared" : "Cutoff Not Cleared"}
                </span>
                <h2 className="text-xl font-black text-campusblue-900 mt-2">{resultData.assessment_title}</h2>
                <p className="text-2xs text-campusblue-500 mt-1">Submitted at {resultData.submitted_at || "Recently"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-campusblue-50/60 p-4 rounded-xl text-left border border-campusblue-100">
                <div>
                  <div className="text-2xs text-campusblue-500 uppercase font-bold">Score Earned</div>
                  <div className="text-2xl font-black text-campusblue-900">
                    {resultData.total_score} / {resultData.total_possible}
                  </div>
                </div>
                <div>
                  <div className="text-2xs text-campusblue-500 uppercase font-bold">Passing Cutoff</div>
                  <div className="text-2xl font-black text-campusblue-900">{resultData.pass_percentage}%</div>
                </div>
              </div>

              {/* Competency Gap Visualizer */}
              {Object.keys(categories).length > 0 && (
                <div className="text-left space-y-3 border-t border-campusblue-100 pt-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-campusblue-800 tracking-wider">
                      Competency Sub-Scores & Gap Visualizer
                    </h4>
                    <span className="text-2xs text-campusblue-500 font-medium">Benchmark threshold: 60%</span>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(categories).map(([cat, score]) => {
                      const pct = score.possible > 0 ? Math.round((score.earned / score.possible) * 100) : 0;
                      const isWeak = pct < 60;
                      return (
                        <div key={cat} className="p-3 bg-campusblue-50/40 rounded-xl border border-campusblue-100">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-campusblue-900 flex items-center gap-2">
                              {cat}
                              {isWeak && (
                                <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                  Gap Identified (&lt;60%)
                                </span>
                              )}
                            </span>
                            <span className={`font-bold ${isWeak ? "text-rose-700" : "text-emerald-700"}`}>
                              {score.earned} / {score.possible} pts ({pct}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isWeak ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Improvement & Diagnostics Section (Rendered when !passed or when roadmap is available) */}
            {(!resultData.passed || roadmap) && (
              <div className="bg-white border border-campusblue-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-campusblue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-campusblue-900">
                        Diagnostic Assessment & Skill Recovery Roadmap
                      </h3>
                      <p className="text-xs text-campusblue-600 mt-0.5">
                        Targeted insights to turn identified test gaps into high-yield placement recovery areas.
                      </p>
                    </div>
                  </div>

                  {roadmap && (
                    <span
                      className={`px-3 py-1 rounded-full text-2xs font-extrabold self-start sm:self-auto ${
                        roadmap.can_reattempt
                          ? "bg-blue-100 text-blue-900 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {roadmap.can_reattempt
                        ? `Re-attempt Cooldown: ${roadmap.reattempt_cooldown_hours || 24}h`
                        : "Attempts Limit Reached"}
                    </span>
                  )}
                </div>

                {/* Critical Focus Areas & Missed Concept Tags */}
                {roadmap?.critical_focus_areas && roadmap.critical_focus_areas.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-campusblue-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Critical Category Focus Areas
                    </h4>

                    <div className="grid grid-cols-1 gap-4">
                      {roadmap.critical_focus_areas.map((area, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-campusblue-100 bg-campusblue-50/30 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-sm font-bold text-campusblue-900">{area.category}</span>
                            <span className="text-2xs font-extrabold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Sub-score: {area.earned_percentage}%
                            </span>
                          </div>

                          {/* Interactive Missed Concept Badges */}
                          {area.missed_concepts && area.missed_concepts.length > 0 && (
                            <div>
                              <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-500 block mb-1.5">
                                Missed Concepts Requiring Revision:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {area.missed_concepts.map((concept, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-white border border-campusblue-200 text-campusblue-800 shadow-2xs hover:border-campusblue-400 transition cursor-default"
                                    title={`Key gap identified: ${concept}`}
                                  >
                                    #{concept}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommended Action */}
                          {area.recommended_action && (
                            <div className="p-3 bg-white rounded-lg border border-campusblue-100 text-xs text-campusblue-800 flex items-start gap-2">
                              <span className="text-amber-600 font-bold mt-0.5">💡 Action:</span>
                              <span className="font-serif leading-relaxed">{area.recommended_action}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Sandbox Execution Diagnostics */}
                {roadmap?.code_diagnostics && roadmap.code_diagnostics.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-campusblue-100">
                    <h4 className="text-xs font-bold text-campusblue-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Programming Sandbox Execution Diagnostics
                    </h4>

                    <div className="space-y-3">
                      {roadmap.code_diagnostics.map((diag, dIdx) => {
                        const reasonLabels: Record<string, { label: string; style: string }> = {
                          TIMEOUT_TLE: {
                            label: "Time Limit Exceeded (TLE)",
                            style: "bg-amber-100 text-amber-900 border-amber-200",
                          },
                          SYNTAX_ERROR: {
                            label: "Compilation / Syntax Error",
                            style: "bg-rose-100 text-rose-900 border-rose-200",
                          },
                          EDGE_CASE_FAILURE: {
                            label: "Hidden Edge Case Failure",
                            style: "bg-orange-100 text-orange-900 border-orange-200",
                          },
                          LOGICAL_MISMATCH: {
                            label: "Logical Output Mismatch",
                            style: "bg-purple-100 text-purple-900 border-purple-200",
                          },
                        };

                        const meta = reasonLabels[diag.failure_reason] || {
                          label: diag.failure_reason,
                          style: "bg-slate-100 text-slate-800 border-slate-200",
                        };

                        return (
                          <div
                            key={dIdx}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-left"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <span className="text-xs font-bold text-slate-900">{diag.question_title}</span>
                              <span className={`px-2 py-0.5 rounded text-3xs font-extrabold border ${meta.style}`}>
                                {meta.label}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 font-serif leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                              {diag.guidance}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Recovery Action CTAs */}
                <div className="pt-4 border-t border-campusblue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/readiness"
                      className="px-4 py-2 rounded-xl bg-campusblue-900 text-white text-xs font-bold hover:bg-campusblue-800 transition shadow-xs flex items-center gap-1.5"
                    >
                      <span>Boost Readiness in Skill Gap Hub</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewMode("LIST");
                      loadAvailable();
                    }}
                  >
                    Return to Assessments Portal
                  </Button>
                </div>
              </div>
            )}

            {/* In case student passed and no roadmap was triggered */}
            {resultData.passed && !roadmap && (
              <div className="pt-4 text-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setViewMode("LIST");
                    loadAvailable();
                  }}
                >
                  Return to Assessments Portal
                </Button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
