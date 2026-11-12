import { apiClient } from './apiClient';

export interface AssessmentItem {
    id: number;
    title: string;
    code: string;
    description?: string;
    assessment_type?: string;
    duration_minutes: number;
    total_marks: number;
    pass_percentage: number;
    max_attempts: number;
    questions_count?: number;
    verified_by?: string;
    verified_at?: string;
    attempts_used: number;
    can_attempt: boolean;
    active_session_id?: number;
    last_session_id?: number;
    last_score?: number;
    last_passed?: boolean;
    drive_title?: string;
    company_name?: string;
}

export interface CandidateQuestion {
    id: number;
    type: 'MCQ' | 'DESCRIPTIVE' | 'PROGRAMMING' | 'APTITUDE';
    difficulty: string;
    category: string;
    title: string;
    question_text: string;
    code_snippet?: string;
    programming_language?: string;
    options?: Array<{ id: string; text: string }>;
    sample_test_cases?: Array<{ input: string; expected_output: string; is_sample: boolean }>;
    marks: number;
    negative_marks: number;
}

export interface CandidateSession {
    id: number;
    assessment_id: number;
    assessment_title: string;
    duration_minutes: number;
    status: string;
    started_at: string;
    expires_at: string;
    seconds_remaining: number;
    is_expired: boolean;
    total_questions: number;
    questions: CandidateQuestion[];
    saved_answers: Record<number, {
        question_id: number;
        answer_text: string;
        code_language?: string;
        saved_at: string;
    }>;
}

export interface RunCodeResult {
    status: string;
    result: {
        adapter: string;
        is_simulated: boolean;
        status: string;
        passed_test_cases: number;
        total_test_cases: number;
        pass_percentage: number;
        test_case_results: Array<{
            test_case_number: number;
            passed: boolean;
            status: string;
            execution_time_ms: number;
            input?: string;
            expected_output?: string;
            actual_output?: string;
            stderr?: string;
        }>;
    };
}

export interface CriticalFocusArea {
    category: string;
    earned_percentage: number;
    missed_concepts: string[];
    recommended_action: string;
}

export interface CodeDiagnostic {
    question_title: string;
    failure_reason: 'SYNTAX_ERROR' | 'TIMEOUT_TLE' | 'EDGE_CASE_FAILURE' | 'LOGICAL_MISMATCH' | string;
    guidance: string;
}

export interface ImprovementRoadmap {
    critical_focus_areas: CriticalFocusArea[];
    code_diagnostics: CodeDiagnostic[];
    can_reattempt: boolean;
    reattempt_cooldown_hours: number;
}

export interface AssessmentResult {
    session_id: number;
    assessment_title: string;
    status: string;
    total_score: number;
    total_possible: number;
    passed: boolean;
    pass_percentage: number;
    submitted_at?: string;
    proctoring_flags_count: number;
    tab_switches?: number;
    is_disqualified?: boolean;
    disqualification_reason?: string;
    evaluation_summary?: {
        total_score: number;
        earned_percentage: number;
        passed: boolean;
        tab_switches?: number;
        is_disqualified?: boolean;
        disqualification_reason?: string;
        categories: Record<string, { earned: number; possible: number }>;
        improvement_roadmap?: ImprovementRoadmap;
    };
    improvement_roadmap?: ImprovementRoadmap;
}

export interface AssessmentSubmissionItem {
    id: number;
    assessment_id: number;
    student_id: number;
    attempt_number: number;
    status: string;
    total_score: number | null;
    passed: boolean | null;
    tab_switches: number;
    is_disqualified: boolean;
    disqualification_reason?: string;
    proctoring_flags_count: number;
    started_at: string;
    submitted_at?: string;
    student?: {
        id: number;
        roll_number?: string;
        branch?: string;
        user?: {
            id: number;
            name: string;
            email: string;
        };
    };
}

export interface OfficerAssessmentItem {
    id: number;
    title: string;
    code: string;
    description?: string;
    assessment_type: string;
    duration_minutes: number;
    total_marks: number;
    pass_percentage: number;
    max_attempts: number;
    is_randomized: boolean;
    negative_marking_rate: number;
    status: 'DRAFT' | 'PENDING_VERIFICATION' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
    instructions?: string;
    published_at?: string;
    created_at: string;
    questions_count: number;
    creator?: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    questions?: Array<{
        id: number;
        title: string;
        question_text: string;
        type: string;
        difficulty: string;
        category: string;
        marks: number;
        negative_marks: number;
        options?: Array<{ id: string; text: string }>;
        correct_answer?: string;
        explanation?: string;
    }>;
    metadata?: {
        created_by_role?: string;
        creator_name?: string;
        created_at?: string;
        verification?: {
            verified_by_user_id: number;
            verified_by_name: string;
            verified_by_role: string;
            verified_at: string;
            notes?: string;
        };
        rejection?: {
            rejected_by_user_id: number;
            rejected_by_name: string;
            rejected_by_role: string;
            rejected_at: string;
            reason: string;
        };
        submitted_for_review_at?: string;
        submitted_by?: string;
    };
    drive?: {
        id: number;
        name: string;
    };
}

export const assessmentsApi = {
    // -------------------------------------------------------------
    // Student Endpoints (Must use /api/v1/students/...)
    // -------------------------------------------------------------
    getAvailableAssessments: async (): Promise<AssessmentItem[]> => {
        const res = await apiClient.get<{ status: string; assessments: AssessmentItem[] }>('/api/v1/students/me/assessments');
        return res.assessments || [];
    },

    startSession: async (assessmentId: number): Promise<CandidateSession> => {
        const res = await apiClient.post<{ status: string; session: CandidateSession }>(`/api/v1/students/me/assessments/${assessmentId}/start`);
        return res.session;
    },

    getSession: async (sessionId: number): Promise<CandidateSession> => {
        const res = await apiClient.get<{ status: string; session: CandidateSession }>(`/api/v1/students/me/assessments/sessions/${sessionId}`);
        return res.session;
    },

    saveAnswer: async (sessionId: number, questionId: number, answerText: string, codeLanguage?: string) => {
        return await apiClient.post(`/api/v1/students/me/assessments/sessions/${sessionId}/save-answer`, {
            question_id: questionId,
            answer_text: answerText,
            code_language: codeLanguage,
        });
    },

    runSampleCode: async (sessionId: number, questionId: number, sourceCode: string, language: string): Promise<RunCodeResult> => {
        return await apiClient.post<RunCodeResult>(`/api/v1/students/me/assessments/sessions/${sessionId}/run-code`, {
            question_id: questionId,
            source_code: sourceCode,
            language,
        });
    },

    submitSession: async (sessionId: number, payload?: { tab_switches?: number; disqualified?: boolean }) => {
        return await apiClient.post(`/api/v1/students/me/assessments/sessions/${sessionId}/submit`, payload || {});
    },

    sendTelemetry: async (sessionId: number, eventType: string, eventData?: any) => {
        try {
            await apiClient.post(`/api/v1/students/me/assessments/sessions/${sessionId}/telemetry`, {
                event_type: eventType,
                event_data: eventData,
            });
        } catch {
            // Non-blocking telemetry
        }
    },

    getResult: async (sessionId: number): Promise<AssessmentResult> => {
        const res = await apiClient.get<{ status: string; result: AssessmentResult }>(`/api/v1/students/me/assessments/sessions/${sessionId}/result`);
        return res.result;
    },

    // -------------------------------------------------------------
    // Admin & Placement Officer (TPO) Endpoints (Must use /api/v1/officer/...)
    // -------------------------------------------------------------
    getOfficerAssessments: async (params?: { status?: string; all?: boolean }): Promise<OfficerAssessmentItem[]> => {
        const q = new URLSearchParams();
        if (params?.status && params.status !== 'ALL') q.set('status', params.status);
        if (params?.all) q.set('all', '1');
        const queryStr = q.toString() ? `?${q.toString()}` : '';

        const res = await apiClient.get<{ status: string; assessments: any }>(`/api/v1/officer/assessments${queryStr}`);
        if (Array.isArray(res.assessments)) {
            return res.assessments;
        }
        if (res.assessments?.data && Array.isArray(res.assessments.data)) {
            return res.assessments.data;
        }
        return [];
    },

    getAssessmentDetails: async (id: number): Promise<OfficerAssessmentItem> => {
        const res = await apiClient.get<{ status: string; assessment: OfficerAssessmentItem }>(`/api/v1/officer/assessments/${id}`);
        return res.assessment;
    },

    createAssessment: async (payload: any): Promise<OfficerAssessmentItem> => {
        const res = await apiClient.post<{ status: string; assessment: OfficerAssessmentItem }>('/api/v1/officer/assessments', payload);
        return res.assessment;
    },

    updateAssessment: async (id: number, payload: any): Promise<OfficerAssessmentItem> => {
        const res = await apiClient.put<{ status: string; assessment: OfficerAssessmentItem }>(`/api/v1/officer/assessments/${id}`, payload);
        return res.assessment;
    },

    verifyAssessment: async (id: number, notes?: string): Promise<OfficerAssessmentItem> => {
        const res = await apiClient.post<{ status: string; message: string; assessment: OfficerAssessmentItem }>(
            `/api/v1/officer/assessments/${id}/verify`,
            { notes }
        );
        return res.assessment;
    },

    rejectAssessment: async (id: number, reason: string): Promise<OfficerAssessmentItem> => {
        const res = await apiClient.post<{ status: string; message: string; assessment: OfficerAssessmentItem }>(
            `/api/v1/officer/assessments/${id}/reject`,
            { reason }
        );
        return res.assessment;
    },

    submitForVerification: async (id: number): Promise<OfficerAssessmentItem> => {
        const res = await apiClient.post<{ status: string; message: string; assessment: OfficerAssessmentItem }>(
            `/api/v1/officer/assessments/${id}/submit-verification`
        );
        return res.assessment;
    },

    deleteAssessment: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/v1/officer/assessments/${id}`);
    },

    publishAssessment: async (id: number) => {
        return await apiClient.post(`/api/v1/officer/assessments/${id}/publish`);
    },

    generateAiQuestions: async (sourceText: string, type = 'MCQ', difficulty = 'MEDIUM', count = 3) => {
        return await apiClient.post('/api/v1/officer/assessments/generate-questions', {
            source_text: sourceText,
            type,
            difficulty,
            count,
        });
    },

    approveQuestion: async (questionId: number, overrides?: any) => {
        return await apiClient.post(`/api/v1/officer/assessments/questions/${questionId}/approve`, overrides || {});
    },

    getAssessmentSubmissions: async (assessmentId: number): Promise<{
        assessment: { id: number; title: string; code: string; total_marks: number; pass_percentage: number };
        sessions: AssessmentSubmissionItem[];
    }> => {
        const res = await apiClient.get<any>(`/api/v1/officer/assessments/${assessmentId}/submissions`);
        const rawSessions = res.sessions?.data || res.sessions || [];
        return {
            assessment: res.assessment || { id: assessmentId, title: '', code: '', total_marks: 100, pass_percentage: 60 },
            sessions: Array.isArray(rawSessions) ? rawSessions : [],
        };
    },
};
