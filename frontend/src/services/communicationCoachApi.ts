import { apiClient } from "./apiClient";

export interface CommunicationCategoryInfo {
  key: string;
  label: string;
  scenario_count: number;
  completed_sessions: number;
  average_score: number | null;
}

export interface CommunicationScenarioItem {
  id: number;
  category: string;
  title: string;
  prompt_text: string;
  context_scenario: string;
  target_audience: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  min_word_limit: number;
  max_word_limit: number;
  recommended_min_words: number;
  recommended_max_words: number;
  key_focus_areas: string[];
}

export interface RubricScores {
  clarity: number;
  relevance: number;
  coherence_organization: number;
  grammar: number;
  professional_language: number;
  conciseness: number;
  audience_adaptation: number;
}

export interface FactualEvaluation {
  guidance_alignment_status: "SUPPORTED_BY_GUIDANCE" | "CONTRADICTS_GUIDANCE" | "UNVERIFIED" | "NOT_APPLICABLE";
  factual_concerns: string[];
  guidance_comparison_notes: string;
  disclaimer: string;
}

export interface GroundedExplanation {
  excerpt: string;
  feedback: string;
  dimension: string;
}

export interface RecommendedExercise {
  category: string;
  scenario_id: number;
  title: string;
  objective: string;
}

export interface CommunicationFeedbackData {
  id: number;
  session_id: number;
  overall_score: number;
  rubric_scores: RubricScores;
  factual_technical_evaluation: FactualEvaluation;
  strengths: string[];
  areas_to_improve: string[];
  grounded_explanations: GroundedExplanation[];
  actionable_suggestions: string[];
  improved_example_response: string;
  recommended_next_exercise: RecommendedExercise;
  ai_model: string;
  is_simulated: boolean;
  created_at: string;
}

export interface CommunicationPracticeSessionData {
  id: number;
  student_id: number;
  scenario_id: number;
  category: string;
  status: "IN_PROGRESS" | "EVALUATION_IN_PROGRESS" | "EVALUATED" | "EVALUATION_FAILED" | "ABANDONED";
  student_response: string | null;
  word_count: number | null;
  attempt_number: number;
  revision_number: number;
  parent_session_id: number | null;
  is_follow_up: boolean;
  error_type: string | null;
  error_message: string | null;
  submitted_at: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
  scenario?: CommunicationScenarioItem;
  feedback?: CommunicationFeedbackData;
  parent_session?: CommunicationPracticeSessionData;
  revision_child?: CommunicationPracticeSessionData;
}

export interface CommunicationProgressData {
  total_completed_sessions: number;
  overall_average_score: number;
  dimension_averages: Record<string, number>;
  score_trajectory: Array<{
    session_id: number;
    category: string;
    evaluated_at: string;
    overall_score: number;
  }>;
  disclaimer: string;
}

export interface PaginatedSessions {
  data: CommunicationPracticeSessionData[];
  current_page: number;
  last_page: number;
  total: number;
}

export const communicationCoachApi = {
  getCategories: () =>
    apiClient.get<{ categories: CommunicationCategoryInfo[] }>(
      "/api/v1/students/me/communication-coach/categories"
    ),

  getScenarios: (params?: { category?: string; difficulty?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
    return apiClient.get<{ scenarios: CommunicationScenarioItem[] }>(
      `/api/v1/students/me/communication-coach/scenarios${qs}`
    );
  },

  getScenario: (id: number) =>
    apiClient.get<{ scenario: CommunicationScenarioItem }>(
      `/api/v1/students/me/communication-coach/scenarios/${id}`
    ),

  startSession: (scenarioId: number, forceNew: boolean = false) =>
    apiClient.post<{ session: CommunicationPracticeSessionData; is_resumed: boolean }>(
      "/api/v1/students/me/communication-coach/sessions/start",
      { scenario_id: scenarioId, force_new: forceNew }
    ),

  createRevision: (sessionId: number) =>
    apiClient.post<{ session: CommunicationPracticeSessionData; message: string }>(
      `/api/v1/students/me/communication-coach/sessions/${sessionId}/revision`
    ),

  getSession: (id: number) =>
    apiClient.get<{ session: CommunicationPracticeSessionData }>(
      `/api/v1/students/me/communication-coach/sessions/${id}`
    ),

  submitResponse: (sessionId: number, responseText: string) =>
    apiClient.post<{
      message: string;
      session: CommunicationPracticeSessionData;
      feedback: CommunicationFeedbackData;
    }>(`/api/v1/students/me/communication-coach/sessions/${sessionId}/submit`, {
      response_text: responseText,
    }),

  retryEvaluation: (sessionId: number) =>
    apiClient.post<{
      message: string;
      session: CommunicationPracticeSessionData;
      feedback: CommunicationFeedbackData;
    }>(`/api/v1/students/me/communication-coach/sessions/${sessionId}/retry-evaluation`),

  getFeedback: (sessionId: number) =>
    apiClient.get<{
      session: CommunicationPracticeSessionData;
      feedback: CommunicationFeedbackData;
    }>(`/api/v1/students/me/communication-coach/sessions/${sessionId}/feedback`),

  getProgress: () =>
    apiClient.get<CommunicationProgressData>(
      "/api/v1/students/me/communication-coach/progress"
    ),

  getHistory: (params?: { category?: string; status?: string; page?: number }) => {
    const cleanParams: Record<string, string> = {};
    if (params?.category) cleanParams.category = params.category;
    if (params?.status) cleanParams.status = params.status;
    if (params?.page) cleanParams.page = String(params.page);
    const qs = Object.keys(cleanParams).length > 0 ? `?${new URLSearchParams(cleanParams).toString()}` : "";
    return apiClient.get<PaginatedSessions>(
      `/api/v1/students/me/communication-coach/history${qs}`
    );
  },
};
