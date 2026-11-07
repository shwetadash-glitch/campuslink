"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  analyticsApi,
  InstitutionalOverviewData,
  PlacementFunnelData,
  BranchComparisonData,
  AcademicYearTrendsData,
  DriveMetricsResponse,
  InterviewMetricsData,
  CompensationAnalyticsData,
} from "@/services/analyticsApi";
import { AnalyticsFilterBar } from "@/features/analytics/AnalyticsFilterBar";
import { AnalyticsKpiGrid } from "@/features/analytics/AnalyticsKpiGrid";
import { PlacementFunnelSection } from "@/features/analytics/PlacementFunnelSection";
import { BranchComparisonSection } from "@/features/analytics/BranchComparisonSection";
import { AcademicYearTrendsSection } from "@/features/analytics/AcademicYearTrendsSection";
import { CompensationAnalyticsSection } from "@/features/analytics/CompensationAnalyticsSection";
import { InterviewMetricsSection } from "@/features/analytics/InterviewMetricsSection";
import { DriveAnalyticsSection } from "@/features/analytics/DriveAnalyticsSection";
import { Button } from "@/components/ui/Button";

type AnalyticsTab = "overview" | "departments" | "compensation" | "operations" | "all";

export default function InstitutionalAnalyticsPage() {
  // Coordinated Filter State
  const [graduationYear, setGraduationYear] = useState<number | undefined>(undefined);
  const [branch, setBranch] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Drive Listing Pagination & Filter
  const [driveStatusFilter, setDriveStatusFilter] = useState<string | undefined>(undefined);
  const [drivePage, setDrivePage] = useState<number>(1);

  // Telemetry Data State
  const [overview, setOverview] = useState<InstitutionalOverviewData | null>(null);
  const [funnel, setFunnel] = useState<PlacementFunnelData | null>(null);
  const [branchComp, setBranchComp] = useState<BranchComparisonData | null>(null);
  const [trends, setTrends] = useState<AcademicYearTrendsData | null>(null);
  const [drives, setDrives] = useState<DriveMetricsResponse | null>(null);
  const [interviews, setInterviews] = useState<InterviewMetricsData | null>(null);
  const [compensation, setCompensation] = useState<CompensationAnalyticsData | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Race condition guard: track latest request sequence
  const latestRequestIdRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    const currentRequestId = ++latestRequestIdRef.current;

    const filterParams = {
      graduation_year: graduationYear,
      branch: branch,
    };

    Promise.resolve()
      .then(() => {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        return Promise.all([
          analyticsApi.getOverview(filterParams),
          analyticsApi.getFunnel(filterParams),
          analyticsApi.getBranchComparison({ graduation_year: graduationYear }),
          analyticsApi.getTrends({ branch: branch }),
          analyticsApi.getDrives({
            graduation_year: graduationYear,
            status: driveStatusFilter,
            page: drivePage,
            per_page: 10,
          }),
          analyticsApi.getInterviews({ graduation_year: graduationYear }),
          analyticsApi.getCompensation(filterParams),
        ]);
      })
      .then(([overviewRes, funnelRes, branchRes, trendsRes, drivesRes, interviewsRes, compRes]) => {
        if (!isMounted || currentRequestId !== latestRequestIdRef.current) {
          return;
        }
        setOverview(overviewRes);
        setFunnel(funnelRes);
        setBranchComp(branchRes);
        setTrends(trendsRes);
        setDrives(drivesRes);
        setInterviews(interviewsRes);
        setCompensation(compRes);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted || currentRequestId !== latestRequestIdRef.current) {
          return;
        }
        const msg = err instanceof Error ? err.message : "Failed to load institutional analytics telemetry.";
        console.error("Institutional Analytics Fetch Error:", err);
        setError(msg);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [graduationYear, branch, driveStatusFilter, drivePage, refreshTrigger]);

  const handleFilterChange = (filters: { graduationYear?: number; branch?: string }) => {
    setGraduationYear(filters.graduationYear);
    setBranch(filters.branch);
    setDrivePage(1); // Reset pagination on filter change
  };

  const handleDriveStatusChange = (status: string | undefined) => {
    setDriveStatusFilter(status);
    setDrivePage(1);
  };

  const handleManualRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Derive actual years and departments from loaded database telemetry
  const dynamicYears = useMemo(() => {
    if (!trends || !trends.trends) return undefined;
    const yrs = trends.trends.map((t) => t.graduation_year);
    return yrs.length > 0 ? yrs : undefined;
  }, [trends]);

  const dynamicBranches = useMemo(() => {
    if (!branchComp || !branchComp.branches) return undefined;
    const brs = branchComp.branches.map((b) => b.branch);
    return brs.length > 0 ? brs : undefined;
  }, [branchComp]);

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title="Institutional Placement Analytics"
        description="Authoritative placement telemetry, baseline cohort conversion, and verified compensation analytics."
        actionLabel="Print Report"
        onAction={() => window.print()}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filter Bar with dynamically discovered options from database */}
        <AnalyticsFilterBar
          graduationYear={graduationYear}
          branch={branch}
          availableYears={dynamicYears}
          availableBranches={dynamicBranches}
          onFilterChange={handleFilterChange}
          onRefresh={handleManualRefresh}
          isLoading={loading}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-serif">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleManualRefresh} className="text-2xs text-red-700 border-red-300">
              Retry
            </Button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-campusblue-200">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "border-campusblue-800 text-campusblue-900"
                  : "border-transparent text-campusblue-600 hover:text-campusblue-800"
              }`}
            >
              Overview &amp; Funnel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("departments")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "departments"
                  ? "border-campusblue-800 text-campusblue-900"
                  : "border-transparent text-campusblue-600 hover:text-campusblue-800"
              }`}
            >
              Departments &amp; Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compensation")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "compensation"
                  ? "border-campusblue-800 text-campusblue-900"
                  : "border-transparent text-campusblue-600 hover:text-campusblue-800"
              }`}
            >
              Verified Compensation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("operations")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "operations"
                  ? "border-campusblue-800 text-campusblue-900"
                  : "border-transparent text-campusblue-600 hover:text-campusblue-800"
              }`}
            >
              Interviews &amp; Drives
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "border-campusblue-800 text-campusblue-900"
                  : "border-transparent text-campusblue-600 hover:text-campusblue-800"
              }`}
            >
              Comprehensive View (All)
            </button>
          </nav>
        </div>

        {/* Tab Content Panes */}

        {/* Tab 1: Overview & Funnel */}
        {(activeTab === "overview" || activeTab === "all") && (
          <div className="space-y-6">
            <AnalyticsKpiGrid overview={overview} isLoading={loading} />
            <PlacementFunnelSection funnelData={funnel} isLoading={loading} />
          </div>
        )}

        {/* Tab 2: Departments & Trends */}
        {(activeTab === "departments" || activeTab === "all") && (
          <div className="space-y-6">
            <BranchComparisonSection comparisonData={branchComp} isLoading={loading} />
            <AcademicYearTrendsSection trendsData={trends} isLoading={loading} />
          </div>
        )}

        {/* Tab 3: Compensation */}
        {(activeTab === "compensation" || activeTab === "all") && (
          <div className="space-y-6">
            <CompensationAnalyticsSection compensationData={compensation} isLoading={loading} />
          </div>
        )}

        {/* Tab 4: Operations (Interviews & Drives) */}
        {(activeTab === "operations" || activeTab === "all") && (
          <div className="space-y-6">
            <InterviewMetricsSection interviewData={interviews} isLoading={loading} />
            <DriveAnalyticsSection
              drivesData={drives}
              isLoading={loading}
              statusFilter={driveStatusFilter}
              onStatusFilterChange={handleDriveStatusChange}
              page={drivePage}
              onPageChange={setDrivePage}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
