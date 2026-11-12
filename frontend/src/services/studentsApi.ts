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

  // Milestone: Interactive Technical Quiz Assessment (Connecting TPO & Student)
  getTechnicalQuiz: (driveId: number) =>
    apiClient.get<{
      drive_id: number;
      drive_name: string;
      company_name: string;
      job_title: string;
      duration_minutes: number;
      passing_cutoff: number;
      total_questions: number;
      skills_evaluated: string[];
      questions: Array<{
        id: string;
        skill: string;
        difficulty: string;
        question: string;
        options: Record<string, string>;
      }>;
    }>(`/api/v1/students/me/drives/${driveId}/technical-quiz`),

  submitTechnicalQuiz: (driveId: number, answers: Record<string, string>, tab_switches?: number, disqualified?: boolean) =>
    apiClient.post<{
      success: boolean;
      status: "CLEARED" | "FAILED" | "DISQUALIFIED";
      score: number;
      raw_score?: number;
      is_disqualified?: boolean;
      tab_switches?: number;
      disqualification_reason?: string;
      correct_answers: number;
      total_questions: number;
      passing_cutoff: number;
      skill_breakdown: Record<string, number>;
      message: string;
    }>(`/api/v1/students/me/drives/${driveId}/submit-quiz`, { answers, tab_switches, disqualified }),

  // Milestone: Interactive Group Discussion Video Room & Multi-Candidate AI Evaluation
  getGdSession: (driveId: number) =>
    apiClient.get<{
      status: string;
      session: {
        drive_id: number;
        drive_name: string;
        company_name: string;
        job_title: string;
        group_panel: {
          panel_id: string;
          panel_name: string;
          created_by: string;
          duration_minutes: number;
          topic: {
            topic_id: string;
            title: string;
            description: string;
            key_evaluation_points: string[];
          };
        };
        rubrics: Array<{
          key: string;
          name: string;
          max: number;
          weight: string;
          description: string;
        }>;
        candidate: {
          id: number;
          student_identifier: string;
          name: string;
          email: string;
          branch: string;
          role: string;
        };
        peers: Array<{
          id: string;
          student_identifier: string;
          name: string;
          branch: string;
          role: string;
          avatar_url: string;
          color: string;
          perspective: string;
          sample_points: string[];
        }>;
        existing_evaluation?: any;
      };
    }>(`/api/v1/students/me/drives/${driveId}/gd-session`),

  submitGdSession: (
    driveId: number,
    data: {
      topic?: string;
      clarity_and_fluency: number;
      active_listening: number;
      body_language: number;
      topic_knowledge: number;
      creativity_and_perspectivity: number;
      speaking_duration_seconds?: number;
      speech_transcript?: string;
      remarks?: string;
    }
  ) =>
    apiClient.post<{
      status: string;
      result: {
        success: boolean;
        status: "CLEARED" | "WAITLISTED";
        overall_score: number;
        passing_cutoff: number;
        decision: "SELECTED" | "WAITLISTED";
        rubrics: Record<
          string,
          {
            score: number;
            max: number;
            label: string;
          }
        >;
        remarks: string;
        peer_evaluations: Array<{
          student_identifier: string;
          name: string;
          branch: string;
          scores: Record<string, number>;
          overall_score: number;
          decision: string;
          feedback: string;
        }>;
        next_stage: string;
        interview_unlocked: boolean;
        message: string;
      };
    }>(`/api/v1/students/me/drives/${driveId}/submit-gd`, data),

  // Student Peer Discovery & Group Discussion Panel (Friends vs Random Matching)
  getPeers: (search?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (limit) params.append("limit", String(limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{
      status: string;
      peers: PeerStudent[];
      total: number;
    }>(`/api/v1/students/me/peers${qs}`);
  },

  getRandomPeers: (count: number = 3) =>
    apiClient.get<{
      status: string;
      peers: PeerStudent[];
    }>(`/api/v1/students/me/peers/random?count=${count}`),

  configureGdPanel: (payload: {
    mode: "FRIENDS" | "RANDOM";
    peer_ids?: number[];
    scenario_id?: number;
    drive_id?: number;
    topic_title?: string;
  }) =>
    apiClient.post<GdPanelConfigResponse>(
      "/api/v1/students/me/group-discussions/panel",
      payload
    ),

  submitGdEvaluation: (payload: {
    scenario_id?: number;
    drive_id?: number;
    topic: string;
    clarity_and_fluency: number;
    active_listening: number;
    body_language: number;
    topic_knowledge: number;
    creativity_and_perspectivity: number;
    speaking_duration_seconds?: number;
    speech_transcript?: string;
    remarks?: string;
  }) =>
    apiClient.post<{
      status: string;
      message: string;
      result: {
        overall_score: number;
        decision: "SELECTED" | "WAITLISTED";
        grade_tier: string;
        grade_label: string;
        scores: Record<string, number>;
        remarks: string;
        strengths: string[];
        areas_to_improve: string[];
        session?: any;
      };
    }>("/api/v1/students/me/group-discussions/submit", payload),
};

export interface PeerStudent {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  student_identifier: string;
  branch: string;
  graduation_year?: number;
  email?: string;
  avatar_url: string;
  color: string;
  role: string;
  mode_badge?: string;
  perspective?: string;
  sample_points?: string[];
}

export interface DialogueTurn {
  peerId: string;
  name: string;
  color?: string;
  avatar?: string;
  text: string;
  duration?: number;
  isUser?: boolean;
}

export interface GdPanelConfigResponse {
  status: string;
  mode: "FRIENDS" | "RANDOM";
  panel_id: string;
  panel_name: string;
  topic: {
    id?: number;
    title: string;
    description: string;
    target_audience?: string;
    key_evaluation_points?: string[];
  };
  candidate: {
    id: number;
    name: string;
    branch: string;
    student_identifier: string;
    role: string;
  };
  peers: PeerStudent[];
  dialogue_turns: DialogueTurn[];
  rubrics: Array<{
    key: string;
    name: string;
    max: number;
    weight: string;
    description: string;
  }>;
}
