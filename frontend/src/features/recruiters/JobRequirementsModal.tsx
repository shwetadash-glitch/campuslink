"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { JobData, SkillItem, JobRequirementItem } from "./types";
import { recruitersApi } from "@/services/recruitersApi";
import { parseApiError } from "@/services/apiClient";

export interface JobRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobData | null;
  skillsList: SkillItem[];
  onSuccess: () => void;
}

export const JobRequirementsModal: React.FC<JobRequirementsModalProps> = ({
  isOpen,
  onClose,
  job,
  skillsList,
  onSuccess,
}) => {
  const [requirements, setRequirements] = useState<JobRequirementItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [form, setForm] = useState({
    skill_id: skillsList[0]?.id || 1,
    required_proficiency: "INTERMEDIATE" as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
    weight: 1.0,
    is_mandatory: true,
    minimum_experience: 12,
    notes: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRequirements = async () => {
    if (!job) return;
    setLoadingList(true);
    try {
      const data = await recruitersApi.getJobRequirements(job.id);
      setRequirements(data);
    } catch (err: any) {
      console.error("Failed to load requirements", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen && job) {
      fetchRequirements();
      setForm({
        skill_id: skillsList[0]?.id || 1,
        required_proficiency: "INTERMEDIATE",
        weight: 1.0,
        is_mandatory: true,
        minimum_experience: 12,
        notes: "",
      });
      setFieldErrors({});
      setFormError("");
    }
  }, [isOpen, job, skillsList]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.weight < 0.1 || form.weight > 10.0) {
      errs.weight = "Weight must be between 0.1 and 10.0.";
    }
    if (form.minimum_experience < 0) {
      errs.minimum_experience = "Minimum experience cannot be negative.";
    }
    // Duplicate check
    const isDuplicate = requirements.some((r) => r.skill_id === Number(form.skill_id));
    if (isDuplicate) {
      errs.skill_id = "This skill is already added to this job.";
    }
    return errs;
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFieldErrors({});

    try {
      await recruitersApi.createJobRequirement(job.id, {
        skill_id: Number(form.skill_id),
        required_proficiency: form.required_proficiency,
        weight: Number(form.weight),
        is_mandatory: form.is_mandatory,
        minimum_experience: Number(form.minimum_experience),
        notes: form.notes.trim() || undefined,
      });

      await fetchRequirements();
      onSuccess();
    } catch (err: any) {
      const parsed = parseApiError(err);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    if (!job) return;
    setDeletingId(reqId);
    try {
      await recruitersApi.deleteJobRequirement(job.id, reqId);
      await fetchRequirements();
      onSuccess();
    } catch (err: any) {
      const parsed = parseApiError(err);
      setFormError(parsed.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getSkillName = (skillId: number) => {
    return skillsList.find((s) => s.id === skillId)?.name || `Skill #${skillId}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Skill Requirements: ${job?.title || ""}`}
      subtitle="Define mandatory and preferred skills used by the skill-gap & readiness engine."
      size="2xl"
    >
      <div className="space-y-6">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        {/* Existing requirements list */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
            Active Skill Requirements ({requirements.length})
          </h4>

          {loadingList ? (
            <p className="text-xs text-campusblue-500 py-4 text-center">Loading requirements...</p>
          ) : requirements.length > 0 ? (
            <div className="divide-y divide-gray-100 border border-campusblue-100 rounded-lg overflow-hidden">
              {requirements.map((r) => (
                <div key={r.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-campusblue-900">{r.skill_name || getSkillName(r.skill_id)}</span>
                    <StatusBadge status={r.required_proficiency} size="sm" />
                    {r.is_mandatory ? (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-campusblue-50 text-campusblue-800 border border-campusblue-100">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-campusblue-50 text-campusblue-700">
                        Preferred
                      </span>
                    )}
                    <span className="text-campusblue-500">Weight: {r.weight}x</span>
                    <span className="text-campusblue-500">{r.minimum_experience} mo exp</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    loading={deletingId === r.id}
                    onClick={() => handleDeleteRequirement(r.id)}
                    className="text-campusblue-700 hover:text-campusblue-800 hover:bg-campusblue-50"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No requirements added yet"
              description="Add target technical competencies below to enable skill-gap analysis for candidates."
            />
          )}
        </div>

        {/* Add new requirement form */}
        <div className="bg-campusblue-50 p-4 rounded-xl border border-campusblue-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-900 mb-3">
            Add New Requirement
          </h4>

          <form onSubmit={handleAddRequirement} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Skill" required error={fieldErrors.skill_id}>
                <Select
                  value={form.skill_id}
                  onChange={(e) => {
                    setForm({ ...form, skill_id: parseInt(e.target.value) || 1 });
                    if (fieldErrors.skill_id) setFieldErrors({ ...fieldErrors, skill_id: "" });
                  }}
                  hasError={Boolean(fieldErrors.skill_id)}
                >
                  {skillsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.category ? `(${s.category})` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Proficiency Level" required>
                <Select
                  value={form.required_proficiency}
                  onChange={(e: any) => setForm({ ...form, required_proficiency: e.target.value })}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Weight (0.1 - 10.0)" required error={fieldErrors.weight}>
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={10.0}
                  value={form.weight}
                  onChange={(e) => {
                    setForm({ ...form, weight: parseFloat(e.target.value) || 0.1 });
                    if (fieldErrors.weight) setFieldErrors({ ...fieldErrors, weight: "" });
                  }}
                  hasError={Boolean(fieldErrors.weight)}
                />
              </FormField>

              <FormField label="Min Experience (Months)" required error={fieldErrors.minimum_experience}>
                <Input
                  type="number"
                  min={0}
                  value={form.minimum_experience}
                  onChange={(e) => {
                    setForm({ ...form, minimum_experience: parseInt(e.target.value) || 0 });
                    if (fieldErrors.minimum_experience) setFieldErrors({ ...fieldErrors, minimum_experience: "" });
                  }}
                  hasError={Boolean(fieldErrors.minimum_experience)}
                />
              </FormField>
            </div>

            <div className="pt-1">
              <Checkbox
                id="is_mandatory_req"
                label="Mandatory Requirement"
                description="Students lacking this skill will incur a critical gap penalty."
                checked={form.is_mandatory}
                onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" loading={submitting}>
                Add Requirement
              </Button>
            </div>
          </form>
        </div>

        <div className="flex justify-end pt-3 border-t border-campusblue-50">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};




