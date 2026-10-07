"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

import { CompletenessCard } from "@/features/students/CompletenessCard";
import { ResumeCard } from "@/features/students/ResumeCard";
import { AssessmentsCard } from "@/features/students/AssessmentsCard";
import { BasicInfoModal } from "@/features/students/BasicInfoModal";
import { LinksModal } from "@/features/students/LinksModal";
import { AcademicModal } from "@/features/students/AcademicModal";
import { SkillModal } from "@/features/students/SkillModal";
import { ProjectModal } from "@/features/students/ProjectModal";
import { CertModal } from "@/features/students/CertModal";

import {
  FullProfileData,
  AcademicHistoryItem,
  StudentSkillItem,
  StudentProjectItem,
  StudentCertificationItem,
} from "@/features/students/types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<FullProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isBasicModalOpen, setIsBasicModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);

  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState(false);
  const [selectedAcademic, setSelectedAcademic] = useState<AcademicHistoryItem | null>(null);

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<StudentSkillItem | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<StudentProjectItem | null>(null);

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<StudentCertificationItem | null>(null);

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

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await studentsApi.getProfile();
      setProfileData(data);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Delete Handlers
  const handleDeleteAcademic = (item: AcademicHistoryItem) => {
    setConfirmDelete({
      isOpen: true,
      title: "Delete Academic History Record",
      message: `Are you sure you want to delete ${item.qualification} from ${item.institution}? This action cannot be undone.`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await studentsApi.deleteAcademicHistory(item.id);
          showToast("Academic record deleted successfully.");
          await fetchProfile();
        } catch (err: any) {
          showToast(parseApiError(err).message);
        } finally {
          setDeleting(false);
          setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteSkill = (item: StudentSkillItem) => {
    setConfirmDelete({
      isOpen: true,
      title: "Delete Technical Skill",
      message: `Are you sure you want to remove "${item.skill_name}" from your skills profile?`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await studentsApi.deleteSkill(item.id);
          showToast("Skill deleted successfully.");
          await fetchProfile();
        } catch (err: any) {
          showToast(parseApiError(err).message);
        } finally {
          setDeleting(false);
          setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteProject = (item: StudentProjectItem) => {
    setConfirmDelete({
      isOpen: true,
      title: "Delete Project Record",
      message: `Are you sure you want to remove "${item.title}"?`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await studentsApi.deleteProject(item.id);
          showToast("Project deleted successfully.");
          await fetchProfile();
        } catch (err: any) {
          showToast(parseApiError(err).message);
        } finally {
          setDeleting(false);
          setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteCert = (item: StudentCertificationItem) => {
    setConfirmDelete({
      isOpen: true,
      title: "Delete Certification Record",
      message: `Are you sure you want to remove "${item.name}"?`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await studentsApi.deleteCertification(item.id);
          showToast("Certification deleted.");
          await fetchProfile();
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
    <AppLayout allowedRoles={["STUDENT", "SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="Student Profile Management"
        subtitle="Maintain your verified educational record, competencies, projects, and certifications."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDelete.onConfirm}
        loading={deleting}
      />

      {loading ? (
        <LoadingState message="Loading your comprehensive profile..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProfile} />
      ) : profileData ? (
        <div className="space-y-8">
          {/* Completeness Section */}
          <CompletenessCard completeness={profileData.completeness} />

          {/* Basic Info & Contact Details */}
          <Card
            title="Personal & Academic Information"
            subtitle={`Identifier: ${profileData.basic_info.student_identifier}`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBasicModalOpen(true)}
              >
                Edit Details
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Full Name</span>
                <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                  {profileData.basic_info.first_name || ""} {profileData.basic_info.last_name || "—"}
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Department / Branch</span>
                <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                  {profileData.basic_info.branch || "—"}
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Current CGPA</span>
                <span className="text-sm font-bold text-campusblue-700 mt-0.5 block">
                  {profileData.basic_info.cgpa !== null ? profileData.basic_info.cgpa : "—"} / 10.0
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Graduation Year</span>
                <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                  {profileData.basic_info.graduation_year || "—"}
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Active Backlogs</span>
                <span className={`text-sm font-semibold mt-0.5 block ${profileData.basic_info.backlogs_current ? "text-campusblue-700" : "text-campusblue-700"}`}>
                  {profileData.basic_info.backlogs_current ?? 0}
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Total Historical Backlogs</span>
                <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                  {profileData.basic_info.backlogs_history ?? 0}
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Phone</span>
                <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                  {profileData.basic_info.phone || "—"}
                </span>
              </div>
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block">Date of Birth / Gender</span>
                <span className="text-sm font-semibold text-campusblue-900 mt-0.5 block">
                  {profileData.basic_info.dob || "—"} ({profileData.basic_info.gender || "—"})
                </span>
              </div>
            </div>

            {profileData.basic_info.profile_metadata?.bio && (
              <div className="mt-4 p-3.5 bg-campusblue-50 border border-campusblue-50 shadow-sm rounded-lg text-xs">
                <span className="font-bold text-campusblue-900 font-serif block mb-1">Biography</span>
                <p className="text-campusblue-800 leading-relaxed">
                  {profileData.basic_info.profile_metadata.bio}
                </p>
              </div>
            )}
          </Card>

          {/* Professional Links & Career Interests */}
          <Card
            title="Professional Links & Target Roles"
            subtitle="Online presence, portfolio, and career specializations."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLinksModalOpen(true)}
              >
                Edit Links
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block mb-1">LinkedIn</span>
                {profileData.basic_info.profile_metadata?.linkedin_url ? (
                  <a
                    href={profileData.basic_info.profile_metadata.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-campusblue-700 hover:underline font-medium break-all flex items-center gap-1"
                  >
                    <span>View Profile</span>
                    <span>&nearr;</span>
                  </a>
                ) : (
                  <span className="text-campusblue-300">Not provided</span>
                )}
              </div>

              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block mb-1">GitHub</span>
                {profileData.basic_info.profile_metadata?.github_url ? (
                  <a
                    href={profileData.basic_info.profile_metadata.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-campusblue-700 hover:underline font-medium break-all flex items-center gap-1"
                  >
                    <span>View GitHub</span>
                    <span>&nearr;</span>
                  </a>
                ) : (
                  <span className="text-campusblue-300">Not provided</span>
                )}
              </div>

              <div className="p-3 bg-campusblue-50/50 rounded-md border border-campusblue-50">
                <span className="text-campusblue-500 block mb-1">Portfolio</span>
                {profileData.basic_info.profile_metadata?.portfolio_url ? (
                  <a
                    href={profileData.basic_info.profile_metadata.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-campusblue-700 hover:underline font-medium break-all flex items-center gap-1"
                  >
                    <span>Visit Portfolio</span>
                    <span>&nearr;</span>
                  </a>
                ) : (
                  <span className="text-campusblue-300">Not provided</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-campusblue-50 text-xs">
              <div>
                <span className="text-campusblue-500 block mb-1">Target Roles</span>
                {profileData.basic_info.profile_metadata?.preferred_job_roles?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profileData.basic_info.profile_metadata.preferred_job_roles.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 bg-campusblue-50 text-campusblue-800 rounded-md border border-campusblue-100">
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-campusblue-300">None specified</span>
                )}
              </div>

              <div>
                <span className="text-campusblue-500 block mb-1">Career Interests</span>
                {profileData.basic_info.profile_metadata?.career_interests?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profileData.basic_info.profile_metadata.career_interests.map((ci, i) => (
                      <span key={i} className="px-2 py-0.5 bg-campusblue-50 text-campusblue-800 rounded-md border border-campusblue-100">
                        {ci}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-campusblue-300">None specified</span>
                )}
              </div>
            </div>
          </Card>

          {/* Resume Card */}
          <ResumeCard
            resumeUrl={profileData.basic_info.resume_url}
            onUploadSuccess={() => {
              showToast("Resume uploaded successfully.");
              fetchProfile();
            }}
          />

          {/* Academic History */}
          <Card
            title={`Academic History (${profileData.academic_history.length})`}
            subtitle="Degrees, diplomas, and secondary schooling achievements."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedAcademic(null);
                  setIsAcademicModalOpen(true);
                }}
              >
                + Add Academic Record
              </Button>
            }
          >
            {profileData.academic_history.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {profileData.academic_history.map((item) => (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <h4 className="text-sm font-semibold text-campusblue-900">{item.qualification}</h4>
                      <p className="text-xs text-campusblue-700 mt-0.5">
                        {item.institution} {item.specialization ? `• ${item.specialization}` : ""}
                      </p>
                      <p className="text-2xs text-campusblue-300 mt-0.5">
                        {item.start_year || "—"} - {item.end_year || "Present"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-campusblue-50 text-campusblue-900 border border-campusblue-100">
                        {item.score_type}: {item.score_value}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAcademic(item);
                          setIsAcademicModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAcademic(item)}
                        className="text-campusblue-700 hover:text-campusblue-900 hover:bg-campusblue-50 rounded p-1 transition"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No academic records yet"
                description="Add your degree and high school credentials to verify your educational background."
                actionText="Add Academic Record"
                onAction={() => {
                  setSelectedAcademic(null);
                  setIsAcademicModalOpen(true);
                }}
              />
            )}
          </Card>

          {/* Technical Skills */}
          <Card
            title={`Technical Skills (${profileData.skills.length})`}
            subtitle="Categorized technical competencies evaluated for job requirements and skill-gap matching."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedSkill(null);
                  setIsSkillModalOpen(true);
                }}
              >
                + Add Skill
              </Button>
            }
          >
            {profileData.skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profileData.skills.map((s) => (
                  <div key={s.id} className="p-3.5 bg-white border border-campusblue-100 rounded-lg shadow-sm flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-campusblue-900">{s.skill_name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusBadge status={s.proficiency_level} size="sm" />
                        <span className="text-2xs text-campusblue-500">{s.months_experience} mo</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSkill(s);
                          setIsSkillModalOpen(true);
                        }}
                        className="p-1 text-campusblue-300 hover:text-campusblue-700 hover:bg-campusblue-50 rounded cursor-pointer transition"
                        title="Edit Skill"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(s)}
                        className="p-1 text-campusblue-300 hover:text-campusblue-700 hover:bg-campusblue-50 rounded cursor-pointer transition"
                        title="Delete Skill"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No skills registered yet"
                description="List your core technical capabilities to qualify for relevant recruiter job postings."
                actionText="Add Skill"
                onAction={() => {
                  setSelectedSkill(null);
                  setIsSkillModalOpen(true);
                }}
              />
            )}
          </Card>

          {/* Applied Projects */}
          <Card
            title={`Applied Projects (${profileData.projects.length})`}
            subtitle="Showcase live deployments, GitHub repositories, and system engineering architectures."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedProject(null);
                  setIsProjectModalOpen(true);
                }}
              >
                + Add Project
              </Button>
            }
          >
            {profileData.projects.length > 0 ? (
              <div className="space-y-4">
                {profileData.projects.map((proj) => (
                  <div key={proj.id} className="p-4 bg-white border border-campusblue-100 rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-campusblue-900">{proj.title}</h4>
                      <div className="flex items-center gap-2">
                        {proj.project_url && (
                          <a
                            href={proj.project_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-campusblue-700 hover:underline flex items-center gap-1"
                          >
                            <span>Live Project / Code</span>
                            <span>&nearr;</span>
                          </a>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProject(proj);
                            setIsProjectModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(proj)}
                          className="text-campusblue-700 hover:text-campusblue-900 hover:bg-campusblue-50 rounded p-1 transition"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-campusblue-800 leading-relaxed mb-2">
                        {proj.description}
                      </p>
                    )}

                    {proj.technologies && (
                      <div className="flex flex-wrap gap-1.5">
                        {proj.technologies.split(",").map((tech, i) => (
                          <span key={i} className="px-2 py-0.5 bg-campusblue-50 text-campusblue-900 text-2xs font-semibold rounded">
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No projects registered yet"
                description="Showcase practical projects to significantly elevate your readiness score."
                actionText="Add Project"
                onAction={() => {
                  setSelectedProject(null);
                  setIsProjectModalOpen(true);
                }}
              />
            )}
          </Card>

          {/* Certifications */}
          <Card
            title={`Industry Certifications (${profileData.certifications.length})`}
            subtitle="Cloud, security, architecture, and professional credentials."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedCert(null);
                  setIsCertModalOpen(true);
                }}
              >
                + Add Certification
              </Button>
            }
          >
            {profileData.certifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {profileData.certifications.map((cert) => (
                  <div key={cert.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <h4 className="text-sm font-semibold text-campusblue-900">{cert.name}</h4>
                      <p className="text-xs text-campusblue-700 mt-0.5">
                        Issued by: <span className="font-medium text-campusblue-900">{cert.issuing_org}</span>
                      </p>
                      <p className="text-2xs text-campusblue-300 mt-0.5">
                        Issued: {cert.issue_date || "—"} {cert.expiry_date ? `• Expires: ${cert.expiry_date}` : "• Non-expiring"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {cert.credential_id && (
                        <span className="text-2xs font-mono px-2 py-1 bg-white 100 text-campusblue-900 rounded">
                          {cert.credential_id}
                        </span>
                      )}
                      {cert.proof_path && (
                        <a
                          href={`http://127.0.0.1:8001${cert.proof_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-campusblue-800 hover:text-campusblue-900 bg-campusblue-50 hover:bg-campusblue-100 font-serif px-3 py-1.5 rounded-md transition flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          View PDF
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCert(cert);
                          setIsCertModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCert(cert)}
                        className="text-campusblue-700 hover:text-campusblue-900 hover:bg-campusblue-50 rounded p-1 transition"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No certifications added yet"
                description="Credentials from AWS, GCP, Microsoft, etc. contribute directly to your certification dimension."
                actionText="Add Certification"
                onAction={() => {
                  setSelectedCert(null);
                  setIsCertModalOpen(true);
                }}
              />
            )}
          </Card>

          {/* Standardized Assessments */}
          <AssessmentsCard assessments={profileData.assessments} />
        </div>
      ) : null}

      {/* Feature Modals */}
      <BasicInfoModal
        isOpen={isBasicModalOpen}
        onClose={() => setIsBasicModalOpen(false)}
        initialData={profileData?.basic_info}
        onSuccess={() => {
          showToast("Profile details updated successfully.");
          fetchProfile();
        }}
      />

      <LinksModal
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
        metadata={profileData?.basic_info.profile_metadata}
        onSuccess={() => {
          showToast("Professional links saved.");
          fetchProfile();
        }}
      />

      <AcademicModal
        isOpen={isAcademicModalOpen}
        onClose={() => setIsAcademicModalOpen(false)}
        item={selectedAcademic}
        onSuccess={() => {
          showToast("Academic record saved.");
          fetchProfile();
        }}
      />

      <SkillModal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        item={selectedSkill}
        onSuccess={() => {
          showToast("Skill saved.");
          fetchProfile();
        }}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        item={selectedProject}
        onSuccess={() => {
          showToast("Project saved.");
          fetchProfile();
        }}
      />

      <CertModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        item={selectedCert}
        onSuccess={() => {
          showToast("Certification saved.");
          fetchProfile();
        }}
      />
    </AppLayout>
  );
}






