'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
    aiInterviewApi,
    AiInterviewListItem,
    CandidateInterviewSession,
    InterviewMessage,
} from '@/services/aiInterviewApi';

export default function AiInterviewPage() {
    const [viewMode, setViewMode] = useState<'LOBBY' | 'INTERVIEW' | 'REPORT'>('LOBBY');
    const [interviews, setInterviews] = useState<AiInterviewListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Active Session State
    const [session, setSession] = useState<CandidateInterviewSession | null>(null);
    const [answerInput, setAnswerInput] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [statusBanner, setStatusBanner] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const loadInterviews = async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await aiInterviewApi.listStudentInterviews();
            setInterviews(list);
        } catch (err: any) {
            setError(err?.message || err?.response?.data?.message || 'Failed to load available AI interviews.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInterviews();
    }, []);

    // Scroll to bottom of chat whenever messages change
    useEffect(() => {
        if (viewMode === 'INTERVIEW') {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [session?.messages, viewMode]);

    // Authoritative countdown timer
    useEffect(() => {
        if (viewMode === 'INTERVIEW' && session && session.status === 'IN_PROGRESS') {
            setSecondsLeft(session.seconds_remaining || 0);

            if (timerRef.current) clearInterval(timerRef.current);

            timerRef.current = setInterval(() => {
                setSecondsLeft((prev) => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        handleDeadlineExpired();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [viewMode, session?.id, session?.status]);

    const handleDeadlineExpired = async () => {
        setStatusBanner('The scheduled interview duration has expired. Processing your provisional evaluation...');
        if (!session) return;
        try {
            const updated = await aiInterviewApi.showCandidateSession(session.id);
            setSession(updated);
            if (updated.status === 'COMPLETED' || updated.status === 'EVALUATED') {
                setViewMode('REPORT');
            }
        } catch (err) {
            console.error('Failed to sync expired session', err);
        }
    };

    const handleStartInterview = async (interviewId: number) => {
        setLoading(true);
        setError(null);
        try {
            const active = await aiInterviewApi.startCandidateSession(interviewId);
            setSession(active);
            setAnswerInput('');
            setStatusBanner(null);

            if (active.status === 'COMPLETED' || active.status === 'EVALUATED') {
                setViewMode('REPORT');
            } else {
                setViewMode('INTERVIEW');
            }
        } catch (err: any) {
            setError(err?.message || err?.response?.data?.message || 'Unable to initiate interview session.');
        } finally {
            setLoading(false);
        }
    };

    const handleResumeOrViewReport = async (sessionId: number) => {
        setLoading(true);
        setError(null);
        try {
            const current = await aiInterviewApi.showCandidateSession(sessionId);
            setSession(current);
            if (current.status === 'COMPLETED' || current.status === 'EVALUATED') {
                setViewMode('REPORT');
            } else {
                setViewMode('INTERVIEW');
            }
        } catch (err: any) {
            setError(err?.message || err?.response?.data?.message || 'Failed to retrieve interview session.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendAnswer = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!answerInput.trim() || isSubmitting || !session) return;

        const candidateText = answerInput.trim();
        setIsSubmitting(true);
        setError(null);

        // Optimistically show message
        const optimisticMsg: InterviewMessage = {
            id: Date.now(),
            sender: 'CANDIDATE',
            message_type: 'ANSWER',
            content: candidateText,
            is_follow_up: false,
        };

        setSession((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                messages: [...prev.messages, optimisticMsg],
            };
        });

        setAnswerInput('');

        try {
            const res = await aiInterviewApi.submitCandidateAnswer(session.id, candidateText);
            setSession(res.session);

            if (res.type === 'FOLLOW_UP') {
                setStatusBanner('AI Interviewer probed for edge cases / trade-offs.');
            } else if (res.type === 'NEXT_QUESTION') {
                setStatusBanner('Proceeding to next interview question.');
            } else if (res.type === 'COMPLETED') {
                setViewMode('REPORT');
            }
        } catch (err: any) {
            setError(err?.message || err?.response?.data?.message || 'Failed to submit answer.');
            // Re-sync session state
            if (session) {
                const refreshed = await aiInterviewApi.showCandidateSession(session.id);
                setSession(refreshed);
                if (refreshed.status === 'COMPLETED' || refreshed.status === 'EVALUATED') {
                    setViewMode('REPORT');
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTimer = (totalSecs: number) => {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AppLayout allowedRoles={['STUDENT']}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </span>
                            AI Structured Technical & Behavioral Interview
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Simulated real-time interview evaluating conceptual depth, edge cases, system design, and STAR methodology.
                        </p>
                    </div>

                    {viewMode !== 'LOBBY' && (
                        <button
                            onClick={() => {
                                setViewMode('LOBBY');
                                loadInterviews();
                            }}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
                        >
                            Return to Interview Lobby
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* =========================================================================
                 *  VIEW 1: INTERVIEW LOBBY
                 * ========================================================================= */}
                {viewMode === 'LOBBY' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
                            <div className="max-w-2xl">
                                <span className="inline-block px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                                    Placement Drive Round
                                </span>
                                <h2 className="text-xl font-bold">Standardized Multi-Turn AI Assessment</h2>
                                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                                    Each candidate faces structured questions tailored to specific job profiles.
                                    The AI interviewer actively listens to your architecture decisions and asks dynamic follow-up questions
                                    probing for failure modes and trade-offs.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-500 font-medium">Loading interview schedules...</div>
                        ) : interviews.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
                                <p className="font-medium">No published AI interviews currently assigned to your profile.</p>
                                <p className="text-xs text-slate-400 mt-1">Check upcoming placement drive schedules with your placement officer.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {interviews.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                                    {item.interview_type}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    item.difficulty === 'HARD' ? 'bg-red-50 text-red-700' :
                                                    item.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-green-50 text-green-700'
                                                }`}>
                                                    {item.difficulty}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                                            <p className="text-sm font-medium text-indigo-600 mt-0.5">Role: {item.target_role}</p>

                                            {item.drive_title && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Drive: <span className="font-semibold text-slate-700">{item.drive_title}</span>
                                                </p>
                                            )}

                                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                                {item.description || 'Structured technical and behavioral assessment.'}
                                            </p>

                                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {item.duration_minutes} Mins
                                                </span>
                                                <span>Pass: {item.pass_percentage}%</span>
                                                <span>Attempts: {item.attempts_used} / 1</span>
                                            </div>

                                            {item.last_score !== undefined && item.last_score !== null && (
                                                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                                                    <span className="text-slate-600">Previous Attempt Score:</span>
                                                    <span className={`font-bold ${item.last_passed ? 'text-green-700' : 'text-red-600'}`}>
                                                        {item.last_score}% {item.last_passed ? '(Qualified)' : '(Did not qualify)'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                            {item.active_session_id ? (
                                                <button
                                                    onClick={() => handleResumeOrViewReport(item.active_session_id!)}
                                                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                                                >
                                                    Resume Active Session
                                                </button>
                                            ) : item.last_session_id ? (
                                                <button
                                                    onClick={() => handleResumeOrViewReport(item.last_session_id!)}
                                                    className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                                                >
                                                    <span>View Evaluation &amp; Growth Plan</span>
                                                    <span>→</span>
                                                </button>
                                            ) : item.can_attempt ? (
                                                <button
                                                    onClick={() => handleStartInterview(item.id)}
                                                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                                                >
                                                    Start Interview
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">Interview Ineligible</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* =========================================================================
                 *  VIEW 2: ACTIVE MULTI-STAGE CONVERSATIONAL INTERVIEW
                 * ========================================================================= */}
                {viewMode === 'INTERVIEW' && session && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[750px]">
                        {/* Session Top Bar */}
                        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500 font-bold tracking-wide">
                                        STAGE: {session.current_stage}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-200">
                                        {session.interview_title}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-400 mt-0.5 block">
                                    Candidate Role: {session.target_role} • Attempt #{session.attempt_number}
                                </span>
                            </div>

                            {/* Authoritative Timer */}
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm flex items-center gap-2 ${
                                    secondsLeft < 300 ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-800 text-indigo-300'
                                }`}>
                                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{formatTimer(secondsLeft)}</span>
                                </div>
                            </div>
                        </div>

                        {statusBanner && (
                            <div className="px-4 py-2 bg-indigo-50 text-indigo-800 text-xs font-medium border-b border-indigo-100 flex items-center justify-between">
                                <span>{statusBanner}</span>
                                <button onClick={() => setStatusBanner(null)} className="text-indigo-400 hover:text-indigo-600 font-bold">×</button>
                            </div>
                        )}

                        {/* Transcript Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {session.messages.map((msg, index) => {
                                const isCandidate = msg.sender === 'CANDIDATE';
                                const isFollowUp = msg.message_type === 'FOLLOW_UP';

                                return (
                                    <div
                                        key={msg.id || index}
                                        className={`flex flex-col ${isCandidate ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <span className="text-[11px] font-semibold text-slate-500">
                                                {isCandidate ? 'You (Candidate)' : isFollowUp ? 'AI Interviewer (Follow-up Probe)' : 'AI Interviewer'}
                                            </span>
                                            {isFollowUp && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold uppercase">
                                                    Probing Depth
                                                </span>
                                            )}
                                        </div>

                                        <div
                                            className={`max-w-2xl px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                isCandidate
                                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                                    : isFollowUp
                                                    ? 'bg-amber-50/90 border border-amber-200 text-slate-800 rounded-tl-none font-medium'
                                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                );
                            })}

                            {isSubmitting && (
                                <div className="flex items-start">
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2 text-slate-500 text-xs">
                                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                                        <span>AI Interviewer is analyzing your response and formulating technical follow-up...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200">
                            <form onSubmit={handleSendAnswer} className="space-y-3">
                                <div>
                                    <textarea
                                        value={answerInput}
                                        onChange={(e) => setAnswerInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                handleSendAnswer();
                                            }
                                        }}
                                        disabled={isSubmitting || secondsLeft <= 0}
                                        rows={3}
                                        placeholder={
                                            session.current_stage === 'BEHAVIORAL'
                                                ? 'Formulate your answer using the STAR methodology (Situation, Task, Action, Result)... (Ctrl + Enter to send)'
                                                : session.current_stage === 'SYSTEM_DESIGN'
                                                ? 'Describe your architectural components, database strategy, trade-offs, and failure recovery... (Ctrl + Enter to send)'
                                                : 'State your approach, time/space complexity trade-offs, and edge cases considered... (Ctrl + Enter to send)'
                                        }
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-slate-900 disabled:bg-slate-100"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">
                                        {answerInput.trim().split(/\s+/).filter(Boolean).length} words • Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[11px] font-semibold text-slate-600">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[11px] font-semibold text-slate-600">Enter</kbd> to submit
                                    </span>

                                    <button
                                        type="submit"
                                        disabled={!answerInput.trim() || isSubmitting || secondsLeft <= 0}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                </svg>
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Submit Answer</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                 *  VIEW 3: POST-INTERVIEW PROVISIONAL EVALUATION REPORT
                 * ========================================================================= */}
                {viewMode === 'REPORT' && session && session.evaluation && (
                    <div className="space-y-6">
                        {/* Provisional Guard Notice Banner */}
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                            <span className="p-2 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            <div>
                                <h3 className="font-bold text-amber-900 text-sm">Provisional AI Placement Evaluation</h3>
                                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                                    This evaluation and score were generated automatically based on standard interview rubrics and candidate answer transcripts.
                                    All results are provisional and will be verified by the campus placement committee before final shortlisting decisions are released.
                                </p>
                            </div>
                        </div>

                        {/* Overall Result Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                                <div>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Interview Outcome</span>
                                    <h2 className="text-xl font-bold text-slate-900 mt-1">{session.interview_title}</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Role: {session.target_role}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-3xl font-extrabold text-slate-900">
                                            {session.evaluation.total_score}%
                                        </div>
                                        <span className={`text-xs font-bold ${session.evaluation.passed ? 'text-green-600' : 'text-red-600'}`}>
                                            {session.evaluation.passed ? 'Benchmark Met (Qualified)' : 'Benchmark Not Met'}
                                        </span>
                                    </div>

                                    {session.evaluation.recommendation && (
                                        <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                                            {session.evaluation.recommendation.replace('_', ' ')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dimension Score Breakdown */}
                            <div className="mt-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                                    Multi-Dimensional Rubric Performance
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {Object.entries(session.evaluation.dimension_scores || {}).map(([dimKey, score]) => {
                                        const cleanName = dimKey.replace(/_/g, ' ').toUpperCase();
                                        return (
                                            <div key={dimKey} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                                                    <span>{cleanName}</span>
                                                    <span className="text-slate-900 font-bold">{score}%</span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${
                                                            (score as number) >= 75 ? 'bg-green-500' :
                                                            (score as number) >= 60 ? 'bg-indigo-500' :
                                                            'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, Math.max(0, score as number))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Strengths & Weaknesses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                                <div>
                                    <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Candidate Strengths
                                    </h4>
                                    <ul className="space-y-2">
                                        {(session.evaluation.strengths || []).map((s, idx) => (
                                            <li key={idx} className="text-xs text-slate-700 bg-green-50/60 p-2.5 rounded-lg border border-green-100">
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                                        </svg>
                                        Development Areas
                                    </h4>
                                    <ul className="space-y-2">
                                        {(session.evaluation.weaknesses || []).map((w, idx) => (
                                            <li key={idx} className="text-xs text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                                                {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Quote Evidence */}
                            {session.evaluation.quote_evidence && session.evaluation.quote_evidence.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                        Cited Candidate Transcripts & Evidence
                                    </h4>
                                    <div className="space-y-2">
                                        {session.evaluation.quote_evidence.map((quote, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 border-l-4 border-indigo-500 rounded-r-lg text-xs italic text-slate-700">
                                                "{quote}"
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actionable Growth Plan Card */}
                        {session.evaluation.actionable_growth_plan && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-base">
                                                Actionable Growth Plan & STAR Refinement
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Prescriptive remediation steps, rubric target goals, and exemplary STAR reframings.
                                            </p>
                                        </div>
                                    </div>

                                    {session.evaluation.actionable_growth_plan.priority_level && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xs text-slate-500 uppercase font-bold">Priority:</span>
                                            <span
                                                className={`px-3 py-1 rounded-full text-2xs font-extrabold uppercase tracking-wider ${
                                                    session.evaluation.actionable_growth_plan.priority_level === 'HIGH'
                                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                        : session.evaluation.actionable_growth_plan.priority_level === 'MEDIUM'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                }`}
                                            >
                                                {session.evaluation.actionable_growth_plan.priority_level} PRIORITY
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Target Rubric Goals */}
                                {session.evaluation.actionable_growth_plan.rubric_dimension_targets &&
                                    session.evaluation.actionable_growth_plan.rubric_dimension_targets.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                                Target Rubric Remediation Goals
                                            </h4>

                                            <div className="grid grid-cols-1 gap-4">
                                                {session.evaluation.actionable_growth_plan.rubric_dimension_targets.map(
                                                    (target, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3 text-left"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                                                                <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
                                                                    {target.dimension.replace(/_/g, ' ')}
                                                                </span>

                                                                <div className="flex items-center gap-2 text-2xs font-bold">
                                                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                                                        Current: {target.current_score}%
                                                                    </span>
                                                                    <span className="text-slate-400">→</span>
                                                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        Target: {target.target_score}%
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1.5 text-xs">
                                                                <div className="text-slate-600">
                                                                    <strong className="text-slate-800 font-semibold">Identified Gap: </strong>
                                                                    {target.issue}
                                                                </div>
                                                                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 font-serif leading-relaxed">
                                                                    <strong className="text-indigo-700 font-sans font-semibold block mb-0.5">
                                                                        Action Step:
                                                                    </strong>
                                                                    {target.action_step}
                                                                </div>
                                                            </div>

                                                            {/* CTA practice links */}
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                                                {target.practice_topic && (
                                                                    <span className="text-2xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                                                                        Topic: {target.practice_topic}
                                                                    </span>
                                                                )}

                                                                {(target.deep_link || target.coach_scenario_id) && (
                                                                    <Link
                                                                        href={target.deep_link || '/dashboard/communication-coach'}
                                                                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ml-auto"
                                                                    >
                                                                        <span>Practice in Communication Coach</span>
                                                                        <span>→</span>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Before vs After Exemplar Refinements */}
                                {session.evaluation.actionable_growth_plan.exemplar_refinements &&
                                    session.evaluation.actionable_growth_plan.exemplar_refinements.length > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    STAR Method Exemplar Comparison (Before vs. After)
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Contrast your raw transcript quote with an AI-refined exemplar showcasing clear Situation, Task, Action, and quantified Result.
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                {session.evaluation.actionable_growth_plan.exemplar_refinements.map(
                                                    (ex, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50"
                                                        >
                                                            {/* Actual Candidate Quote */}
                                                            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2 text-left">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-2xs uppercase font-extrabold tracking-wider text-amber-900">
                                                                        Candidate Raw Quote (Before)
                                                                    </span>
                                                                    <span className="text-3xs px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                                                                        Unstructured
                                                                    </span>
                                                                </div>
                                                                <blockquote className="text-xs italic text-amber-950 font-serif leading-relaxed border-l-2 border-amber-400 pl-3">
                                                                    "{ex.candidate_quote}"
                                                                </blockquote>
                                                                <p className="text-3xs text-amber-700 font-sans">
                                                                    Gap: Lacks quantified metrics and explicit STAR structure.
                                                                </p>
                                                            </div>

                                                            {/* AI-Refined Exemplar */}
                                                            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 text-left">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-2xs uppercase font-extrabold tracking-wider text-emerald-900">
                                                                        AI-Refined STAR Exemplar (After)
                                                                    </span>
                                                                    <span className="text-3xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                                                                        High Impact
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-emerald-950 font-serif leading-relaxed border-l-2 border-emerald-500 pl-3">
                                                                    {ex.improved_exemplar}
                                                                </div>
                                                                <p className="text-3xs text-emerald-700 font-sans">
                                                                    Strength: Details clear Situation, Task, personal Action, and quantified Result.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Navigation CTAs */}
                                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <Link
                                        href="/dashboard/communication-coach"
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <span>Explore Communication Coach Hub</span>
                                        <span>→</span>
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('LOBBY');
                                            loadInterviews();
                                        }}
                                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                                    >
                                        Return to Interviews Lobby
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
