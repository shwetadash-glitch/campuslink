import { apiClient } from "./apiClient";

export interface IneligibilityBreakdown {
  backlog_ineligible: number;
  cgpa_ineligible: number;
  both_ineligible: number;
}

export interface CohortMetrics {
  total_students: number;
  eligible_students: number;
  ineligible_students: number;
  ineligibility_breakdown: IneligibilityBreakdown;
}

export interface ParticipationMetrics {
  participating_students: number;
  participation_rate: number;
  gross_applications: number;
  formally_issued_offers: number;
}

export interface PlacementMetrics {
  placed_students: number;
  placement_rate: number;
  unplaced_students: number;
  unplaced_rate: number;
}

export interface PlacementsOutsideBaselineEligibility {
  total_count: number;
  special_clearance_association: string;
  special_clearance_limitation_note: string;
  note: string;
}

export interface StudentLevelPrimaryCompensation {
  placed_students_count: number;
  placed_students_evaluated: number;
  placed_students_with_unspecified_compensation: number;
  highest_ctc: number | null;
  lowest_ctc: number | null;
  average_ctc: number | null;
  median_ctc: number | null;
}

export interface OfferLevelGrossCompensation {
  verified_offers_evaluated: number;
  highest_ctc: number | null;
  lowest_ctc: number | null;
  average_ctc: number | null;
  median_ctc: number | null;
}

export interface OverviewCompensationSummary {
  currency: string;
  unit: string;
  student_level_primary: StudentLevelPrimaryCompensation;
  offer_level_gross: OfferLevelGrossCompensation;
}

export interface InstitutionalOverviewData {
  cohort: CohortMetrics;
  participation: ParticipationMetrics;
  placement: PlacementMetrics;
  placements_outside_baseline_eligibility: PlacementsOutsideBaselineEligibility;
  compensation: OverviewCompensationSummary;
  filters_applied: {
    graduation_year: number | null;
    branch: string | null;
  };
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  conversion_rate: number;
  overall_placement_rate?: number;
}

export interface PlacementFunnelData {
  stages: FunnelStage[];
  filters_applied: {
    graduation_year: number | null;
    branch: string | null;
  };
}

export interface BranchMetrics {
  branch: string;
  total_students: number;
  eligible_students: number;
  participating_students: number;
  participation_rate: number;
  placed_students: number;
  placement_rate: number;
  unplaced_students: number;
  placed_students_with_unspecified_compensation: number;
  highest_ctc: number | null;
  average_ctc: number | null;
  median_ctc: number | null;
}

export interface BranchComparisonData {
  currency: string;
  unit: string;
  graduation_year_filter: number | null;
  branches: BranchMetrics[];
}

export interface YearTrendMetrics {
  graduation_year: number;
  total_students: number;
  eligible_students: number;
  participating_students: number;
  participation_rate: number;
  placed_students: number;
  placement_rate: number;
  unplaced_students: number;
  placed_students_with_unspecified_compensation: number;
  highest_ctc: number | null;
  average_ctc: number | null;
  median_ctc: number | null;
}

export interface AcademicYearTrendsData {
  currency: string;
  unit: string;
  branch_filter: string | null;
  trends: YearTrendMetrics[];
}

export interface DriveMetricsItem {
  id: number;
  name: string;
  company_name: string;
  job_title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  active_candidates_count: number;
  withdrawn_candidates_count: number;
  total_rounds_count: number;
  formally_issued_offers_count: number;
  verified_placed_offers_count: number;
  highest_ctc: number | null;
  average_ctc: number | null;
  median_ctc: number | null;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface DriveMetricsResponse {
  currency: string;
  unit: string;
  data: DriveMetricsItem[];
  pagination: PaginationMeta;
}

export interface DriveRoundBreakdown {
  round_number: number;
  name: string;
  round_type: string;
  status: string;
  capacity: number | null;
  candidates_appeared_or_progressed: number;
}

export interface DriveDetailData {
  drive: {
    id: number;
    name: string;
    company_name: string;
    job_title: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    venue: string;
  };
  candidates_summary: {
    total_applications: number;
    active_candidates: number;
    withdrawn_candidates: number;
    shortlisted_candidates: number;
    interviewing_candidates: number;
    offered_candidates: number;
    rejected_candidates: number;
  };
  rounds_breakdown: DriveRoundBreakdown[];
  offers_summary: {
    total_offers: number;
    formally_issued_count: number;
    by_status: Record<string, number>;
    by_verification_status: Record<string, number>;
  };
  compensation: {
    currency: string;
    unit: string;
    verified_placed_offers_count: number;
    highest_ctc: number | null;
    lowest_ctc: number | null;
    average_ctc: number | null;
    median_ctc: number | null;
  };
}

export interface InterviewMetricsData {
  attendance_tracking: "UNAVAILABLE" | string;
  limitation_note: string;
  scheduled_interviews_count: number;
  candidates_reached_interview_stage_count: number;
  completed_round_evaluations_count: number;
  ai_mock_interviews_completed_count: number;
  ai_mock_interviews_average_score: number | null;
  drive_rounds_breakdown_by_type: Record<string, number>;
  filters_applied: {
    graduation_year: number | null;
    drive_id: number | null;
  };
}

export interface CtcBrackets {
  below_5_lpa: number;
  "5_to_10_lpa": number;
  "10_to_20_lpa": number;
  above_20_lpa: number;
}

export interface CompensationAnalyticsData {
  currency: string;
  unit: string;
  student_level_primary: {
    placed_students_count: number;
    placed_students_with_valid_compensation: number;
    placed_students_with_unspecified_compensation: number;
    highest_ctc: number | null;
    lowest_ctc: number | null;
    average_ctc: number | null;
    median_ctc: number | null;
    brackets: CtcBrackets;
  };
  offer_level_gross: {
    total_verified_offers: number;
    highest_ctc: number | null;
    lowest_ctc: number | null;
    average_ctc: number | null;
    median_ctc: number | null;
    brackets: CtcBrackets;
  };
  exclusions: {
    unverified_or_pending_offers_excluded_count: number;
    non_accepted_or_joined_offers_excluded_count: number;
    zero_or_null_ctc_offers_excluded_count: number;
  };
  filters_applied: {
    graduation_year: number | null;
    branch: string | null;
  };
}

interface ApiResponseWrapper<T> {
  status: string;
  data: T;
  message?: string;
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

const BASE_PATH = "/api/v1/tpo/analytics";

export const analyticsApi = {
  getOverview: async (params?: { graduation_year?: number; branch?: string }): Promise<InstitutionalOverviewData> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<InstitutionalOverviewData>>(`${BASE_PATH}/overview${qs}`);
    return res.data;
  },

  getFunnel: async (params?: { graduation_year?: number; branch?: string }): Promise<PlacementFunnelData> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<PlacementFunnelData>>(`${BASE_PATH}/funnel${qs}`);
    return res.data;
  },

  getBranchComparison: async (params?: { graduation_year?: number }): Promise<BranchComparisonData> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<BranchComparisonData>>(`${BASE_PATH}/branch-comparison${qs}`);
    return res.data;
  },

  getTrends: async (params?: { branch?: string }): Promise<AcademicYearTrendsData> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<AcademicYearTrendsData>>(`${BASE_PATH}/trends${qs}`);
    return res.data;
  },

  getDrives: async (params?: {
    graduation_year?: number;
    status?: string;
    per_page?: number;
    page?: number;
  }): Promise<DriveMetricsResponse> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<DriveMetricsResponse>>(`${BASE_PATH}/drives${qs}`);
    return res.data;
  },

  getDriveDetail: async (id: number): Promise<DriveDetailData> => {
    const res = await apiClient.get<ApiResponseWrapper<DriveDetailData>>(`${BASE_PATH}/drives/${id}`);
    return res.data;
  },

  getInterviews: async (params?: { graduation_year?: number; drive_id?: number }): Promise<InterviewMetricsData> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<InterviewMetricsData>>(`${BASE_PATH}/interviews${qs}`);
    return res.data;
  },

  getCompensation: async (params?: { graduation_year?: number; branch?: string }): Promise<CompensationAnalyticsData> => {
    const qs = buildQueryString(params || {});
    const res = await apiClient.get<ApiResponseWrapper<CompensationAnalyticsData>>(`${BASE_PATH}/compensation${qs}`);
    return res.data;
  },
};
