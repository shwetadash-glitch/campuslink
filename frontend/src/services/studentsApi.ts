import { apiClient } from "./apiClient";
import {
  FullProfileData,
  BasicInfo,
  AcademicHistoryItem,
  StudentSkillItem,
  StudentProjectItem,
  StudentCertificationItem,
} from "@/features/students/types";

export const studentsApi = {
  getProfile: () => apiClient.get<FullProfileData>("/api/v1/students/me/full"),

  updateBasicInfo: (data: Partial<BasicInfo>) =>
    apiClient.put<BasicInfo>("/api/v1/students/me", data),

  updateLinks: (metadata: BasicInfo["profile_metadata"]) =>
    apiClient.patch<BasicInfo>("/api/v1/students/me/links", {
      profile_metadata: metadata,
    }),

  createAcademicHistory: (data: Omit<AcademicHistoryItem, "id">) =>
    apiClient.post<AcademicHistoryItem>("/api/v1/students/me/academic", data),

  updateAcademicHistory: (id: number, data: Partial<AcademicHistoryItem>) =>
    apiClient.put<AcademicHistoryItem>(`/api/v1/students/me/academic/${id}`, data),

  deleteAcademicHistory: (id: number) =>
    apiClient.delete(`/api/v1/students/me/academic/${id}`),

  createSkill: (data: {
    skill_name: string;
    proficiency_level: string;
    months_experience: number;
    source?: string;
  }) => apiClient.post<StudentSkillItem>("/api/v1/students/me/skills", data),

  updateSkill: (
    id: number,
    data: {
      skill_name?: string;
      proficiency_level?: string;
      months_experience?: number;
      source?: string;
    }
  ) => apiClient.put<StudentSkillItem>(`/api/v1/students/me/skills/${id}`, data),

  deleteSkill: (id: number) =>
    apiClient.delete(`/api/v1/students/me/skills/${id}`),

  createProject: (data: Omit<StudentProjectItem, "id">) =>
    apiClient.post<StudentProjectItem>("/api/v1/students/me/projects", data),

  updateProject: (id: number, data: Partial<StudentProjectItem>) =>
    apiClient.put<StudentProjectItem>(`/api/v1/students/me/projects/${id}`, data),

  deleteProject: (id: number) =>
    apiClient.delete(`/api/v1/students/me/projects/${id}`),

  createCertification: (data: FormData | Omit<StudentCertificationItem, "id">) =>
    apiClient.post<StudentCertificationItem>("/api/v1/students/me/certifications", data),

  updateCertification: (id: number, data: FormData | Partial<StudentCertificationItem>) =>
    apiClient.put<StudentCertificationItem>(
      `/api/v1/students/me/certifications/${id}`,
      data
    ),

  deleteCertification: (id: number) =>
    apiClient.delete(`/api/v1/students/me/certifications/${id}`),

  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<{ resume_url: string }>("/api/v1/students/me/resume", formData);
  },

  // Student Opportunity Discovery & Placement Drives
  getAvailableJobs: () => apiClient.get<any[]>("/api/v1/jobs/available"),

  checkMyJobEligibility: (jobId: number) =>
    apiClient.get<{
      eligible: boolean;
      reasons: string[];
      failed_rules: string[];
      job_id: number;
      job_title: string;
      student_cgpa: number;
      student_backlogs: number;
      student_branch: string;
      student_graduation_year: number;
    }>(`/api/v1/jobs/${jobId}/my-eligibility`),

  getAvailableDrives: () => apiClient.get<any[]>("/api/v1/drives/available"),

  registerForDrive: (driveId: number, studentId: number) =>
    apiClient.post<any>(`/api/v1/drives/${driveId}/candidates`, {
      student_id: studentId,
    }),

  getMyRegisteredDrives: () =>
    apiClient.get<any[]>("/api/v1/students/me/drives"),

  applyToJob: (jobId: number) =>
    apiClient.post<{ message: string; application_id: number; status: string }>(
      `/api/v1/jobs/${jobId}/apply`
    ),

  withdrawDrive: (driveId: number) =>
    apiClient.post<{ message: string; drive_id: number }>(
      `/api/v1/drives/${driveId}/withdraw`
    ),
};
