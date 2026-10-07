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
    readiness_score?: number;
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


export interface ShortlistCandidate {
  student_id: number;
  student_identifier: string;
  student_name: string;
  branch: string;
  cgpa: string | null;
  readiness_score: number;
  is_eligible: boolean;
  matched_skills: any[];
  partial_skills: any[];
  missing_skills: any[];
  tier: "HIGHLY_EMPLOYABLE" | "QUALIFIED" | "NOT_READY";
  justification: string;
}

export const adminApi = {
  getAiShortlist: (driveId: number, params?: { limit?: number; offset?: number }, options?: RequestInit) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset !== undefined) q.append("offset", params.offset.toString());
    return apiClient.get<{ total: number; candidates: ShortlistCandidate[] }>(`/api/v1/officer/drives/${driveId}/ai-shortlist?${q.toString()}`, options);
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
};

