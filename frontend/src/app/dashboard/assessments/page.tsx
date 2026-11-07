'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { assessmentsApi, AssessmentItem, CandidateSession, CandidateQuestion, AssessmentResult, RunCodeResult } from '@/services/assessmentsApi';

export default function StudentAssessmentsPage() {
    const [viewMode, setViewMode] = useState<'LIST' | 'EXAM' | 'RESULT'>('LIST');
    const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Active Exam State
    const [activeSession, setActiveSession] = useState<CandidateSession | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [codeLanguages, setCodeLanguages] = useState<Record<number, string>>({});
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [saveStatus, setSaveStatus] = useState<string>('All changes saved');
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
            setError(err?.response?.data?.message || 'Failed to load available assessments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAvailable();
    }, []);

    // Countdown Timer & Deadline Monitor
    useEffect(() => {
        if (viewMode === 'EXAM' && secondsLeft > 0) {
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
        if (viewMode !== 'EXAM' || !activeSession) return;

        const handleBlur = () => {
            assessmentsApi.sendTelemetry(activeSession.id, 'WINDOW_BLUR', {
                timestamp: new Date().toISOString(),
            });
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                assessmentsApi.sendTelemetry(activeSession.id, 'FULLSCREEN_EXIT', {
                    timestamp: new Date().toISOString(),
                });
            }
        };

        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
            setViewMode('EXAM');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Could not start assessment session.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = async (questionId: number, val: string, lang?: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: val }));
        setSaveStatus('Saving draft...');

        try {
            await assessmentsApi.saveAnswer(activeSession!.id, questionId, val, lang || codeLanguages[questionId]);
            setSaveStatus('All changes saved');
        } catch {
            setSaveStatus('Offline (will retry on submit)');
        }
    };

    const handleRunSampleCode = async (q: CandidateQuestion) => {
        const code = answers[q.id] || q.code_snippet || '';
        const lang = codeLanguages[q.id] || q.programming_language || 'php';

        setRunCodeLoading(true);
        setRunCodeOutput(null);
        try {
            const res = await assessmentsApi.runSampleCode(activeSession!.id, q.id, code, lang);
            setRunCodeOutput(res);
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to execute code in sandbox.');
        } finally {
            setRunCodeLoading(false);
        }
    };

    const handleSubmitTest = async () => {
        if (!confirm('Are you sure you want to finish and submit your examination?')) return;
        setSubmitting(true);
        try {
            const res = await assessmentsApi.submitSession(activeSession!.id);
            // Fetch comprehensive performance report
            const fullResult = await assessmentsApi.getResult(activeSession!.id);
            setResultData(fullResult);
            setViewMode('RESULT');
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to submit examination.');
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
            setViewMode('RESULT');
        } catch {
            alert('Your examination time has expired and your answers have been recorded.');
            loadAvailable();
            setViewMode('LIST');
        }
    };

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* 1. VIEW MODE: AVAILABLE ASSESSMENTS */}
                {viewMode === 'LIST' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Online Assessments & Examinations</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Participate in secure, time-limited technical and reasoning evaluations for campus placement drives.
                                </p>
                            </div>
                            <button
                                onClick={loadAvailable}
                                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 font-medium"
                            >
                                Refresh Tests
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-12 text-gray-500">Loading scheduled examinations...</div>
                        ) : assessments.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border p-8">
                                <p className="text-gray-500">No active assessments currently scheduled for your profile.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {assessments.map((a) => (
                                    <div key={a.id} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {a.code}
                                                </span>
                                                <span className="text-xs font-medium text-gray-500">
                                                    {a.duration_minutes} Mins
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{a.title}</h3>
                                            {a.company_name && (
                                                <p className="text-xs font-medium text-gray-600 mb-2">
                                                    Company: <span className="text-gray-900">{a.company_name}</span>
                                                </p>
                                            )}
                                            {a.description && (
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{a.description}</p>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg mb-4">
                                                <div>Total Marks: <span className="font-semibold text-gray-900">{a.total_marks}</span></div>
                                                <div>Pass Cutoff: <span className="font-semibold text-gray-900">{a.pass_percentage}%</span></div>
                                                <div>Attempts: <span className="font-semibold text-gray-900">{a.attempts_used} / {a.max_attempts}</span></div>
                                                {a.last_score !== undefined && a.last_score !== null && (
                                                    <div>Last Score: <span className={`font-bold ${a.last_passed ? 'text-green-600' : 'text-red-600'}`}>{a.last_score} ({a.last_passed ? 'Pass' : 'Fail'})</span></div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleStartOrResume(a.id)}
                                            disabled={!a.can_attempt}
                                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                                                a.active_session_id
                                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                                    : a.can_attempt
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {a.active_session_id ? 'Resume In-Progress Test' : a.can_attempt ? 'Start Assessment' : 'Attempts Exhausted'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. VIEW MODE: ACTIVE EXAMINATION ROOM */}
                {viewMode === 'EXAM' && activeSession && (
                    <div className="space-y-6">
                        {/* Header Bar */}
                        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-10">
                            <div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                                    Official Examination Session #{activeSession.id}
                                </span>
                                <h2 className="text-xl font-bold text-gray-900 mt-1">{activeSession.assessment_title}</h2>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Time Remaining</div>
                                    <div className={`text-2xl font-mono font-bold ${secondsLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                                        {formatTime(secondsLeft)}
                                    </div>
                                </div>

                                <div className="hidden sm:block text-xs text-gray-500 border-l pl-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        <span>{saveStatus}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmitTest}
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-sm transition"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Final Test'}
                                </button>
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
                                        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
                                            {/* Question Header */}
                                            <div className="flex items-center justify-between border-b pb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded">
                                                        Question {currentQuestionIndex + 1} of {activeSession.questions.length}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded">
                                                        {q.type}
                                                    </span>
                                                    <span className="px-2 py-0.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded">
                                                        {q.difficulty}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-semibold text-gray-600">
                                                    Marks: <span className="text-gray-900 font-bold">+{q.marks}</span>
                                                    {q.negative_marks > 0 && (
                                                        <span className="text-red-600 ml-2">(-{q.negative_marks} if wrong)</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Question Prompt */}
                                            <div className="text-base font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                {q.question_text}
                                            </div>

                                            {/* TYPE 1: MCQ Options */}
                                            {q.type === 'MCQ' && q.options && (
                                                <div className="space-y-3 pt-2">
                                                    {q.options.map((opt) => {
                                                        const isSelected = answers[q.id] === opt.id;
                                                        return (
                                                            <label
                                                                key={opt.id}
                                                                className={`flex items-start p-3.5 border rounded-lg cursor-pointer transition ${
                                                                    isSelected
                                                                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                                        : 'border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`question_${q.id}`}
                                                                    value={opt.id}
                                                                    checked={isSelected}
                                                                    onChange={() => handleAnswerChange(q.id, opt.id)}
                                                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                                />
                                                                <div className="ml-3 text-sm text-gray-900">
                                                                    <span className="font-bold mr-2 text-indigo-700">{opt.id}.</span>
                                                                    {opt.text}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* TYPE 2: Descriptive / Subjective Answer */}
                                            {q.type === 'DESCRIPTIVE' && (
                                                <div className="space-y-2 pt-2">
                                                    <label className="block text-xs font-semibold text-gray-700 uppercase">
                                                        Your Response:
                                                    </label>
                                                    <textarea
                                                        rows={8}
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                        placeholder="Write your explanation or derivation clearly..."
                                                        className="w-full border rounded-lg p-3 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 font-sans"
                                                    />
                                                </div>
                                            )}

                                            {/* TYPE 3: Programming / Sandbox Code Question */}
                                            {q.type === 'PROGRAMMING' && (
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold text-gray-700 uppercase">
                                                            Candidate Code Solution:
                                                        </label>
                                                        <select
                                                            value={codeLanguages[q.id] || q.programming_language || 'php'}
                                                            onChange={(e) => {
                                                                setCodeLanguages((prev) => ({ ...prev, [q.id]: e.target.value }));
                                                                handleAnswerChange(q.id, answers[q.id] || q.code_snippet || '', e.target.value);
                                                            }}
                                                            className="text-xs border rounded-md px-2 py-1 bg-white font-mono"
                                                        >
                                                            <option value="php">PHP 8.2</option>
                                                            <option value="python">Python 3</option>
                                                            <option value="javascript">JavaScript (Node)</option>
                                                            <option value="cpp">C++ (GCC)</option>
                                                        </select>
                                                    </div>

                                                    <textarea
                                                        rows={12}
                                                        value={answers[q.id] !== undefined ? answers[q.id] : (q.code_snippet || '')}
                                                        onChange={(e) => handleAnswerChange(q.id, e.target.value, codeLanguages[q.id])}
                                                        placeholder="Write your solution here. Input is passed via standard input (STDIN)..."
                                                        className="w-full border rounded-lg p-3.5 text-xs text-gray-900 font-mono bg-gray-900 text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    />

                                                    {/* Sample Test Cases View */}
                                                    {q.sample_test_cases && q.sample_test_cases.length > 0 && (
                                                        <div className="bg-gray-50 border rounded-lg p-3.5 space-y-2 text-xs">
                                                            <div className="font-bold text-gray-700 uppercase text-[11px]">Visible Sample Test Cases:</div>
                                                            {q.sample_test_cases.map((tc, tcIdx) => (
                                                                <div key={tcIdx} className="grid grid-cols-2 gap-2 bg-white p-2 border rounded font-mono">
                                                                    <div>Input: <span className="text-gray-900">{tc.input}</span></div>
                                                                    <div>Expected: <span className="text-green-700 font-semibold">{tc.expected_output}</span></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => handleRunSampleCode(q)}
                                                            disabled={runCodeLoading}
                                                            className="px-4 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm transition"
                                                        >
                                                            {runCodeLoading ? 'Executing in Sandbox...' : 'Run Sample Test Cases'}
                                                        </button>
                                                    </div>

                                                    {/* Sandbox Execution Feedback */}
                                                    {runCodeOutput && (
                                                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs space-y-2 border border-gray-800">
                                                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                                                <span className="font-bold text-indigo-400">Sandbox Result: {runCodeOutput.result.status}</span>
                                                                <span>Passed {runCodeOutput.result.passed_test_cases} / {runCodeOutput.result.total_test_cases} Samples</span>
                                                            </div>
                                                            {runCodeOutput.result.test_case_results.map((tr) => (
                                                                <div key={tr.test_case_number} className="text-xs">
                                                                    <span className={tr.passed ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                                        Test Case #{tr.test_case_number}: {tr.passed ? 'PASSED' : tr.status}
                                                                    </span>
                                                                    {!tr.passed && tr.actual_output && (
                                                                        <div className="text-gray-400 pl-4 mt-1">
                                                                            Actual Output: "{tr.actual_output}" | Expected: "{tr.expected_output}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Navigation Controls */}
                                            <div className="flex items-center justify-between border-t pt-4">
                                                <button
                                                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                                                    disabled={currentQuestionIndex === 0}
                                                    className="px-4 py-2 text-xs font-semibold bg-white border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(activeSession.questions.length - 1, prev + 1))}
                                                    disabled={currentQuestionIndex === activeSession.questions.length - 1}
                                                    className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                                                >
                                                    Save & Next
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Right: Question Navigation Palette */}
                            <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4 h-fit">
                                <h4 className="text-xs font-bold uppercase text-gray-700 tracking-wider">Question Jump Palette</h4>
                                <div className="grid grid-cols-5 gap-2">
                                    {activeSession.questions.map((q, idx) => {
                                        const isAnswered = !!answers[q.id] && answers[q.id].trim().length > 0;
                                        const isCurrent = idx === currentQuestionIndex;

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => setCurrentQuestionIndex(idx)}
                                                className={`h-9 w-full rounded font-mono text-xs font-bold transition flex items-center justify-center ${
                                                    isCurrent
                                                        ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white'
                                                        : isAnswered
                                                        ? 'bg-green-100 text-green-800 border border-green-300'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="border-t pt-3 text-[11px] text-gray-500 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                                        <span>Answered</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded bg-gray-100"></span>
                                        <span>Unanswered</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded bg-indigo-600"></span>
                                        <span>Current Question</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. VIEW MODE: POST-SUBMISSION PERFORMANCE REPORT */}
                {viewMode === 'RESULT' && resultData && (
                    <div className="bg-white border rounded-2xl p-8 max-w-2xl mx-auto shadow-sm space-y-6 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${resultData.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {resultData.passed ? (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            )}
                        </div>

                        <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${resultData.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {resultData.passed ? 'Assessment Cleared' : 'Cutoff Not Cleared'}
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900 mt-2">{resultData.assessment_title}</h2>
                            <p className="text-xs text-gray-500 mt-1">Submitted at {resultData.submitted_at}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-left">
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Score Earned</div>
                                <div className="text-2xl font-bold text-gray-900">{resultData.total_score} / {resultData.total_possible}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Passing Cutoff</div>
                                <div className="text-2xl font-bold text-gray-900">{resultData.pass_percentage}%</div>
                            </div>
                        </div>

                        {resultData.evaluation_summary?.categories && (
                            <div className="text-left space-y-2 border-t pt-4">
                                <h4 className="text-xs font-bold uppercase text-gray-700">Competency Breakdown:</h4>
                                <div className="space-y-1.5">
                                    {Object.entries(resultData.evaluation_summary.categories).map(([cat, score]) => (
                                        <div key={cat} className="flex justify-between text-xs py-1 border-b">
                                            <span className="text-gray-700">{cat}</span>
                                            <span className="font-semibold text-gray-900">{score.earned} / {score.possible} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <button
                                onClick={() => {
                                    setViewMode('LIST');
                                    loadAvailable();
                                }}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm text-sm"
                            >
                                Return to Assessments Hub
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
