export interface AcademicHistoryItem {
  id: number;
  qualification: string;
  institution: string;
  specialization?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  score_value: number;
  score_type: string;
}

export interface StudentSkillItem {
  id: number;
  skill_id: number;
  skill_name: string;
  proficiency_level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  months_experience: number;
  source: string;
}

export interface StudentProjectItem {
  id: number;
  title: string;
  description?: string | null;
  technologies?: string | null;
  project_url?: string | null;
}

export interface StudentCertificationItem {
  id: number;
  name: string;
  issuing_org: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_id?: string | null;
  proof_path?: string | null;
}

export interface StudentAssessmentItem {
  id: number;
  assessment_type: string;
  score: number;
  max_score: number;
  assessment_date: string;
  metadata_json?: Record<string, any> | null;
}

export interface BasicInfo {
  id: number;
  user_id: number;
  student_identifier: string;
  first_name?: string | null;
  last_name?: string | null;
  branch?: string | null;
  graduation_year?: number | null;
  cgpa?: number | null;
  backlogs_current?: number | null;
  backlogs_history?: number | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  resume_url?: string | null;
  profile_picture_url?: string | null;
  profile_metadata?: {
    bio?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    preferred_job_roles?: string[];
    career_interests?: string[];
  } | null;
}

export interface CompletenessData {
  percentage: number;
  completed_sections: string[];
  missing_sections: string[];
}

export interface FullProfileData {
  basic_info: BasicInfo;
  academic_history: AcademicHistoryItem[];
  skills: StudentSkillItem[];
  projects: StudentProjectItem[];
  certifications: StudentCertificationItem[];
  assessments: StudentAssessmentItem[];
  completeness: CompletenessData;
}
