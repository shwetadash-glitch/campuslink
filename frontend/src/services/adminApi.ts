import { apiClient } from "./apiClient";

export interface AdminUserItem {
  id: number;
  email: string;
  role: "STUDENT" | "RECRUITER" | "PLACEMENT_OFFICER" | "SUPER_ADMIN" | "MENTOR";
  is_active: boolean;
  created_at: string | null;
  student_profile?: {
    id: number;
    first_name: string;
    last_name: string;
    student_identifier: string;
    branch: string;
    cgpa: number;
  } | null;
  recruiter_profile?: {
    id: number;
    company_id: number;
    company_name: string | null;
  } | null;
}

export interface MasterSkillItem {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  student_count: number;
  job_count: number;
}

export interface OfficerStudentItem {
  id: number;
  user_id: number;
  student_identifier: string;
  first_name: string;
  last_name: string;
  branch: string;
  graduation_year: number;
  cgpa: number;
  backlogs_current: number;
  backlogs_history: number;
  phone: string | null;
  email: string | null;
  skills_count: number;
  projects_count: number;
  certifications_count: number;
  resume_url: string | null;
  readiness_score: number | null;
}

export interface OfficerCompanyItem {
  id: number;
  name: string;
  description: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  headquarters: string | null;
  recruiters_count: number;
  recruiters: Array<{
    id: number;
    contact_name: string | null;
    contact_email: string;
    contact_phone: string | null;
  }>;
  active_jobs_count: number;
  drives_count: number;
}

export interface RadarDataPoint {
  subject: string;
  required: number;
  actual: number;
  fullMark: number;
  mandatory: boolean;
}

export interface ShortlistCandidate {
  rank: number | null;
  student_id: number;
  student_identifier: string;
  student_name: string;
  branch: string;
  canonical_branch?: string;
  cgpa: number | string | null;
  readiness_score: number;
  fit_score: number;
  is_eligible: boolean;
  failed_criteria?: string[];
  matched_skills: any[];
  partial_skills: any[];
  missing_skills: any[];
  radar_data: RadarDataPoint[];
  tier: "HIGHLY_EMPLOYABLE" | "QUALIFIED" | "NOT_READY";
  justification: string;
}

export interface BranchStat {
  canonical: string;
  display_name: string;
  total: number;
  eligible: number;
  disqualified: number;
  highly_employable: number;
  qualified: number;
  avg_fit: number;
}

export interface DriveTrackInfo {
  drive_id: number;
  drive_name: string;
  company_name: string;
  job_title?: string;
  track: string;
  domain_badge?: string;
  allowed_branches?: string[];
}

export const adminApi = {
  getDashboard: () => apiClient.get<any>('/api/v1/officer/dashboard'),

  getAiShortlist: (driveId: number, params?: { limit?: number; offset?: number; branch?: string }, options?: RequestInit) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset !== undefined) q.append("offset", params.offset.toString());
    if (params?.branch) q.append("branch", params.branch);
    return apiClient.get<{ 
      total: number; 
      candidates: ShortlistCandidate[]; 
      branch_breakdown?: Record<string, BranchStat>;
      drive_info?: DriveTrackInfo;
    }>(`/api/v1/officer/drives/${driveId}/ai-shortlist?${q.toString()}`, options);
  },

  // Users
  getUsers: (params?: { query?: string; role?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.query) q.append("query", params.query);
    if (params?.role) q.append("role", params.role);
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset) q.append("offset", params.offset.toString());
    return apiClient.get<{ total: number; users: AdminUserItem[] }>(`/api/v1/admin/users?${q.toString()}`);
  },

  getUser: (userId: number) =>
    apiClient.get<AdminUserItem>(`/api/v1/admin/users/${userId}`),

  updateUserStatus: (userId: number, isActive: boolean) =>
    apiClient.patch<{ id: number; email: string; is_active: boolean }>(
      `/api/v1/admin/users/${userId}/status`,
      { is_active: isActive }
    ),

  // Master Skills
  getMasterSkills: (params?: { query?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.query) q.append("query", params.query);
    if (params?.category) q.append("category", params.category);
    return apiClient.get<MasterSkillItem[]>(`/api/v1/skills?${q.toString()}`);
  },

  createMasterSkill: (data: { name: string; category?: string; description?: string }) =>
    apiClient.post<MasterSkillItem>("/api/v1/skills", data),

  updateMasterSkill: (
    skillId: number,
    data: { name?: string; category?: string; description?: string }
  ) => apiClient.put<MasterSkillItem>(`/api/v1/skills/${skillId}`, data),

  deleteMasterSkill: (skillId: number) =>
    apiClient.delete<{ message: string }>(`/api/v1/skills/${skillId}`),

  // Officer Students Directory
  getStudents: (params?: {
    query?: string;
    branch?: string;
    graduation_year?: number;
    min_cgpa?: number;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.query) q.append("query", params.query);
    if (params?.branch) q.append("branch", params.branch);
    if (params?.graduation_year) q.append("graduation_year", params.graduation_year.toString());
    if (params?.min_cgpa) q.append("min_cgpa", params.min_cgpa.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset) q.append("offset", params.offset.toString());
    return apiClient.get<{ total: number; students: OfficerStudentItem[] }>(
      `/api/v1/officer/students?${q.toString()}`
    );
  },

  getStudentDetails: (studentId: number) =>
    apiClient.get<any>(`/api/v1/officer/students/${studentId}`),

  // Officer Corporate Partners
  getCompanies: (params?: { query?: string; industry?: string }) => {
    const q = new URLSearchParams();
    if (params?.query) q.append("query", params.query);
    if (params?.industry) q.append("industry", params.industry);
    return apiClient.get<OfficerCompanyItem[]>(`/api/v1/officer/companies?${q.toString()}`);
  },

  createCompany: (data: {
    name: string;
    industry?: string;
    size?: string;
    website?: string;
    headquarters?: string;
    description?: string;
  }) => apiClient.post<OfficerCompanyItem>("/api/v1/officer/companies", data),

  // Milestone 2: Placement Drive Management & Conflict Engine
  getDrives: (status?: string) => {
    const q = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient.get<any[]>(`/api/v1/tpo/drives${q}`);
  },

  getDrive: (id: number) => apiClient.get<any>(`/api/v1/tpo/drives/${id}`),

  createDrive: (data: {
    name: string;
    company_id: number;
    job_id: number;
    start_date: string;
    end_date: string;
    drive_type?: string;
    venue?: string;
    capacity?: number;
    branches?: string[];
    force?: boolean;
    override_justification?: string;
  }) => apiClient.post<any>("/api/v1/tpo/drives", data),

  updateDrive: (id: number, data: {
    lock_version: number;
    name?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    venue?: string;
    capacity?: number;
  }) => apiClient.put<any>(`/api/v1/tpo/drives/${id}`, data),

  addDriveRound: (driveId: number, data: {
    round_number: number;
    name: string;
    round_type: string;
    start_time: string;
    end_time: string;
    venue?: string;
    capacity?: number;
    instructions?: string;
    force?: boolean;
    override_justification?: string;
  }) => apiClient.post<any>(`/api/v1/tpo/drives/${driveId}/rounds`, data),

  detectConflicts: (data: {
    start_time: string;
    end_time: string;
    venue?: string;
    venue_id?: number;
    branches?: string[];
    drive_id?: number;
  }) => apiClient.post<any>("/api/v1/tpo/detect-conflicts", data),

  transitionCandidate: (driveId: number, candidateId: number, data: {
    new_status: string;
    reason?: string;
  }) => apiClient.post<any>(`/api/v1/tpo/drives/${driveId}/transition-candidate/${candidateId}`, data),

  getCandidateHistories: (driveId: number) =>
    apiClient.get<any[]>(`/api/v1/tpo/drives/${driveId}/candidate-histories`),

  getSchedulerEvents: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return apiClient.get<any[]>(`/api/v1/tpo/scheduler/events?${params.toString()}`);
  },

  getVenues: () => apiClient.get<any[]>("/api/v1/tpo/venues"),
  createVenue: (data: { name: string; building?: string; capacity?: number; is_virtual?: boolean }) =>
    apiClient.post<any>("/api/v1/tpo/venues", data),

  getInstitutionalEvents: () => apiClient.get<any[]>("/api/v1/tpo/institutional-events"),
  createInstitutionalEvent: (data: {
    title: string;
    event_type: string;
    start_time: string;
    end_time: string;
    affects_branches?: string[];
    is_hard_blackout?: boolean;
    notes?: string;
  }) => apiClient.post<any>("/api/v1/tpo/institutional-events", data),

  // Multi-Round Placement Pipeline (AI Shortlist -> Technical Quiz -> Group Discussion)
  getRoundsPipeline: (driveId: number) =>
    apiClient.get<DriveRoundsPipelineResponse>(`/api/v1/officer/drives/${driveId}/rounds-pipeline`),

  dispatchTechnicalQuiz: (driveId: number, candidateIds?: number[]) =>
    apiClient.post<{
      success: boolean;
      message: string;
      dispatched_count: number;
      candidate_ids: number[];
    }>(`/api/v1/officer/drives/${driveId}/dispatch-quiz`, { candidate_ids: candidateIds }),

  advanceCandidates: (driveId: number, data: { from_round: number; to_round: number; candidate_ids?: number[] }) =>
    apiClient.post<{ success: boolean; updated_count: number; target_round: number }>(`/api/v1/officer/drives/${driveId}/advance-candidates`, data),

  submitCandidateQuiz: (driveId: number, data: { candidate_id: number; score: number; skill_breakdown?: Record<string, number>; correct_answers?: number; notes?: string }) =>
    apiClient.post<any>(`/api/v1/officer/drives/${driveId}/submit-quiz`, data),

  submitCandidateGd: (driveId: number, data: { candidate_id: number; technical_depth: number; communication: number; critical_thinking: number; leadership: number; topic?: string; decision: string; remarks?: string }) =>
    apiClient.post<any>(`/api/v1/officer/drives/${driveId}/submit-gd`, data),

  getRoundsExportUrl: (driveId: number) =>
    `/api/v1/officer/drives/${driveId}/export-rounds`,

  // Milestone 8: Officer Offer Verification Desk & Workflows
  getOffers: (params?: { verification_status?: string; status?: string; search?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.verification_status) q.set("verification_status", params.verification_status);
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", params.page.toString());
    if (params?.per_page) q.set("per_page", params.per_page.toString());
    return apiClient.get<any>(`/api/v1/officer/offers?${q.toString()}`);
  },

  getOfferDetails: (id: number) =>
    apiClient.get<any>(`/api/v1/officer/offers/${id}`),

  claimOfferReview: (id: number) =>
    apiClient.post<any>(`/api/v1/officer/offers/${id}/claim-review`),

  verifyOffer: async (id: number, documentId?: number, notes?: string) => {
    const claimRes = await apiClient.post<any>(`/api/v1/officer/offers/${id}/claim-review`);
    const token = claimRes.review_claim_token;
    let docId = documentId;
    if (!docId) {
      const details = await apiClient.get<any>(`/api/v1/officer/offers/${id}`);
      const docs = details?.offer?.documents || [];
      docId = docs.length > 0 ? docs[0].id : 1;
    }
    return apiClient.post<any>(`/api/v1/officer/offers/${id}/verify`, {
      review_claim_token: token,
      reviewed_document_id: docId,
      notes: notes || "Verified by Placement Officer",
    });
  },

  flagOffer: async (id: number, reason: string, documentId?: number) => {
    const claimRes = await apiClient.post<any>(`/api/v1/officer/offers/${id}/claim-review`);
    const token = claimRes.review_claim_token;
    let docId = documentId;
    if (!docId) {
      const details = await apiClient.get<any>(`/api/v1/officer/offers/${id}`);
      const docs = details?.offer?.documents || [];
      docId = docs.length > 0 ? docs[0].id : null;
    }
    return apiClient.post<any>(`/api/v1/officer/offers/${id}/request-info`, {
      review_claim_token: token,
      notes: reason,
      reviewed_document_id: docId,
    });
  },

  rejectOffer: async (id: number, reason: string, documentId?: number) => {
    const claimRes = await apiClient.post<any>(`/api/v1/officer/offers/${id}/claim-review`);
    const token = claimRes.review_claim_token;
    let docId = documentId;
    if (!docId) {
      const details = await apiClient.get<any>(`/api/v1/officer/offers/${id}`);
      const docs = details?.offer?.documents || [];
      docId = docs.length > 0 ? docs[0].id : null;
    }
    return apiClient.post<any>(`/api/v1/officer/offers/${id}/reject`, {
      review_claim_token: token,
      reason: reason,
      reviewed_document_id: docId,
    });
  },

  // Milestone 8: Cohort & At-Risk Identification
  getAtRiskStudents: (params?: { branch?: string; risk_level?: string; include_placed?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.branch && params.branch !== "All Branches") q.set("branch", params.branch);
    if (params?.risk_level && params.risk_level !== "ALL") q.set("risk_level", params.risk_level);
    if (params?.include_placed) q.set("include_placed", "1");
    const query = q.toString() ? `?${q.toString()}` : "";
    return apiClient.get<AtRiskCohortResponse>(`/api/v1/officer/at-risk-students${query}`);
  },

  recordStudentIntervention: (studentId: number, data: { intervention_type: string; subject?: string; message?: string; action_notes?: string }) =>
    apiClient.post<{ success: boolean; message: string; student_id: number; active_intervention: string }>(`/api/v1/officer/students/${studentId}/intervention`, data),
};

export interface AtRiskStudentItem {
  id: number;
  user_id?: number;
  student: string;
  studentId: string;
  branch: string;
  canonical_branch?: string;
  cgpa: number;
  backlogs_current: number;
  backlogs_history: number;
  score: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | "PLACED";
  reason: string;
  intervention: string;
  is_placed: boolean;
  interventions_history?: Array<{
    id: string;
    type: string;
    officer_id?: number;
    subject?: string;
    message?: string;
    created_at: string;
  }>;
}

export interface AtRiskCohortResponse {
  summary: {
    total_cohort: number;
    total_placed: number;
    total_unplaced: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
    active_interventions_count: number;
    placed_rate_percent: number;
    intervention_success_rate: number;
  };
  branches: string[];
  students: AtRiskStudentItem[];
}

export interface DriveRoundsPipelineResponse {
  drive_info: {
    drive_id: number;
    drive_name: string;
    company_name: string;
    job_title: string;
    required_skills: Array<{
      skill_id: number;
      name: string;
      level: string;
      is_mandatory: boolean;
    }>;
  };
  rounds: Array<{
    round_number: number;
    name: string;
    type: string;
    status: string;
    difficulty?: string;
    duration_minutes?: number;
    passing_cutoff?: number;
    total_questions?: number;
    description?: string;
  }>;
  quiz_config: {
    difficulty: string;
    duration_minutes: number;
    passing_cutoff: number;
    skills_covered: string[];
    questions: Array<{
      id: string;
      skill: string;
      difficulty: string;
      question: string;
      options: Record<string, string>;
      correct_option: string;
      explanation: string;
    }>;
  };
  gd_topics: Array<{
    topic_id: string;
    title: string;
    description: string;
    key_evaluation_points: string[];
  }>;
  candidates: Array<{
    candidate_id: number;
    student_id: number;
    student_identifier: string;
    student_name: string;
    email: string | null;
    phone: string | null;
    branch: string;
    canonical_branch?: string;
    cgpa: number | null;
    current_round: number;
    overall_status: string;
    round_1: {
      round_number: number;
      name: string;
      is_eligible: boolean;
      fit_score: number;
      readiness_score: number;
      rank: number | null;
      tier: string;
      is_qualified: boolean;
      badge: string;
    };
    round_2: {
      round_number: number;
      name: string;
      quiz_sent?: boolean;
      student_submitted?: boolean;
      quiz_score: number | null;
      status: "AWAITING_TPO_DISPATCH" | "DISPATCHED_PENDING" | "CLEARED" | "FAILED" | "DISQUALIFIED" | "PENDING";
      is_qualified: boolean;
      skill_breakdown: Record<string, number>;
      dispatched_at?: string | null;
      submitted_at?: string | null;
      completed_at: string | null;
      correct_answers: number | null;
      total_questions: number;
    };
    round_3: {
      round_number: number;
      name: string;
      topic: string;
      technical_depth_score: number | null;
      communication_score: number | null;
      critical_thinking_score: number | null;
      leadership_score: number | null;
      overall_gd_score: number | null;
      decision: "SELECTED" | "WAITLISTED" | "NOT_RECOMMENDED" | "PENDING";
      remarks: string;
    };
  }>;
  summary: {
    total_applicants: number;
    round_1_qualified: number;
    quiz_dispatched?: number;
    round_2_cleared: number;
    round_3_selected: number;
  };
}
