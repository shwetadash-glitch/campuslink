"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { ResumePaperSheet } from "@/features/resumes/ResumePaperSheet";
import { resumeApi, ResumeItem, ResumeVersionItem } from "@/services/resumeApi";
import { parseApiError, apiClient } from "@/services/apiClient";

export default function ResumeBuilderPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editor states
  const [activeTab, setActiveTab] = useState<"content" | "tailor" | "quality" | "versions">("content");
  const [editingContent, setEditingContent] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // AI helper states
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [improvingProjectIdx, setImprovingProjectIdx] = useState<number | null>(null);
  const [improvingExpIdx, setImprovingExpIdx] = useState<number | null>(null);

  // Job analysis state
  const [jobDescriptionInput, setJobDescriptionInput] = useState("");
  const [analyzingJob, setAnalyzingJob] = useState(false);
  const [jobAnalysisResult, setJobAnalysisResult] = useState<any | null>(null);

  // Quality analysis state
  const [analyzingQuality, setAnalyzingQuality] = useState(false);

  // Versioning state
  const [versions, setVersions] = useState<ResumeVersionItem[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionSnapshotSummary, setVersionSnapshotSummary] = useState("");
  const [diffComparison, setDiffComparison] = useState<any | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"paper" | "code">("paper");

  // New resume modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTargetRole, setNewTargetRole] = useState("");
  const [newTemplate, setNewTemplate] = useState<'modern' | 'classic' | 'technical'>('modern');
  const [creating, setCreating] = useState(false);

  // Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [approving, setApproving] = useState(false);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await resumeApi.getResumes();
      setResumes(res.resumes);
      if (res.resumes.length > 0) {
        // Select primary or first resume by default
        const primary = res.resumes.find((r) => r.is_primary) || res.resumes[0];
        setSelectedResume(primary);
        setEditingContent(primary.content);
        if (primary.job_description_raw) {
          setJobDescriptionInput(primary.job_description_raw);
        }
      }
    } catch (err: any) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleSelectResume = (resume: ResumeItem) => {
    setSelectedResume(resume);
    setEditingContent(resume.content);
    setJobAnalysisResult(null);
    if (resume.job_description_raw) {
      setJobDescriptionInput(resume.job_description_raw);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedResume || !editingContent) return;
    setSaving(true);
    try {
      const res = await resumeApi.updateResume(selectedResume.id, {
        content: editingContent,
        title: selectedResume.title,
        template: selectedResume.template,
        target_role: selectedResume.target_role || undefined,
      });
      setSelectedResume(res.resume);
      setToastMessage("Resume content saved successfully!");
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateResume = async () => {
    if (!newTitle.trim()) {
      alert("Please enter a title for this resume.");
      return;
    }
    setCreating(true);
    try {
      const res = await resumeApi.createResume({
        title: newTitle,
        target_role: newTargetRole || undefined,
        template: newTemplate,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewTargetRole("");
      setToastMessage("New tailored resume created from verified profile!");
      await fetchResumes();
      handleSelectResume(res.resume);
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setCreating(false);
    }
  };

  // AI Summary Generator
  const handleGenerateSummary = async () => {
    if (!selectedResume) return;
    setGeneratingSummary(true);
    try {
      const res = await resumeApi.generateSummary(
        selectedResume.id,
        selectedResume.target_role || undefined,
        jobDescriptionInput || undefined
      );
      setEditingContent((prev: any) => ({
        ...prev,
        summary: res.summary,
      }));
      setToastMessage("Professional summary generated & grounded in verified profile!");
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // AI Project Polish
  const handleImproveProject = async (index: number) => {
    if (!selectedResume || !editingContent?.projects?.[index]) return;
    setImprovingProjectIdx(index);
    const targetProject = editingContent.projects[index];
    try {
      const res = await resumeApi.improveProject(selectedResume.id, targetProject);
      setEditingContent((prev: any) => {
        const updatedProjects = [...prev.projects];
        updatedProjects[index] = {
          ...updatedProjects[index],
          description: res.enhanced_description,
          highlights: res.bullet_points,
        };
        return { ...prev, projects: updatedProjects };
      });
      setToastMessage(`Project '${targetProject.title}' polished with action-verb bullet points!`);
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setImprovingProjectIdx(null);
    }
  };

  // AI Experience Polish
  const handleImproveExperience = async (index: number) => {
    if (!selectedResume || !editingContent?.work_experience?.[index]) return;
    setImprovingExpIdx(index);
    const targetExp = editingContent.work_experience[index];
    try {
      const res = await resumeApi.improveExperience(selectedResume.id, targetExp);
      setEditingContent((prev: any) => {
        const updatedExp = [...prev.work_experience];
        updatedExp[index] = {
          ...updatedExp[index],
          description: res.enhanced_description,
          highlights: res.bullet_points,
        };
        return { ...prev, work_experience: updatedExp };
      });
      setToastMessage(`Experience at '${targetExp.company}' polished with ATR bullet points!`);
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setImprovingExpIdx(null);
    }
  };

  // Job Description Analysis
  const handleAnalyzeJobDescription = async () => {
    if (!selectedResume || !jobDescriptionInput.trim()) {
      alert("Please paste a target job description to analyze.");
      return;
    }
    setAnalyzingJob(true);
    try {
      const res = await resumeApi.analyzeJobDescription(selectedResume.id, jobDescriptionInput);
      setJobAnalysisResult(res);
      setToastMessage("Job requirements analyzed and match score calculated!");
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setAnalyzingJob(false);
    }
  };

  // Quality & ATS Analysis
  const handleRunQualityAnalysis = async () => {
    if (!selectedResume) return;
    setAnalyzingQuality(true);
    try {
      const res = await resumeApi.analyzeQuality(selectedResume.id);
      setSelectedResume((prev) => (prev ? { ...prev, analysis_summary: res.analysis, quality_score: res.analysis.quality_score, ats_score: res.analysis.ats_score } : null));
      setToastMessage("Quality and ATS audit complete!");
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setAnalyzingQuality(false);
    }
  };

  // Approval & PDF Export
  const handleApprove = async () => {
    if (!selectedResume) return;
    setApproving(true);
    try {
      const res = await resumeApi.approveResume(selectedResume.id);
      setSelectedResume((prev) => (prev ? { ...prev, approved_by_student_at: res.approved_at } : null));
      setToastMessage("Resume approved for official placement export!");
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setApproving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedResume) return;
    setExportingPdf(true);
    try {
      const res = await resumeApi.exportPdf(selectedResume.id);
      setToastMessage("PDF compiled and verified! Starting download...");
      await apiClient.download(res.download_url, `${selectedResume.title || "Resume"}.pdf`);
      setSelectedResume((prev) => (prev ? { ...prev, pdf_path: res.pdf_path, pdf_generated_at: res.generated_at } : null));
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportDocx = async () => {
    if (!selectedResume) return;
    setExportingDocx(true);
    try {
      const res = await resumeApi.exportDocx(selectedResume.id);
      setToastMessage("DOCX compiled and verified! Starting download...");
      await apiClient.download(res.download_url, `${selectedResume.title || "Resume"}.docx`);
    } catch (err: any) {
      alert(parseApiError(err).message);
    } finally {
      setExportingDocx(false);
    }
  };

  // Version Snapshot & Diff
  const handleCreateVersionSnapshot = async () => {
    if (!selectedResume) return;
    try {
      await resumeApi.createVersion(selectedResume.id, versionSnapshotSummary || undefined);
      setShowVersionModal(false);
      setVersionSnapshotSummary("");
      setToastMessage("Immutable version snapshot created!");
      const vRes = await resumeApi.getVersions(selectedResume.id);
      setVersions(vRes.versions);
    } catch (err: any) {
      alert(parseApiError(err).message);
    }
  };

  const handleCompareWithProfile = async () => {
    if (!selectedResume) return;
    try {
      const res = await resumeApi.compareVersions(selectedResume.id, undefined, undefined, true);
      setDiffComparison(res.comparison);
    } catch (err: any) {
      alert(parseApiError(err).message);
    }
  };

  return (
    <AppLayout allowedRoles={["STUDENT", "SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="AI-Powered Resume Builder & Tailoring Studio"
        subtitle="Create professional, ATS-optimized, job-tailored resumes grounded strictly in your verified university credentials."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {loading ? (
        <LoadingState message="Loading your resume workspace..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchResumes} />
      ) : (
        <div className="space-y-6">
          {/* Top Bar: Resume Selector & Create Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-campusblue-100 shadow-xs">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-2xs font-bold text-campusblue-400 uppercase whitespace-nowrap">
                My Resumes:
              </span>
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectResume(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    selectedResume?.id === r.id
                      ? "bg-campusblue-900 text-white shadow-sm"
                      : "bg-campusblue-50 text-campusblue-700 hover:bg-campusblue-100"
                  }`}
                >
                  <span>{r.title}</span>
                  {r.is_primary && (
                    <span className="px-1.5 py-0.2 rounded text-3xs font-extrabold bg-blue-500 text-white">
                      Primary
                    </span>
                  )}
                  {r.target_role && (
                    <span className="text-3xs opacity-80">({r.target_role})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/resume-builder"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition"
              >
                ✨ Launch Modern Resume Studio
              </Link>
              <Button size="sm" variant="primary" onClick={() => setShowCreateModal(true)}>
                + Create Tailored Resume
              </Button>
            </div>
          </div>

          {selectedResume && editingContent ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left / Main Column: Resume Editor */}
              <div className="lg:col-span-2 space-y-6">
                {/* Resume Header & Template Bar */}
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-campusblue-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-campusblue-900">{selectedResume.title}</h2>
                        <StatusBadge status={selectedResume.template.toUpperCase()} size="sm" variant="purple" />
                        {selectedResume.approved_by_student_at ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800">
                            Draft (Approval Required)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-campusblue-500 mt-0.5">
                        Target Role: <strong>{selectedResume.target_role || "General Software Engineering"}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedResume.template}
                        onChange={async (e) => {
                          const newT = e.target.value as any;
                          setSelectedResume({ ...selectedResume, template: newT });
                          await resumeApi.updateResume(selectedResume.id, { template: newT });
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg border border-campusblue-200 bg-white font-medium text-campusblue-800 focus:outline-none"
                      >
                        <option value="modern">Modern (Sans-Serif / Accent)</option>
                        <option value="classic">Classic (Serif / Formal)</option>
                        <option value="technical">Technical (Dense Engineering)</option>
                      </select>

                      <Button size="sm" variant="primary" loading={saving} onClick={handleSaveContent}>
                        Save Draft
                      </Button>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <Tabs
                    tabs={[
                      { key: "content", label: "Content Editor" },
                      { key: "tailor", label: "Job Description Tailoring" },
                      { key: "quality", label: "ATS & Quality Audit" },
                      { key: "versions", label: "Version History" },
                    ]}
                    activeKey={activeTab}
                    onChange={(k: any) => setActiveTab(k)}
                    className="mt-4"
                  />
                </Card>

                {/* TAB 1: CONTENT EDITOR */}
                {activeTab === "content" && (
                  <div className="space-y-6">
                    {/* Professional Summary */}
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-campusblue-900">Professional Summary</h3>
                          <p className="text-2xs text-campusblue-500">Concise 3-4 sentence narrative grounded in verified credentials</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={generatingSummary}
                          onClick={handleGenerateSummary}
                        >
                          ✨ AI Generate / Enhance
                        </Button>
                      </div>

                      <textarea
                        value={editingContent.summary || ""}
                        onChange={(e) =>
                          setEditingContent({
                            ...editingContent,
                            summary: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full p-3 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed text-campusblue-900"
                        placeholder="Highlight your academic focus, technical skills, and core engineering interests..."
                      />
                    </Card>

                    {/* Technical Skills */}
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-campusblue-900">Technical & Domain Skills</h3>
                          <p className="text-2xs text-campusblue-500">Categorized competencies synced with your profile</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {editingContent.skills && editingContent.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {editingContent.skills.map((s: any, idx: number) => (
                              <div
                                key={idx}
                                className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 bg-campusblue-50/50 border-campusblue-200"
                              >
                                <span className="font-bold text-campusblue-900">{s.name}</span>
                                <span className="text-3xs text-campusblue-400">({s.proficiency_level})</span>
                                {s.is_verified ? (
                                  <span className="text-3xs px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold" title="Verified in university assessment/certification">
                                    ✓ Verified
                                  </span>
                                ) : (
                                  <span className="text-3xs px-1 py-0.2 rounded bg-campusblue-100 text-campusblue-500" title="Self-reported claim">
                                    Self-Reported
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-campusblue-400">No skills added yet.</p>
                        )}
                      </div>
                    </Card>

                    {/* Work Experience */}
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-campusblue-900">Work Experience</h3>
                          <p className="text-2xs text-campusblue-500">Professional internships, co-ops, and full-time engineering roles</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {editingContent.work_experience && editingContent.work_experience.length > 0 ? (
                          editingContent.work_experience.map((exp: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-campusblue-100 bg-campusblue-50/20 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-black text-campusblue-900">{exp.job_title}</span>
                                  {exp.company && (
                                    <span className="text-2xs font-semibold text-campusblue-700 ml-2">@ {exp.company}</span>
                                  )}
                                  {exp.location && (
                                    <span className="text-3xs text-campusblue-400 ml-2">({exp.location})</span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={improvingExpIdx === idx}
                                  onClick={() => handleImproveExperience(idx)}
                                >
                                  🎯 AI Polish (ATR Formula)
                                </Button>
                              </div>

                              <textarea
                                value={exp.description || (Array.isArray(exp.highlights) ? exp.highlights.join("\n") : "")}
                                onChange={(e) => {
                                  const newExp = [...editingContent.work_experience];
                                  newExp[idx] = { ...newExp[idx], description: e.target.value };
                                  setEditingContent({ ...editingContent, work_experience: newExp });
                                }}
                                rows={3}
                                placeholder="Describe your responsibilities and achievements..."
                                className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500 text-campusblue-900"
                              />

                              {Array.isArray(exp.highlights) && exp.highlights.length > 0 && (
                                <ul className="list-disc pl-4 space-y-1 text-2xs text-campusblue-700">
                                  {exp.highlights.map((h: string, hIdx: number) => (
                                    <li key={hIdx}>{h}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-campusblue-400 italic">
                            No external work experience recorded (Fresher Candidate Profile). Focus will be placed on capstone projects and technical competencies.
                          </p>
                        )}
                      </div>
                    </Card>

                    {/* Projects */}
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-campusblue-900">Projects & Systems</h3>
                          <p className="text-2xs text-campusblue-500">Academic capstones, systems implementations, and hackathons</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {editingContent.projects && editingContent.projects.map((proj: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl border border-campusblue-100 bg-campusblue-50/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-black text-campusblue-900">{proj.title}</span>
                                {proj.technologies && (
                                  <span className="text-2xs text-campusblue-500 ml-2">[{proj.technologies}]</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                loading={improvingProjectIdx === idx}
                                onClick={() => handleImproveProject(idx)}
                              >
                                🎯 AI Polish (Action Verbs)
                              </Button>
                            </div>

                            <textarea
                              value={proj.description || ""}
                              onChange={(e) => {
                                const newP = [...editingContent.projects];
                                newP[idx] = { ...newP[idx], description: e.target.value };
                                setEditingContent({ ...editingContent, projects: newP });
                              }}
                              rows={3}
                              className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500 text-campusblue-900"
                            />
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Education Credentials */}
                    <Card>
                      <h3 className="text-sm font-bold text-campusblue-900 mb-2">Education & Academic History</h3>
                      <div className="space-y-2">
                        {editingContent.academic_history && editingContent.academic_history.map((edu: any, idx: number) => (
                          <div key={idx} className="p-3 bg-campusblue-50/50 rounded-lg flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-campusblue-900">{edu.qualification}</span>
                              <span className="text-campusblue-600 ml-2">— {edu.institution}</span>
                              <span className="text-campusblue-400 text-2xs block">
                                {edu.start_year} - {edu.end_year} • {edu.score_type}: {edu.score_value}
                              </span>
                            </div>
                            <span className="text-2xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              ✓ University Verified
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Honors & Key Achievements */}
                    {editingContent.achievements && editingContent.achievements.length > 0 && (
                      <Card>
                        <h3 className="text-sm font-bold text-campusblue-900 mb-2">Honors & Key Achievements</h3>
                        <div className="space-y-2">
                          {editingContent.achievements.map((ach: any, idx: number) => (
                            <div key={idx} className="p-3 bg-amber-50/40 rounded-lg border border-amber-200/50 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{ach.title || String(ach)}</span>
                                {ach.date && <span className="text-3xs text-slate-500">{ach.date}</span>}
                              </div>
                              {ach.issuer && <div className="text-2xs text-slate-600 mt-0.5">Issuer: {ach.issuer}</div>}
                              {ach.description && <div className="text-2xs text-slate-700 mt-1">{ach.description}</div>}
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* TAB 2: JOB TAILORING */}
                {activeTab === "tailor" && (
                  <Card>
                    <h3 className="text-sm font-bold text-campusblue-900">Job Description Match & Keyword Analysis</h3>
                    <p className="text-2xs text-campusblue-500 mt-0.5 mb-4">
                      Paste the employer job requisition below to identify matching keywords, gaps, and evidence-based recommendations.
                    </p>

                    <div className="space-y-4">
                      <textarea
                        value={jobDescriptionInput}
                        onChange={(e) => setJobDescriptionInput(e.target.value)}
                        rows={6}
                        placeholder="Paste the job description or role requirements here (e.g. Seeking Full Stack Engineer proficient in Laravel, PostgreSQL, Docker, REST APIs)..."
                        className="w-full p-3 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500 text-campusblue-900"
                      />

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="primary"
                          loading={analyzingJob}
                          onClick={handleAnalyzeJobDescription}
                        >
                          🔍 Analyze Match & Tailoring
                        </Button>
                      </div>

                      {jobAnalysisResult && (
                        <div className="pt-4 border-t border-campusblue-50 space-y-4">
                          <div className="flex items-center justify-between bg-campusblue-50/80 p-4 rounded-xl">
                            <div>
                              <span className="text-2xs uppercase font-bold text-campusblue-400">Target Match Score</span>
                              <div className="text-2xl font-black text-campusblue-900 mt-0.5">
                                {jobAnalysisResult.job_match_score}%
                              </div>
                            </div>
                            <span className="text-2xs text-campusblue-500">
                              Based on {jobAnalysisResult.extracted_skills?.length || 0} extracted technical requirements
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                              <span className="text-xs font-bold text-emerald-900 block mb-2">Matching Skills in Resume</span>
                              <div className="flex flex-wrap gap-1.5">
                                {jobAnalysisResult.matching_skills?.map((s: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-semibold rounded">
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg">
                              <span className="text-xs font-bold text-amber-900 block mb-2">Missing Target Keywords</span>
                              <div className="flex flex-wrap gap-1.5">
                                {jobAnalysisResult.missing_skills?.map((s: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-900 text-2xs font-semibold rounded">
                                    + {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actionable Recommendations with Rationale */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-700 mb-2">
                              Evidence-Based Recommendations & Rationale
                            </h4>
                            <div className="space-y-2">
                              {jobAnalysisResult.recommendations?.map((rec: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg border border-campusblue-100 bg-white text-xs space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-campusblue-900">{rec.title}</span>
                                    <span className="text-3xs px-1.5 py-0.2 rounded font-extrabold bg-blue-100 text-blue-800">
                                      {rec.priority}
                                    </span>
                                  </div>
                                  <p className="text-2xs text-campusblue-700">{rec.message}</p>
                                  <p className="text-3xs text-campusblue-500 italic">Why: {rec.rationale}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* TAB 3: QUALITY & ATS AUDIT */}
                {activeTab === "quality" && (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-campusblue-900">ATS Compatibility & Integrity Audit</h3>
                        <p className="text-2xs text-campusblue-500">Automated readability check, section validation, and unsupported claim detection</p>
                      </div>
                      <Button size="sm" variant="outline" loading={analyzingQuality} onClick={handleRunQualityAnalysis}>
                        🔄 Refresh Audit
                      </Button>
                    </div>

                    {selectedResume.analysis_summary ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-campusblue-50/50 rounded-lg text-center">
                            <span className="text-3xs font-bold text-campusblue-400 uppercase">Overall Quality</span>
                            <div className="text-xl font-black text-campusblue-900 mt-1">
                              {selectedResume.analysis_summary.quality_score}/100
                            </div>
                          </div>
                          <div className="p-3 bg-campusblue-50/50 rounded-lg text-center">
                            <span className="text-3xs font-bold text-campusblue-400 uppercase">ATS Compatibility</span>
                            <div className="text-xl font-black text-blue-600 mt-1">
                              {selectedResume.analysis_summary.ats_score}/100
                            </div>
                          </div>
                          <div className="p-3 bg-campusblue-50/50 rounded-lg text-center">
                            <span className="text-3xs font-bold text-campusblue-400 uppercase">Completeness</span>
                            <div className="text-xl font-black text-emerald-600 mt-1">
                              {selectedResume.analysis_summary.completeness_score}%
                            </div>
                          </div>
                        </div>

                        {/* Unsupported Claim Detection */}
                        {selectedResume.analysis_summary.unsupported_claims && selectedResume.analysis_summary.unsupported_claims.length > 0 ? (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                              ⚠️ Unsupported or Contradictory Claims Detected
                            </span>
                            <p className="text-2xs text-amber-800">
                              The following items are in this resume draft but are not backed by your official university records:
                            </p>
                            <div className="space-y-1">
                              {selectedResume.analysis_summary.unsupported_claims.map((claim: any, idx: number) => (
                                <div key={idx} className="text-2xs text-amber-900 pl-3 border-l-2 border-amber-400">
                                  <strong>{claim.type}:</strong> {claim.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-2xs text-emerald-800 font-medium">
                            ✓ All resume claims are fully grounded in your verified student profile.
                          </div>
                        )}

                        {/* Actionable Recommendations */}
                        {selectedResume.analysis_summary.recommendations && selectedResume.analysis_summary.recommendations.length > 0 && (
                          <div className="pt-2">
                            <span className="text-xs font-bold text-campusblue-800 block mb-1.5">Actionable Improvements:</span>
                            <ul className="list-disc pl-4 space-y-1 text-2xs text-campusblue-700">
                              {selectedResume.analysis_summary.recommendations.map((rec: string, idx: number) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        title="Audit analysis not yet executed"
                        description="Click Refresh Audit to evaluate ATS compatibility, completeness, and verify groundedness."
                        actionText="Run Quality Audit"
                        onAction={handleRunQualityAnalysis}
                      />
                    )}
                  </Card>
                )}

                {/* TAB 4: VERSIONS */}
                {activeTab === "versions" && (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-campusblue-900">Version History & Snapshots</h3>
                        <p className="text-2xs text-campusblue-500">Immutable versions created before major job applications</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCompareWithProfile}>
                          Compare with Profile
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => setShowVersionModal(true)}>
                          + Create Version Snapshot
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedResume.versions && selectedResume.versions.length > 0 ? (
                        selectedResume.versions.map((v) => (
                          <div key={v.id} className="p-3 rounded-lg border border-campusblue-100 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-campusblue-900">Version {v.version_number}</span>
                              <span className="text-campusblue-500 ml-2">— {v.change_summary}</span>
                              <span className="text-3xs text-campusblue-400 block mt-0.5">
                                Created on {new Date(v.created_at).toLocaleString()}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingContent(v.content);
                                setToastMessage(`Loaded Version ${v.version_number} snapshot into editor!`);
                              }}
                            >
                              Restore into Editor
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-campusblue-400">No version snapshots created yet.</p>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column: Actions, Approval, and PDF Export */}
              <div className="space-y-6">
                {/* Approval & Export Panel */}
                <Card className="bg-gradient-to-br from-white to-campusblue-50/50 border-campusblue-200">
                  <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-400 block mb-1">
                    Document Export & Verification
                  </span>
                  <h3 className="text-base font-black text-campusblue-900 mb-3">Official ATS PDF Export</h3>

                  <div className="space-y-3 text-xs">
                    <p className="text-2xs text-campusblue-600 leading-relaxed">
                      Per university placement governance, students must review and approve their resume draft before the official ATS PDF is generated.
                    </p>

                    <div className="p-3 bg-white rounded-lg border border-campusblue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-campusblue-800">Student Approval Status:</span>
                        {selectedResume.approved_by_student_at ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800">
                            Pending Approval
                          </span>
                        )}
                      </div>

                      {!selectedResume.approved_by_student_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
                          loading={approving}
                          onClick={handleApprove}
                        >
                          ✓ Confirm & Approve Resume
                        </Button>
                      )}
                    </div>

                    <Button
                      size="md"
                      variant="primary"
                      className="w-full text-xs"
                      disabled={!selectedResume.approved_by_student_at}
                      loading={exportingPdf}
                      onClick={handleExportPdf}
                    >
                      📄 Export & Download Verified PDF
                    </Button>

                    <Button
                      size="md"
                      variant="outline"
                      className="w-full text-xs"
                      disabled={!selectedResume.approved_by_student_at}
                      loading={exportingDocx}
                      onClick={handleExportDocx}
                    >
                      📝 Export & Download Word (.docx)
                    </Button>

                    {selectedResume.pdf_generated_at && (
                      <span className="text-3xs text-campusblue-400 block text-center">
                        Last generated: {new Date(selectedResume.pdf_generated_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </Card>

                {/* Resume Summary Card */}
                <Card>
                  <span className="text-3xs uppercase font-bold tracking-wider text-campusblue-400 block mb-2">
                    Resume Metadata
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-campusblue-50">
                      <span className="text-campusblue-500">Template</span>
                      <span className="font-semibold text-campusblue-900 capitalize">{selectedResume.template}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-campusblue-50">
                      <span className="text-campusblue-500">Target Role</span>
                      <span className="font-semibold text-campusblue-900">{selectedResume.target_role || "General"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-campusblue-50">
                      <span className="text-campusblue-500">Primary Placement Resume</span>
                      <span className="font-semibold text-campusblue-900">{selectedResume.is_primary ? "Yes" : "No"}</span>
                    </div>
                    {!selectedResume.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 text-2xs"
                        onClick={async () => {
                          await resumeApi.setPrimary(selectedResume.id);
                          setToastMessage("Set as primary placement resume!");
                          await fetchResumes();
                        }}
                      >
                        Set as Primary Resume
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No resumes created yet"
              description="Create your first tailored campus placement resume pre-populated from your verified student profile."
              actionText="+ Create Resume"
              onAction={() => setShowCreateModal(true)}
            />
          )}

          {/* Modal: Create Resume */}
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Create New Tailored Resume"
            subtitle="Pre-populated from your verified academic records, skills, and projects."
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                  Resume Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Full-Stack Engineer v1, Data Analyst - Acme Drive"
                  className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                  Target Role / Position
                </label>
                <input
                  type="text"
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value)}
                  placeholder="e.g. Associate Software Engineer, Backend Developer"
                  className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                  Resume Template Style
                </label>
                <select
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value as any)}
                  className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="modern">Modern (Contemporary Sans-Serif / Accent)</option>
                  <option value="classic">Classic (Formal Serif / Standard Corporate)</option>
                  <option value="technical">Technical (Dense Skills-First Engineering)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-campusblue-50">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={creating} onClick={handleCreateResume}>
                  Create Resume
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal: Version Snapshot */}
          <Modal
            isOpen={showVersionModal}
            onClose={() => setShowVersionModal(false)}
            title="Create Version Snapshot"
            subtitle="Save an immutable checkpoint of the current resume state."
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-2xs font-bold text-campusblue-800 uppercase mb-1">
                  Change Summary / Notes
                </label>
                <input
                  type="text"
                  value={versionSnapshotSummary}
                  onChange={(e) => setVersionSnapshotSummary(e.target.value)}
                  placeholder="e.g. Tailored for Google Campus Drive, added Docker highlights"
                  className="w-full p-2.5 text-xs rounded-lg border border-campusblue-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-campusblue-50">
                <Button variant="outline" size="sm" onClick={() => setShowVersionModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreateVersionSnapshot}>
                  Save Snapshot
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal: Diff / Profile Comparison */}
          {diffComparison && (
            <Modal
              isOpen={Boolean(diffComparison)}
              onClose={() => setDiffComparison(null)}
              title="Resume Content vs Profile Baseline Comparison"
              subtitle="Review customized resume sections against verified student source-of-truth records."
              size="6xl"
            >
              <div className="space-y-4">
                {/* View Format Switcher & Helper */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-campusblue-100">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-bold text-campusblue-500 uppercase tracking-wider">
                      Format:
                    </span>
                    <div className="inline-flex rounded-lg border border-campusblue-200 p-0.5 bg-campusblue-50/60">
                      <button
                        type="button"
                        onClick={() => setDiffViewMode("paper")}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                          diffViewMode === "paper"
                            ? "bg-white text-campusblue-900 shadow-xs"
                            : "text-campusblue-600 hover:text-campusblue-900"
                        }`}
                      >
                        📄 Document / Paper View
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffViewMode("code")}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                          diffViewMode === "code"
                            ? "bg-white text-campusblue-900 shadow-xs"
                            : "text-campusblue-600 hover:text-campusblue-900"
                        }`}
                      >
                        💻 Raw Code (JSON)
                      </button>
                    </div>
                  </div>

                  <p className="text-3xs text-campusblue-400">
                    Side-by-side verification: Compare tailored draft against verified institutional record
                  </p>
                </div>

                {/* Content Render: Realistic Paper Sheets or Raw JSON */}
                {diffViewMode === "paper" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto p-4 sm:p-6 bg-slate-100 rounded-xl">
                    <ResumePaperSheet
                      label={diffComparison.left.label}
                      content={diffComparison.left.content}
                      variant="primary"
                      template={selectedResume?.template}
                    />
                    <ResumePaperSheet
                      label={diffComparison.right.label}
                      content={diffComparison.right.content}
                      variant="baseline"
                      template={selectedResume?.template}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs max-h-[75vh] overflow-y-auto">
                    <div className="p-4 bg-campusblue-50/50 rounded-lg border border-campusblue-100">
                      <span className="font-bold text-campusblue-900 block mb-2">{diffComparison.left.label}</span>
                      <pre className="text-3xs text-campusblue-800 whitespace-pre-wrap font-mono">
                        {JSON.stringify(diffComparison.left.content, null, 2)}
                      </pre>
                    </div>
                    <div className="p-4 bg-emerald-50/40 rounded-lg border border-emerald-100">
                      <span className="font-bold text-emerald-900 block mb-2">{diffComparison.right.label}</span>
                      <pre className="text-3xs text-emerald-800 whitespace-pre-wrap font-mono">
                        {JSON.stringify(diffComparison.right.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          )}
        </div>
      )}
    </AppLayout>
  );
}
