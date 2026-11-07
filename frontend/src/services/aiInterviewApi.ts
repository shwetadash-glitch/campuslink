import { apiClient } from './apiClient';

export interface AiInterviewListItem {
    id: number;
    title: string;
    code: string;
    description?: string;
    target_role: string;
    interview_type: string;
    difficulty: string;
    duration_minutes: number;
    pass_percentage: number;
    attempts_used: number;
    can_attempt: boolean;
    active_session_id?: number;
    last_score?: number;
    last_passed?: boolean;
    is_provisional?: boolean;
    drive_title?: string;
    company_name?: string;
}

export interface InterviewMessage {
    id: number;
    sender: 'AI' | 'CANDIDATE';
    message_type: 'QUESTION' | 'ANSWER' | 'FOLLOW_UP' | 'SYSTEM';
    content: string;
    is_follow_up: boolean;
    created_at?: string;
}

export interface CandidateInterviewSession {
    id: number;
    interview_id: number;
    interview_title: string;
    target_role: string;
    attempt_number: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'EVALUATED';
    current_stage: string;
    current_question_index: number;
    seconds_remaining: number;
    is_expired: boolean;
    started_at?: string;
    expires_at?: string;
    completed_at?: string;
    messages: InterviewMessage[];
    evaluation?: {
        total_score: number;
        passed: boolean;
        is_provisional: boolean;
        dimension_scores?: {
            technical_depth?: number;
            problem_solving?: number;
            communication_clarity?: number;
            behavioral_star_alignment?: number;
        };
        strengths?: string[];
        weaknesses?: string[];
        quote_evidence?: string[];
        recommendation?: string;
    };
}

export interface SubmitAnswerResponse {
    status: string;
    type: 'FOLLOW_UP' | 'NEXT_QUESTION' | 'COMPLETED';
    message?: InterviewMessage;
    question?: {
        id: number;
        stage: string;
        order_index: number;
        category: string;
        question_text: string;
    };
    session: CandidateInterviewSession;
    summary?: {
        total_score: number;
        passed: boolean;
        is_provisional: boolean;
    };
}

export const aiInterviewApi = {
    // Candidate API
    listStudentInterviews: async (): Promise<AiInterviewListItem[]> => {
        const res = await apiClient.get<{ status: string; interviews: AiInterviewListItem[] }>('/students/me/ai-interviews');
        return res.interviews || [];
    },

    startCandidateSession: async (interviewId: number): Promise<CandidateInterviewSession> => {
        const res = await apiClient.post<{ status: string; session: CandidateInterviewSession }>(`/students/me/ai-interviews/${interviewId}/start`);
        return res.session;
    },

    showCandidateSession: async (sessionId: number): Promise<CandidateInterviewSession> => {
        const res = await apiClient.get<{ status: string; session: CandidateInterviewSession }>(`/students/me/ai-interviews/sessions/${sessionId}`);
        return res.session;
    },

    submitCandidateAnswer: async (sessionId: number, answer: string): Promise<SubmitAnswerResponse> => {
        const res = await apiClient.post<SubmitAnswerResponse>(`/students/me/ai-interviews/sessions/${sessionId}/answer`, { answer });
        return res;
    },

    getSessionReport: async (sessionId: number): Promise<CandidateInterviewSession> => {
        const res = await apiClient.get<{ status: string; session: CandidateInterviewSession }>(`/students/me/ai-interviews/sessions/${sessionId}/report`);
        return res.session;
    },

    // Officer Management API
    listOfficerInterviews: async (queryParams?: Record<string, string>) => {
        const search = queryParams ? '?' + new URLSearchParams(queryParams).toString() : '';
        const res = await apiClient.get<any>(`/officer/ai-interviews${search}`);
        return res;
    },

    createInterview: async (data: Record<string, any>) => {
        const res = await apiClient.post<any>('/officer/ai-interviews', data);
        return res;
    },

    getOfficerInterview: async (id: number) => {
        const res = await apiClient.get<any>(`/officer/ai-interviews/${id}`);
        return res;
    },

    generateQuestions: async (id: number, contextSource?: string, count: number = 4) => {
        const res = await apiClient.post<any>(`/officer/ai-interviews/${id}/generate-questions`, {
            context_source: contextSource,
            count,
        });
        return res;
    },

    approveQuestion: async (id: number, questionId: number) => {
        const res = await apiClient.post<any>(`/officer/ai-interviews/${id}/approve-question/${questionId}`);
        return res;
    },

    editQuestion: async (id: number, questionId: number, data: Record<string, any>) => {
        const res = await apiClient.put<any>(`/officer/ai-interviews/${id}/edit-question/${questionId}`, data);
        return res;
    },

    publishInterview: async (id: number) => {
        const res = await apiClient.post<any>(`/officer/ai-interviews/${id}/publish`);
        return res;
    },

    listInterviewSessions: async (id: number) => {
        const res = await apiClient.get<any>(`/officer/ai-interviews/${id}/sessions`);
        return res;
    },

    overrideScore: async (sessionId: number, data: {
        new_score: number;
        reason: string;
        dimension_scores?: Record<string, number>;
        feedback?: string;
        review_status?: string;
    }) => {
        const res = await apiClient.post<any>(`/officer/ai-interviews/sessions/${sessionId}/override`, data);
        return res;
    },
};
