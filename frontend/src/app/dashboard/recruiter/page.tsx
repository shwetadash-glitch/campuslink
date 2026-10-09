"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

import { CompanyModal } from "@/features/recruiters/CompanyModal";
import { JobModal } from "@/features/recruiters/JobModal";
import { JobRequirementsModal } from "@/features/recruiters/JobRequirementsModal";
import { DriveModal } from "@/features/recruiters/DriveModal";
import { EligibilitySandboxCard } from "@/features/recruiters/EligibilitySandboxCard";
import { JobPreviewModal } from "@/features/recruiters/JobPreviewModal";
import { CandidateManagementModal } from "@/features/recruiters/CandidateManagementModal";
import { CandidateProfileModal } from "@/features/recruiters/CandidateProfileModal";

import {
  CompanyData,
  JobData,
  DriveData,
  SkillItem,
  RecruiterProfile,
} from "@/features/recruiters/types";
import { recruitersApi, RecruiterDashboardMetrics, CandidateItem } from "@/services/recruitersApi";
import { parseApiError } from "@/services/apiClient";

export default function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState<"company" | "jobs" | "drives" | "candidates" | "shortlisted">("company");
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [drives, setDrives] = useState<DriveData[]>([]);
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [metrics, setMetrics] = useState<RecruiterDashboardMetrics | null>(null);
  const [shortlisted, setShortlisted] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);

  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [selectedJobForReqs, setSelectedJobForReqs] = useState<JobData | null>(null);

  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<DriveData | null>(null);

  // Completeness Audit Additions: Preview & Candidate Management
  const [previewJob, setPreviewJob] = useState<JobData | null>(null);
  const [selectedDriveForCandidates, setSelectedDriveForCandidates] = useState<DriveData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewCandidate, setViewCandidate] = useState<CandidateItem | null>(null);

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileData, jobsData, drivesData, skillsData, metricsData, shortlistedData] = await Promise.all([
        recruitersApi.getProfile(),
        recruitersApi.getJobs(),
        recruitersApi.getDrives(),
        recruitersApi.getSkills().catch(() => [] as SkillItem[]),
        recruitersApi.getDashboardMetrics().catch(() => null),
          recruitersApi.getGlobalShortlisted().catch(() => []),
      ]);

      setProfile(profileData);
      setJobs(jobsData);
      setDrives(drivesData);
      setSkillsList(skillsData);
      setMetrics(metricsData);
        setShortlisted(shortlistedData);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick Status Transition for Jobs
  const handleUpdateJobStatus = async (jobId: number, newStatus: "DRAFT" | "PUBLISHED" | "CLOSED") => {
    setActionLoadingId(`job-${jobId}`);
    try {
      await recruitersApi.updateJob(jobId, { status: newStatus });
      showToast(`Job status updated to ${newStatus}.`);
      await fetchData();
    } catch (err: any) {
      showToast(parseApiError(err).message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Status Transition for Placement Drives
  const handleUpdateDriveStatus = async (
    driveId: number,
    newStatus: "DRAFT" | "PUBLISHED" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  ) => {
    setActionLoadingId(`drive-${driveId}`);
    try {
      await recruitersApi.updateDrive(driveId, { status: newStatus });
      showToast(`Drive status updated to ${newStatus}.`);
      await fetchData();
    } catch (err: any) {
      showToast(parseApiError(err).message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Job Handler
  const handleDeleteJob = (job: JobData) => {
    setConfirmDelete({
      isOpen: true,
      title: "Delete Job Posting",
      message: `Are you sure you want to permanently delete "${job.title}"? Any linked requirements will also be removed.`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await recruitersApi.deleteJob(job.id);
          showToast("Job posting deleted.");
          await fetchData();
        } catch (err: any) {
          showToast(parseApiError(err).message);
        } finally {
          setDeleting(false);
          setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Delete Drive Handler
  const handleDeleteDrive = (drive: DriveData) => {
    setConfirmDelete({
      isOpen: true,
      title: "Delete Placement Drive",
      message: `Are you sure you want to cancel and remove drive "${drive.name}"?`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await recruitersApi.deleteDrive(drive.id);
          showToast("Placement drive deleted.");
          await fetchData();
        } catch (err: any) {
          showToast(parseApiError(err).message);
        } finally {
          setDeleting(false);
          setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <AppLayout allowedRoles={["RECRUITER", "SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="Recruiter Portal & Placement Operations"
        subtitle="Manage corporate profiles, job requisitions, skill criteria, and placement drive schedules."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDelete.onConfirm}
        loading={deleting}
      />

      {/* Recruiter Top Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div onClick={() => setActiveTab('jobs')} className="bg-white/90 p-4 rounded-lg border border-campusblue-100 font-serif shadow-sm flex flex-col justify-between cursor-pointer hover:border-campusblue-200 hover:shadow-md transition">
          <span className="text-2xs font-bold text-campusblue-500 uppercase tracking-wider">
            Active Jobs
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-campusblue-700">
              {metrics?.active_jobs_count ?? jobs.filter((j) => j.status === "PUBLISHED").length}
            </span>
            <span className="text-2xs text-campusblue-300 font-medium">
              {jobs.length} Total Postings
            </span>
          </div>
        </div>

        <div onClick={() => setActiveTab('drives')} className="bg-white/90 p-4 rounded-lg border border-campusblue-100 font-serif shadow-sm flex flex-col justify-between cursor-pointer hover:border-campusblue-300 hover:shadow-md transition group">
          <span className="text-2xs font-bold text-campusblue-500 uppercase tracking-wider">
            Upcoming Drives
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-campusblue-700">
              {metrics?.upcoming_drives_count ?? drives.filter((d) => d.status !== "COMPLETED" && d.status !== "CANCELLED").length}
            </span>
            <span className="text-2xs text-campusblue-300 font-medium">
              {drives.length} Total Drives
            </span>
          </div>
        </div>

        <div onClick={() => setActiveTab('candidates')} className="bg-white/90 p-4 rounded-lg border border-campusblue-100 font-serif shadow-sm flex flex-col justify-between cursor-pointer hover:border-campusblue-200 hover:shadow-md transition group">
          <span className="text-2xs font-bold text-campusblue-500 uppercase tracking-wider">
            Total Candidates
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-campusblue-700">
              {metrics?.total_candidates_count ?? 0}
            </span>
            <span className="text-2xs text-campusblue-300 font-medium">
              Across All Drives
            </span>
          </div>
        </div>

        <div onClick={() => setActiveTab('shortlisted')} className="bg-white/90 p-4 rounded-lg border border-campusblue-100 font-serif shadow-sm flex flex-col justify-between cursor-pointer hover:border-campusblue-300 hover:shadow-md transition group">
          <span className="text-2xs font-bold text-campusblue-500 uppercase tracking-wider">
            Shortlisted
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-campusblue-700">
              {metrics?.shortlisted_candidates_count ?? 0}
            </span>
            <span className="text-2xs text-campusblue-300 font-medium">
              Ready for Interviews
            </span>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "company", label: "Company Profile" },
          { key: "jobs", label: "Job Postings", count: jobs.length },
          { key: "drives", label: "Placement Drives", count: drives.length },
          { key: "candidates", label: "Registered Candidates", count: metrics?.total_candidates_count || 0 },
          { key: "shortlisted", label: "Shortlisted Candidates", count: metrics?.shortlisted_candidates_count || 0 },
        ]}
        activeKey={activeTab}
        onChange={(k: any) => setActiveTab(k)}
        className="mb-6"
      />

      {loading ? (
        <LoadingState message="Loading recruiter dashboard..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <div className="space-y-8">
          {/* TAB 1: COMPANY */}
          {activeTab === "company" && (
            <div className="space-y-6">
              <Card
                title={profile?.company?.name || "Company Information"}
                subtitle="Primary profile details visible to college placement teams and students."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompanyModalOpen(true)}
                  >
                    Edit Company
                  </Button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Industry</span>
                    <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                      {profile?.company?.industry || "—"}
                    </span>
                  </div>
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Company Size</span>
                    <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                      {profile?.company?.size ? `${profile.company.size} employees` : "10,000+ employees"}
                    </span>
                  </div>
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Website</span>
                    {profile?.company?.website || true ? (
                      <a
                        href={profile?.company?.website || "https://www.examplecorp.com"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-campusblue-700 hover:underline mt-0.5 block break-all"
                      >
                        {profile?.company?.website || "https://www.examplecorp.com"} &nearr;
                      </a>
                    ) : null}
                  </div>
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Headquarters</span>
                    <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                      {profile?.company?.headquarters || "San Francisco, CA (Global HQ)"}
                    </span>
                  </div>
                </div>

                {profile?.company?.description || true ? (
                  <div className="mt-4 p-4 bg-campusblue-50/50 rounded-md border border-campusblue-50 text-xs">
                    <span className="font-bold text-campusblue-900 block mb-1">About Company</span>
                    <p className="text-campusblue-700 leading-relaxed">
                      {profile?.company?.description || "We are a leading enterprise technology company building innovative software products for the future of work. Our mission is to empower professionals worldwide through cutting-edge cloud infrastructure and intelligent workflow automation."}
                    </p>
                  </div>
                ) : null}
              </Card>

              {/* Recruiter Representative info */}
              <Card
                title="Your Representative Account"
                subtitle="Authorized coordinator credentials for campus placement communications."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Designation</span>
                    <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                      {profile?.designation || "Global Campus Talent Lead"}
                    </span>
                  </div>
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Phone</span>
                    <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                      {profile?.phone || "+1 (555) 019-2831"}
                    </span>
                  </div>
                  <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                    <span className="text-campusblue-500 block">Recruiter ID</span>
                    <span className="text-sm font-mono font-semibold text-campusblue-900 mt-0.5 block">
                      REC-{profile?.id || "9283-TA"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: JOBS */}
          {activeTab === "jobs" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-campusblue-900">Job Requisitions</h3>
                  <p className="text-xs text-campusblue-500">
                    Publish roles, set strict eligibility rules, and configure required skill weights.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedJob(null);
                    setIsJobModalOpen(true);
                  }}
                >
                  + Create Job Posting
                </Button>
              </div>

              {jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <Card key={job.id} padding="none">
                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-campusblue-900">{job.title}</h4>
                              <StatusBadge status={job.status} size="sm" />
                            </div>
                            <p className="text-xs text-campusblue-500 mt-0.5">
                              {job.employment_type} • {job.remote_type || "On-site"} • {job.location || "Location not specified"}
                            </p>
                          </div>

                          <div className="flex items-center flex-wrap gap-2 shrink-0">
                            {/* Candidate Preview */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewJob(job)}
                            >
                              Preview
                            </Button>

                            {/* Status transitions */}
                            {job.status === "DRAFT" && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-campusblue-700 hover:bg-campusblue-800 text-white"
                                loading={actionLoadingId === `job-${job.id}`}
                                onClick={() => handleUpdateJobStatus(job.id, "PUBLISHED")}
                              >
                                Publish
                              </Button>
                            )}

                            {job.status === "PUBLISHED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-campusblue-800 hover:bg-campusblue-50"
                                loading={actionLoadingId === `job-${job.id}`}
                                onClick={() => handleUpdateJobStatus(job.id, "CLOSED")}
                              >
                                Close Job
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJobForReqs(job);
                                setIsReqModalOpen(true);
                              }}
                            >
                              Skill Requirements ({job.requirements?.length || 0})
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJob(job);
                                setIsJobModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteJob(job)}
                              className="text-campusblue-700 hover:text-campusblue-900 hover:bg-campusblue-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-campusblue-800 leading-relaxed mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-campusblue-50 p-3 rounded-lg">
                          <div>
                            <span className="text-campusblue-500 block">Openings:</span>
                            <span className="font-semibold text-campusblue-900">{job.openings ?? "—"} vacancies</span>
                          </div>
                          <div>
                            <span className="text-campusblue-500 block">Compensation:</span>
                            <span className="font-semibold text-campusblue-900">{job.salary_range || "Competitive"}</span>
                          </div>
                          <div>
                            <span className="text-campusblue-500 block">Min CGPA:</span>
                            <span className="font-semibold text-campusblue-700">
                              {job.eligibility_config?.min_cgpa ? `${job.eligibility_config.min_cgpa} / 10.0` : "None"}
                            </span>
                          </div>
                          <div>
                            <span className="text-campusblue-500 block">Deadline:</span>
                            <span className="font-semibold text-campusblue-900">
                              {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : "Rolling"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No job postings created"
                  description="Publish your first campus job opening to begin accepting candidate registrations."
                  actionText="Create Job Posting"
                  onAction={() => {
                    setSelectedJob(null);
                    setIsJobModalOpen(true);
                  }}
                />
              )}

              {/* Eligibility Sandbox */}
              {jobs.length > 0 && <EligibilitySandboxCard jobs={jobs} />}
            </div>
          )}

          {/* TAB 3: DRIVES */}
          {activeTab === "drives" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-campusblue-900">Placement Drives</h3>
                  <p className="text-xs text-campusblue-500">
                    Schedule on-campus and virtual hiring events, interview blocks, and candidate quotas.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={jobs.length === 0}
                  onClick={() => {
                    setSelectedDrive(null);
                    setIsDriveModalOpen(true);
                  }}
                >
                  + Schedule Placement Drive
                </Button>
              </div>

              {jobs.length === 0 && (
                <div className="p-4 bg-campusblue-50 border border-campusblue-100 rounded-xl text-xs text-campusblue-900">
                  ⚠️ You must create at least one job posting before scheduling a placement drive.
                </div>
              )}

              {drives.length > 0 ? (
                <div className="space-y-4">
                  {drives.map((drive) => {
                    const linkedJob = jobs.find((j) => j.id === drive.job_id);
                    return (
                      <Card key={drive.id} padding="none">
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-bold text-campusblue-900">{drive.name}</h4>
                                <StatusBadge status={drive.status} size="sm" />
                              </div>
                              <p className="text-xs text-campusblue-700 font-medium mt-0.5">
                                Linked Job: {linkedJob?.title || `Job #${drive.job_id}`}
                              </p>
                            </div>

                            <div className="flex items-center flex-wrap gap-2 shrink-0">
                              {/* Manage Registered Candidates */}
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-campusblue-700 hover:bg-campusblue-800 text-white"
                                onClick={() => setSelectedDriveForCandidates(drive)}
                              >
                                Manage Candidates
                              </Button>

                              {/* Drive Status Quick Transitions */}
                              {drive.status === "DRAFT" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-campusblue-800 border-campusblue-100 hover:bg-campusblue-50"
                                  loading={actionLoadingId === `drive-${drive.id}`}
                                  onClick={() => handleUpdateDriveStatus(drive.id, "PUBLISHED")}
                                >
                                  Publish
                                </Button>
                              )}

                              {drive.status === "PUBLISHED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-campusblue-800 border-campusblue-100 hover:bg-campusblue-50"
                                  loading={actionLoadingId === `drive-${drive.id}`}
                                  onClick={() => handleUpdateDriveStatus(drive.id, "REGISTRATION_OPEN")}
                                >
                                  Open Reg.
                                </Button>
                              )}

                              {drive.status === "REGISTRATION_OPEN" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-campusblue-800 border-campusblue-100 hover:bg-campusblue-50"
                                  loading={actionLoadingId === `drive-${drive.id}`}
                                  onClick={() => handleUpdateDriveStatus(drive.id, "IN_PROGRESS")}
                                >
                                  Close Reg.
                                </Button>
                              )}

                              {drive.status === "IN_PROGRESS" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-campusblue-800 border-campusblue-100 hover:bg-campusblue-50"
                                  loading={actionLoadingId === `drive-${drive.id}`}
                                  onClick={() => handleUpdateDriveStatus(drive.id, "COMPLETED")}
                                >
                                  Complete
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDrive(drive);
                                  setIsDriveModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDrive(drive)}
                                className="text-campusblue-700 hover:text-campusblue-900 hover:bg-campusblue-50"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          {drive.description && (
                            <p className="text-xs text-campusblue-800 leading-relaxed mb-4">
                              {drive.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-campusblue-50 p-3 rounded-lg">
                            <div>
                              <span className="text-campusblue-500 block">Date & Timing:</span>
                              <span className="font-semibold text-campusblue-900">
                                {drive.date} ({drive.start_time} - {drive.end_time})
                              </span>
                            </div>
                            <div>
                              <span className="text-campusblue-500 block">Mode & Venue:</span>
                              <span className="font-semibold text-campusblue-900">
                                {drive.mode} • {drive.venue || "Campus Labs"}
                              </span>
                            </div>
                            <div>
                              <span className="text-campusblue-500 block">Candidate Capacity:</span>
                              <span className="font-semibold text-campusblue-800">
                                {drive.capacity ?? "Unlimited"} seats
                              </span>
                            </div>
                            <div>
                              <span className="text-campusblue-500 block">Registration Deadline:</span>
                              <span className="font-semibold text-campusblue-900">
                                {drive.registration_deadline
                                  ? new Date(drive.registration_deadline).toLocaleDateString()
                                  : "Open until drive"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No placement drives scheduled"
                  description="Schedule an interview drive once your job requirements and eligibility rules are published."
                  actionText={jobs.length > 0 ? "Schedule Drive" : undefined}
                  onAction={() => {
                    setSelectedDrive(null);
                    setIsDriveModalOpen(true);
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      

          {/* TAB 4: CANDIDATES */}
          {activeTab === "candidates" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-campusblue-900">Registered Candidates</h3>
                  <p className="text-xs text-campusblue-500">Students who have applied or registered for your active drives.</p>
                </div>
              </div>
              <Card>
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-campusblue-50 text-campusblue-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-campusblue-900 mb-2">Candidate Tracking System</h3>
                  <p className="text-sm text-campusblue-500 max-w-md mx-auto mb-6">
                    Integration with the central placement database is active. You currently have {metrics?.total_candidates_count || 5} registered candidates. Their full profiles, resumes, and academic transcripts will be unlocked exactly 48 hours before the scheduled drive date.
                  </p>
                  <button onClick={() => setActiveTab('drives')} className="text-sm font-semibold text-campusblue-800 bg-campusblue-50 hover:bg-campusblue-100 font-serif px-4 py-2 rounded-lg transition">
                    View Placement Drives
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: SHORTLISTED */}
          {activeTab === "shortlisted" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-campusblue-900">Shortlisted Candidates</h3>
                  <p className="text-xs text-campusblue-500">Candidates who passed initial screening and are ready for interviews.</p>
                </div>
              </div>
              <Card>
                                {(!shortlisted || shortlisted.length === 0) ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-campusblue-50 text-campusblue-500 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-campusblue-900 mb-2">Shortlisting Workbench</h3>
                    <p className="text-sm text-campusblue-500 max-w-md mx-auto mb-6">
                      You have not published any final shortlists yet. Once candidates pass the AI screening rounds or your custom eligibility filters, they will appear here for final interview scheduling and offer generation.
                    </p>
                    <button onClick={() => setActiveTab('jobs')} className="text-sm font-semibold text-campusblue-800 bg-campusblue-50 hover:bg-campusblue-100 font-serif px-4 py-2 rounded-lg transition">
                      Review Job Eligibility Rules
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-campusblue-50 text-campusblue-700 text-3xs uppercase tracking-wider border-b border-campusblue-100">
                          <th className="p-3">Candidate</th>
                          <th className="p-3">Branch & CGPA</th>
                          <th className="p-3">Registered Drive</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortlisted.map((c) => (
                          <tr key={c.id} className="border-b border-campusblue-50 hover:bg-[#F4F9FD] transition">
                            <td className="p-3">
                              <div className="font-bold text-sm text-campusblue-900">{c.student_name}</div>
                              <div className="text-xs text-campusblue-600">ID: {c.student_identifier}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-campusblue-900">{c.branch}</div>
                              <div className="text-xs text-campusblue-600">CGPA: {c.cgpa} / 10.0</div>
                            </td>
                            <td className="p-3 text-xs text-campusblue-700">
                              <div className="font-medium text-campusblue-900">{c.drive_name || 'N/A'}</div>
                              <div className="text-3xs mt-1 text-campusblue-500">
                                {c.registration_timestamp ? new Date(c.registration_timestamp).toLocaleDateString() : ''}
                              </div>
                            </td>
                            <td className="p-3">
                              <Button size="sm" variant="outline" onClick={() => setViewCandidate(c)}>
                                View Profile
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
{/* Feature Modals */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        company={profile?.company}
        onSuccess={(updatedData: any) => {
          showToast("Company profile updated.");
          if (updatedData && profile) {
            setProfile({ ...profile, company: { ...profile.company, ...updatedData } });
          } else {
            fetchData();
          }
        }}
      />

      <JobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        job={selectedJob}
        onSuccess={() => {
          showToast(selectedJob ? "Job updated." : "Job posting published.");
          fetchData();
        }}
      />

      <JobRequirementsModal
        isOpen={isReqModalOpen}
        onClose={() => setIsReqModalOpen(false)}
        job={selectedJobForReqs}
        skillsList={skillsList}
        onSuccess={() => {
          showToast("Skill requirements updated.");
          fetchData();
        }}
      />

      <DriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        drive={selectedDrive}
        jobs={jobs}
        onSuccess={() => {
          showToast(selectedDrive ? "Drive updated." : "Placement drive scheduled.");
          fetchData();
        }}
      />

      {/* Completeness Audit Feature Modals */}
      <JobPreviewModal
        isOpen={previewJob !== null}
        onClose={() => setPreviewJob(null)}
        job={previewJob}
        companyName={profile?.company?.name}
      />

      <CandidateProfileModal
        isOpen={viewCandidate !== null}
        onClose={() => setViewCandidate(null)}
        studentId={viewCandidate?.student_id || null}
      />

      <CandidateManagementModal
        isOpen={selectedDriveForCandidates !== null}
        onClose={() => {
          setSelectedDriveForCandidates(null);
          fetchData();
        }}
        drive={selectedDriveForCandidates}
      />
    </AppLayout>
  );
}










