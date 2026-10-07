"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { BasicInfo } from "./types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface BasicInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BasicInfo | null;
  onSuccess: () => void;
}

export const BasicInfoModal: React.FC<BasicInfoModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    dob: "",
    gender: "MALE",
    branch: "Computer Science",
    graduation_year: 2026,
    cgpa: 8.0,
    backlogs_current: 0,
    backlogs_history: 0,
    bio: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData && isOpen) {
      setForm({
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        phone: initialData.phone || "",
        dob: initialData.dob || "",
        gender: initialData.gender || "MALE",
        branch: initialData.branch || "Computer Science",
        graduation_year: initialData.graduation_year || 2026,
        cgpa: initialData.cgpa ?? 8.0,
        backlogs_current: initialData.backlogs_current ?? 0,
        backlogs_history: initialData.backlogs_history ?? 0,
        bio: initialData.profile_metadata?.bio || "",
      });
      setFieldErrors({});
      setFormError("");
    }
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required.";
    if (!form.last_name.trim()) errs.last_name = "Last name is required.";
    if (!form.phone.trim()) {
      errs.phone = "Phone number is required.";
    } else if (!/^[0-9+() -]{10,15}$/.test(form.phone.trim())) {
      errs.phone = "Enter a valid phone number (10-15 digits).";
    }
    if (form.dob) {
      const dobDate = new Date(form.dob);
      if (dobDate > new Date()) errs.dob = "Date of birth cannot be in the future.";
    }
    if (form.cgpa < 0 || form.cgpa > 10) {
      errs.cgpa = "CGPA must be between 0.0 and 10.0.";
    }
    if (form.backlogs_current < 0) {
      errs.backlogs_current = "Current backlogs cannot be negative.";
    }
    if (form.backlogs_history < 0) {
      errs.backlogs_history = "Total backlogs cannot be negative.";
    }
    if (form.graduation_year < 2000 || form.graduation_year > 2100) {
      errs.graduation_year = "Graduation year must be between 2000 and 2100.";
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
      await studentsApi.updateBasicInfo({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        dob: form.dob || null,
        gender: form.gender,
        branch: form.branch.trim(),
        graduation_year: Number(form.graduation_year),
        cgpa: Number(form.cgpa),
        backlogs_current: Number(form.backlogs_current),
        backlogs_history: Number(form.backlogs_history),
        profile_metadata: {
          ...initialData?.profile_metadata,
          bio: form.bio.trim() || undefined,
        },
      });
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
      title="Edit Personal & Academic Details"
      subtitle="Update basic information, contact details, and academic standing."
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" required error={fieldErrors.first_name}>
            <Input
              value={form.first_name}
              onChange={(e) => {
                setForm({ ...form, first_name: e.target.value });
                if (fieldErrors.first_name) setFieldErrors({ ...fieldErrors, first_name: "" });
              }}
              hasError={Boolean(fieldErrors.first_name)}
              placeholder="e.g. Rahul"
            />
          </FormField>

          <FormField label="Last Name" required error={fieldErrors.last_name}>
            <Input
              value={form.last_name}
              onChange={(e) => {
                setForm({ ...form, last_name: e.target.value });
                if (fieldErrors.last_name) setFieldErrors({ ...fieldErrors, last_name: "" });
              }}
              hasError={Boolean(fieldErrors.last_name)}
              placeholder="e.g. Sharma"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Phone" required error={fieldErrors.phone}>
            <Input
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: "" });
              }}
              hasError={Boolean(fieldErrors.phone)}
              placeholder="+91 9876543210"
            />
          </FormField>

          <FormField label="Date of Birth" error={fieldErrors.dob}>
            <Input
              type="date"
              value={form.dob}
              onChange={(e) => {
                setForm({ ...form, dob: e.target.value });
                if (fieldErrors.dob) setFieldErrors({ ...fieldErrors, dob: "" });
              }}
              hasError={Boolean(fieldErrors.dob)}
            />
          </FormField>

          <FormField label="Gender">
            <Select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Branch / Department" required error={fieldErrors.branch}>
            <Input
              value={form.branch}
              onChange={(e) => {
                setForm({ ...form, branch: e.target.value });
                if (fieldErrors.branch) setFieldErrors({ ...fieldErrors, branch: "" });
              }}
              hasError={Boolean(fieldErrors.branch)}
              placeholder="Computer Science"
            />
          </FormField>

          <FormField label="Graduation Year" required error={fieldErrors.graduation_year}>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={form.graduation_year}
              onChange={(e) => {
                setForm({ ...form, graduation_year: parseInt(e.target.value) || 0 });
                if (fieldErrors.graduation_year) setFieldErrors({ ...fieldErrors, graduation_year: "" });
              }}
              hasError={Boolean(fieldErrors.graduation_year)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Current CGPA" required error={fieldErrors.cgpa} helperText="Scale of 0.0 to 10.0">
            <Input
              type="number"
              step="0.01"
              min={0}
              max={10}
              value={form.cgpa}
              onChange={(e) => {
                setForm({ ...form, cgpa: parseFloat(e.target.value) || 0 });
                if (fieldErrors.cgpa) setFieldErrors({ ...fieldErrors, cgpa: "" });
              }}
              hasError={Boolean(fieldErrors.cgpa)}
            />
          </FormField>

          <FormField label="Current Backlogs" required error={fieldErrors.backlogs_current}>
            <Input
              type="number"
              min={0}
              value={form.backlogs_current}
              onChange={(e) => {
                setForm({ ...form, backlogs_current: parseInt(e.target.value) || 0 });
                if (fieldErrors.backlogs_current) setFieldErrors({ ...fieldErrors, backlogs_current: "" });
              }}
              hasError={Boolean(fieldErrors.backlogs_current)}
            />
          </FormField>

          <FormField label="Total Backlogs (History)" required error={fieldErrors.backlogs_history}>
            <Input
              type="number"
              min={0}
              value={form.backlogs_history}
              onChange={(e) => {
                setForm({ ...form, backlogs_history: parseInt(e.target.value) || 0 });
                if (fieldErrors.backlogs_history) setFieldErrors({ ...fieldErrors, backlogs_history: "" });
              }}
              hasError={Boolean(fieldErrors.backlogs_history)}
            />
          </FormField>
        </div>

        <FormField label="Professional Bio" error={fieldErrors.bio} helperText="Max 1000 characters. Summarize your background.">
          <Textarea
            rows={3}
            maxLength={1000}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Passionate software developer interested in distributed systems..."
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};



