import { apiClient } from './apiClient';

export interface AssessmentItem {
    id: number;
    title: string;
    code: string;
    description?: string;
    duration_minutes: number;
    total_marks: number;
    pass_percentage: number;
    max_attempts: number;
    attempts_used: number;
    can_attempt: boolean;
    active_session_id?: number;
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
    evaluation_summary?: {
        total_score: number;
        earned_percentage: number;
        passed: boolean;
        categories: Record<string, { earned: number; possible: number }>;
    };
}

export const assessmentsApi = {
    // Student Endpoints
    getAvailableAssessments: async (): Promise<AssessmentItem[]> => {
        const res = await apiClient.get<{ status: string; assessments: AssessmentItem[] }>('/students/me/assessments');
        return res.assessments || [];
    },

    startSession: async (assessmentId: number): Promise<CandidateSession> => {
        const res = await apiClient.post<{ status: string; session: CandidateSession }>(`/students/me/assessments/${assessmentId}/start`);
        return res.session;
    },

    getSession: async (sessionId: number): Promise<CandidateSession> => {
        const res = await apiClient.get<{ status: string; session: CandidateSession }>(`/students/me/assessments/sessions/${sessionId}`);
        return res.session;
    },

    saveAnswer: async (sessionId: number, questionId: number, answerText: string, codeLanguage?: string) => {
        return await apiClient.post(`/students/me/assessments/sessions/${sessionId}/save-answer`, {
            question_id: questionId,
            answer_text: answerText,
            code_language: codeLanguage,
        });
    },

    runSampleCode: async (sessionId: number, questionId: number, sourceCode: string, language: string): Promise<RunCodeResult> => {
        return await apiClient.post<RunCodeResult>(`/students/me/assessments/sessions/${sessionId}/run-code`, {
            question_id: questionId,
            source_code: sourceCode,
            language,
        });
    },

    submitSession: async (sessionId: number) => {
        return await apiClient.post(`/students/me/assessments/sessions/${sessionId}/submit`);
    },

    sendTelemetry: async (sessionId: number, eventType: string, eventData?: any) => {
        try {
            await apiClient.post(`/students/me/assessments/sessions/${sessionId}/telemetry`, {
                event_type: eventType,
                event_data: eventData,
            });
        } catch {
            // Non-blocking telemetry
        }
    },

    getResult: async (sessionId: number): Promise<AssessmentResult> => {
        const res = await apiClient.get<{ status: string; result: AssessmentResult }>(`/students/me/assessments/sessions/${sessionId}/result`);
        return res.result;
    },

    // Officer Endpoints
    getOfficerAssessments: async () => {
        const res = await apiClient.get<{ status: string; assessments: any[] }>('/officer/assessments');
        return res.assessments || [];
    },

    createAssessment: async (payload: any) => {
        const res = await apiClient.post<{ status: string; assessment: any }>('/officer/assessments', payload);
        return res.assessment;
    },

    publishAssessment: async (id: number) => {
        return await apiClient.post(`/officer/assessments/${id}/publish`);
    },

    generateAiQuestions: async (sourceText: string, type = 'MCQ', difficulty = 'MEDIUM', count = 3) => {
        return await apiClient.post('/officer/assessments/generate-questions', {
            source_text: sourceText,
            type,
            difficulty,
            count,
        });
    },

    approveQuestion: async (questionId: number, overrides?: any) => {
        return await apiClient.post(`/officer/assessments/questions/${questionId}/approve`, overrides || {});
    },
};
