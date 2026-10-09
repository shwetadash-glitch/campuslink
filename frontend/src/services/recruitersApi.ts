import { apiClient } from "./apiClient";
import {
  CompanyData,
  JobData,
  DriveData,
  SkillItem,
  JobRequirementItem,
  RecruiterProfile,
} from "@/features/recruiters/types";

export interface CandidateItem {
  id: number;
  drive_id: number;
  student_id: number;
  student_name: string;
  student_identifier: string;
  branch: string;
  cgpa: number;
  graduation_year?: number | null;
  phone?: string | null;
  email?: string | null;
  skills?: string[];
  eligibility_status: boolean;
  registration_status: string;
  shortlist_status: boolean;
  candidate_notes?: string | null;
  registration_timestamp?: string | null;
  drive_name?: string;
}

export interface RecruiterDashboardMetrics {
  active_jobs_count: number;
  upcoming_drives_count: number;
  total_candidates_count: number;
  shortlisted_candidates_count: number;
}

export const recruitersApi = {
  getProfile: () => apiClient.get<RecruiterProfile>("/api/v1/recruiters/me"),

  updateCompany: (data: Partial<CompanyData>) =>
    apiClient.put<CompanyData>("/api/v1/recruiters/me/company", data),

  getGlobalShortlisted: () => apiClient.get<CandidateItem[]>('/api/v1/recruiters/me/shortlisted').catch(err => { console.error('SHORTLISTED API ERROR', err); throw err; }),

  getDashboardMetrics: () =>
    apiClient.get<RecruiterDashboardMetrics>("/api/v1/recruiters/me/dashboard"),

  getJobs: () => apiClient.get<JobData[]>("/api/v1/recruiters/me/jobs"),

  createJob: (data: Partial<JobData>) =>
    apiClient.post<JobData>("/api/v1/recruiters/me/jobs", data),

  updateJob: (id: number, data: Partial<JobData>) =>
    apiClient.put<JobData>(`/api/v1/recruiters/me/jobs/${id}`, data),

  deleteJob: (id: number) =>
    apiClient.delete(`/api/v1/recruiters/me/jobs/${id}`),

  getJobRequirements: (jobId: number) =>
    apiClient.get<JobRequirementItem[]>(`/api/v1/jobs/${jobId}/requirements`),

  createJobRequirement: (
    jobId: number,
    data: {
      skill_id: number;
      required_proficiency: string;
      weight: number;
      is_mandatory: boolean;
      minimum_experience: number;
      notes?: string | null;
    }
  ) =>
    apiClient.post<JobRequirementItem>(
      `/api/v1/jobs/${jobId}/requirements`,
      data
    ),

  deleteJobRequirement: (jobId: number, reqId: number) =>
    apiClient.delete(`/api/v1/jobs/${jobId}/requirements/${reqId}`),

  getDrives: () => apiClient.get<DriveData[]>("/api/v1/recruiters/me/drives"),

  createDrive: (data: Partial<DriveData>) =>
    apiClient.post<DriveData>("/api/v1/recruiters/me/drives", data),

  updateDrive: (id: number, data: Partial<DriveData>) =>
    apiClient.put<DriveData>(`/api/v1/recruiters/me/drives/${id}`, data),

  deleteDrive: (id: number) =>
    apiClient.delete(`/api/v1/recruiters/me/drives/${id}`),

  getSkills: () => apiClient.get<SkillItem[]>("/api/v1/jobs/skills/all"),

  checkEligibility: (jobId: number, studentId: number) =>
    apiClient.post<any>(`/api/v1/jobs/${jobId}/eligibility/check?student_id=${studentId}`),

  getDriveCandidates: (driveId: number) =>
    apiClient.get<CandidateItem[]>(`/api/v1/drives/${driveId}/candidates`),

  updateCandidateStatus: (
    driveId: number,
    candidateId: number,
    data: {
      shortlist_status?: boolean;
      registration_status?: string;
      candidate_notes?: string;
    }
  ) =>
    apiClient.patch<any>(
      `/api/v1/drives/${driveId}/candidates/${candidateId}`,
      data
    ),

  bulkEvaluateEligibility: (driveId: number) =>
    apiClient.post<{
      drive_id: number;
      drive_name: string;
      total_candidates: number;
      eligible_count: number;
      ineligible_count: number;
      failure_breakdown: Record<string, number>;
    }>(`/api/v1/drives/${driveId}/evaluate-eligibility`),

  getCandidateProfile: (studentId: number) =>
    apiClient.get<any>(`/api/v1/recruiters/candidates/${studentId}`),
};



