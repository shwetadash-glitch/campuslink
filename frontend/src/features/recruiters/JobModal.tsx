"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { JobData } from "./types";
import { recruitersApi } from "@/services/recruitersApi";
import { parseApiError } from "@/services/apiClient";

export interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: JobData | null;
  onSuccess: () => void;
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  job,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    employment_type: "Full-time",
    location: "Bangalore, India",
    remote_type: "Hybrid",
    salary_range: "10 - 15 LPA",
    openings: 5,
    application_deadline: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED",
    min_cgpa: 7.0,
    max_backlogs: 0,
    graduation_year: 2026,
    allowed_branches: "Computer Science, Information Technology",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (job) {
        let deadline = "";
        if (job.application_deadline) {
          deadline = job.application_deadline.slice(0, 16);
        }
        setForm({
          title: job.title,
          description: job.description,
          employment_type: job.employment_type || "Full-time",
          location: job.location || "",
          remote_type: job.remote_type || "Hybrid",
          salary_range: job.salary_range || "",
          openings: job.openings ?? 5,
          application_deadline: deadline,
          status: job.status || "DRAFT",
          min_cgpa: job.eligibility_config?.min_cgpa ?? 7.0,
          max_backlogs: job.eligibility_config?.max_backlogs ?? 0,
          graduation_year: job.eligibility_config?.graduation_year ?? 2026,
          allowed_branches: (job.eligibility_config?.allowed_branches || []).join(", ") || "Computer Science, Information Technology",
        });
      } else {
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        const defaultDeadline = nextMonth.toISOString().slice(0, 16);

        setForm({
          title: "",
          description: "",
          employment_type: "Full-time",
          location: "Bangalore, India",
          remote_type: "Hybrid",
          salary_range: "10 - 15 LPA",
          openings: 5,
          application_deadline: defaultDeadline,
          status: "DRAFT",
          min_cgpa: 7.0,
          max_backlogs: 0,
          graduation_year: 2026,
          allowed_branches: "Computer Science, Information Technology",
        });
      }
      setFieldErrors({});
      setFormError("");
    }
  }, [job, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 3) {
      errs.title = "Job title must be at least 3 characters.";
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      errs.description = "Job description must be at least 10 characters.";
    }
    if (form.openings <= 0) {
      errs.openings = "Openings must be greater than zero.";
    }
    if (form.application_deadline) {
      const d = new Date(form.application_deadline);
      if (d <= new Date()) {
        errs.application_deadline = "Application deadline must be a future datetime.";
      }
    }
    if (form.min_cgpa < 0 || form.min_cgpa > 10) {
      errs.min_cgpa = "Min CGPA must be between 0.0 and 10.0.";
    }
    if (form.max_backlogs < 0) {
      errs.max_backlogs = "Max backlogs cannot be negative.";
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      const branches = form.allowed_branches
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        employment_type: form.employment_type,
        location: form.location.trim() || undefined,
        remote_type: form.remote_type,
        salary_range: form.salary_range.trim() || undefined,
        openings: Number(form.openings),
        application_deadline: form.application_deadline
          ? new Date(form.application_deadline).toISOString()
          : undefined,
        status: form.status,
        eligibility_config: {
          min_cgpa: Number(form.min_cgpa),
          max_backlogs: Number(form.max_backlogs),
          graduation_year: Number(form.graduation_year),
          allowed_branches: branches,
        },
      };

      if (job) {
        await recruitersApi.updateJob(job.id, payload);
      } else {
        await recruitersApi.createJob(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const parsed = parseApiError(err);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={job ? "Edit Job Posting" : "Create New Job Posting"}
      subtitle="Define role parameters, salary, openings, and hard eligibility requirements."
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Job Title" required error={fieldErrors.title}>
              <Input
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: "" });
                }}
                hasError={Boolean(fieldErrors.title)}
                placeholder="e.g. Senior Software Engineer"
              />
            </FormField>
          </div>

          <FormField label="Status" required>
            <Select
              value={form.status}
              onChange={(e: any) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Job Description" required error={fieldErrors.description}>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => {
              setForm({ ...form, description: e.target.value });
              if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: "" });
            }}
            hasError={Boolean(fieldErrors.description)}
            placeholder="Responsibilities, requirements, tech stack..."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Employment Type">
            <Select
              value={form.employment_type}
              onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
            >
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </Select>
          </FormField>

          <FormField label="Remote Type">
            <Select
              value={form.remote_type}
              onChange={(e) => setForm({ ...form, remote_type: e.target.value })}
            >
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </Select>
          </FormField>

          <FormField label="Location">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Bangalore, India"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Salary / Compensation">
            <Input
              value={form.salary_range}
              onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
              placeholder="e.g. 12 - 16 LPA"
            />
          </FormField>

          <FormField label="Openings / Vacancies" required error={fieldErrors.openings}>
            <Input
              type="number"
              min={1}
              value={form.openings}
              onChange={(e) => {
                setForm({ ...form, openings: parseInt(e.target.value) || 0 });
                if (fieldErrors.openings) setFieldErrors({ ...fieldErrors, openings: "" });
              }}
              hasError={Boolean(fieldErrors.openings)}
            />
          </FormField>

          <FormField label="Application Deadline" error={fieldErrors.application_deadline}>
            <Input
              type="datetime-local"
              value={form.application_deadline}
              onChange={(e) => {
                setForm({ ...form, application_deadline: e.target.value });
                if (fieldErrors.application_deadline) setFieldErrors({ ...fieldErrors, application_deadline: "" });
              }}
              hasError={Boolean(fieldErrors.application_deadline)}
            />
          </FormField>
        </div>

        {/* Eligibility Criteria Sub-section */}
        <div className="pt-3 border-t border-campusblue-50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-campusblue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Eligibility Engine Rules
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Minimum CGPA (0-10)" error={fieldErrors.min_cgpa}>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={form.min_cgpa}
                onChange={(e) => {
                  setForm({ ...form, min_cgpa: parseFloat(e.target.value) || 0 });
                  if (fieldErrors.min_cgpa) setFieldErrors({ ...fieldErrors, min_cgpa: "" });
                }}
                hasError={Boolean(fieldErrors.min_cgpa)}
              />
            </FormField>

            <FormField label="Max Backlogs Allowed" error={fieldErrors.max_backlogs}>
              <Input
                type="number"
                min={0}
                value={form.max_backlogs}
                onChange={(e) => {
                  setForm({ ...form, max_backlogs: parseInt(e.target.value) || 0 });
                  if (fieldErrors.max_backlogs) setFieldErrors({ ...fieldErrors, max_backlogs: "" });
                }}
                hasError={Boolean(fieldErrors.max_backlogs)}
              />
            </FormField>

            <FormField label="Graduation Year">
              <Input
                type="number"
                min={2000}
                max={2100}
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Allowed Academic Branches" helperText="Comma-separated">
              <Input
                value={form.allowed_branches}
                onChange={(e) => setForm({ ...form, allowed_branches: e.target.value })}
                placeholder="Computer Science, Information Technology, Electronics"
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {job ? "Update Job" : "Create Job"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};



