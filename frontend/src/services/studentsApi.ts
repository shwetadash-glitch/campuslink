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

  // Milestone 3: Student Placement Journey
  getPlacementDashboard: () =>
    apiClient.get<{
      status: string;
      student: {
        id: number;
        student_identifier: string;
        first_name: string;
        last_name: string;
        branch: string;
        cgpa: number;
        backlogs_current: number;
        graduation_year: number;
      };
      placement_summary: {
        overall_status: string;
        registered_drives_count: number;
        active_interviews_count: number;
        pending_offers_count: number;
        accepted_offers_count: number;
      };
      action_items: Array<{
        type: string;
        priority: string;
        title: string;
        description: string;
        offer_id?: number;
        start_time?: string;
        venue?: string;
      }>;
      upcoming_schedules: any[];
      active_applications: Array<{
        candidate_id: number;
        drive_id: number;
        drive_name: string;
        company_name: string;
        job_title: string;
        current_status: string;
        current_round_number: number;
        round_results: any;
        registered_at: string;
        status_history: Array<{
          from: string | null;
          to: string;
          reason: string | null;
          timestamp: string;
        }>;
      }>;
      offers: any[];
    }>("/api/v1/students/me/placement-dashboard"),

  getJourneyAvailableDrives: () =>
    apiClient.get<{
      status: string;
      drives: Array<{
        drive_id: number;
        drive_name: string;
        company_name: string;
        company_id: number;
        job_id: number;
        job_title: string;
        start_date: string | null;
        end_date: string | null;
        venue: string | null;
        drive_type: string;
        drive_status: string;
        registration_deadline: string | null;
        is_eligible: boolean;
        eligibility_reasons: string[];
        is_registered: boolean;
        candidate_status: string | null;
        candidate_id: number | null;
        can_register: boolean;
      }>;
    }>("/api/v1/students/me/available-drives"),

  registerForDriveJourney: (driveId: number) =>
    apiClient.post<{
      status: string;
      message: string;
      candidate: any;
    }>(`/api/v1/students/me/drives/${driveId}/register`, {}),

  withdrawFromDriveJourney: (driveId: number, reason?: string) =>
    apiClient.post<{
      status: string;
      message: string;
      candidate: any;
    }>(`/api/v1/students/me/drives/${driveId}/withdraw`, { reason }),

  getOffers: () =>
    apiClient.get<{
      status: string;
      offers: any[];
    }>("/api/v1/students/me/offers"),

  acceptOffer: (offerId: number, notes?: string) =>
    apiClient.post<{
      status: string;
      message: string;
      offer: any;
    }>(`/api/v1/students/me/offers/${offerId}/accept`, { notes }),

  rejectOffer: (offerId: number, rejection_reason: string) =>
    apiClient.post<{
      status: string;
      message: string;
      offer: any;
    }>(`/api/v1/students/me/offers/${offerId}/reject`, { rejection_reason }),

  confirmJoining: (offerId: number, joining_date?: string, notes?: string) =>
    apiClient.post<{
      status: string;
      message: string;
      offer: any;
    }>(`/api/v1/students/me/offers/${offerId}/confirm-joining`, { joining_date, notes }),
};
