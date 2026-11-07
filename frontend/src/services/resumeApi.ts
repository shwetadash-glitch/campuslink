import { apiClient } from "./apiClient";

export interface ResumeItem {
  id: number;
  student_id: number;
  job_id: number | null;
  title: string;
  target_role: string | null;
  target_company: string | null;
  template: 'modern' | 'classic' | 'technical';
  is_primary: boolean;
  content: {
    personal_info: {
      full_name: string;
      email: string;
      phone: string;
      branch: string;
      graduation_year: number;
      cgpa: number | null;
      location?: string;
      linkedin_url?: string;
      github_url?: string;
      portfolio_url?: string;
    };
    summary: string;
    academic_history: Array<{
      id: number | null;
      qualification: string;
      institution: string;
      specialization: string;
      start_year: number | null;
      end_year: number | null;
      score_value: number;
      score_type: string;
      is_verified: boolean;
    }>;
    skills: Array<{
      id?: number;
      name: string;
      category: string;
      proficiency_level: string;
      is_verified: boolean;
    }>;
    projects: Array<{
      id?: number;
      title: string;
      description: string;
      technologies: string;
      project_url?: string;
      highlights?: string[];
      is_verified: boolean;
    }>;
    certifications: Array<{
      id?: number;
      name: string;
      issuing_org: string;
      issue_date?: string | null;
      expiry_date?: string | null;
      credential_id?: string;
      is_verified: boolean;
    }>;
    custom_sections?: Array<{ title: string; items: string[] }>;
    section_order: string[];
    section_visibility: Record<string, boolean>;
  };
  quality_score: number | null;
  ats_score: number | null;
  analysis_summary: any;
  job_match_score: number | null;
  job_description_raw: string | null;
  pdf_path: string | null;
  pdf_generated_at: string | null;
  approved_by_student_at: string | null;
  created_at: string;
  updated_at: string;
  versions?: ResumeVersionItem[];
}

export interface ResumeVersionItem {
  id: number;
  resume_id: number;
  student_id: number;
  version_number: number;
  change_summary: string | null;
  content: any;
  quality_score: number | null;
  ats_score: number | null;
  pdf_path: string | null;
  created_at: string;
}

export const resumeApi = {
  getResumes: () => apiClient.get<{ status: string; resumes: ResumeItem[] }>("/api/v1/students/me/resumes"),

  getResume: (id: number) =>
    apiClient.get<{ status: string; resume: ResumeItem }>(`/api/v1/students/me/resumes/${id}`),

  createResume: (data: {
    title: string;
    target_role?: string;
    target_company?: string;
    job_id?: number;
    template?: 'modern' | 'classic' | 'technical';
  }) => apiClient.post<{ status: string; resume: ResumeItem }>("/api/v1/students/me/resumes", data),

  updateResume: (
    id: number,
    data: {
      title?: string;
      target_role?: string;
      target_company?: string;
      template?: 'modern' | 'classic' | 'technical';
      content?: any;
      create_version?: boolean;
      change_summary?: string;
    }
  ) => apiClient.put<{ status: string; resume: ResumeItem }>(`/api/v1/students/me/resumes/${id}`, data),

  deleteResume: (id: number) =>
    apiClient.delete<{ status: string; message: string }>(`/api/v1/students/me/resumes/${id}`),

  setPrimary: (id: number) =>
    apiClient.post<{ status: string; message: string; resume: ResumeItem }>(
      `/api/v1/students/me/resumes/${id}/set-primary`,
      {}
    ),

  createVersion: (id: number, change_summary?: string) =>
    apiClient.post<{ status: string; version: ResumeVersionItem }>(
      `/api/v1/students/me/resumes/${id}/versions`,
      { change_summary }
    ),

  getVersions: (id: number) =>
    apiClient.get<{ status: string; versions: ResumeVersionItem[] }>(
      `/api/v1/students/me/resumes/${id}/versions`
    ),

  compareVersions: (id: number, v1?: number, v2?: number, compare_with_profile?: boolean) =>
    apiClient.post<{
      status: string;
      comparison: {
        left: { label: string; content: any };
        right: { label: string; content: any };
      };
    }>(`/api/v1/students/me/resumes/${id}/compare`, { v1, v2, compare_with_profile }),

  generateSummary: (id: number, target_role?: string, job_description?: string) =>
    apiClient.post<{
      status: string;
      summary: string;
      groundedness_verified: boolean;
      grounding_facts_used: any;
    }>(`/api/v1/students/me/resumes/${id}/generate-summary`, { target_role, job_description }),

  improveProject: (
    id: number,
    project: { title: string; description?: string; technologies?: string }
  ) =>
    apiClient.post<{
      status: string;
      enhanced_description: string;
      bullet_points: string[];
    }>(`/api/v1/students/me/resumes/${id}/improve-project`, { project }),

  analyzeJobDescription: (id: number, job_description: string, job_id?: number) =>
    apiClient.post<{
      status: string;
      job_match_score: number;
      extracted_skills: string[];
      matching_skills: string[];
      missing_skills: string[];
      recommendations: Array<{
        type: string;
        priority: string;
        title: string;
        message: string;
        rationale: string;
      }>;
    }>(`/api/v1/students/me/resumes/${id}/analyze-job`, { job_description, job_id }),

  analyzeQuality: (id: number) =>
    apiClient.post<{
      status: string;
      analysis: {
        quality_score: number;
        ats_score: number;
        completeness_score: number;
        readability_score: number;
        issues: Array<{ section: string; issue: string }>;
        unsupported_claims: Array<{ type: string; item: string; severity: string; message: string }>;
        recommendations: string[];
      };
    }>(`/api/v1/students/me/resumes/${id}/analyze-quality`, {}),

  approveResume: (id: number) =>
    apiClient.post<{
      status: string;
      message: string;
      approved_at: string;
    }>(`/api/v1/students/me/resumes/${id}/approve`, {}),

  exportPdf: (id: number) =>
    apiClient.post<{
      status: string;
      message: string;
      pdf_path: string;
      download_url: string;
      generated_at: string;
    }>(`/api/v1/students/me/resumes/${id}/export-pdf`, {}),

  getDownloadUrl: (id: number) => `/api/v1/students/me/resumes/${id}/download-pdf`,
};
