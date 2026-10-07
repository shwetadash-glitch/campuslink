"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BasicInfo } from "./types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface LinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata?: BasicInfo["profile_metadata"] | null;
  onSuccess: () => void;
}

export const LinksModal: React.FC<LinksModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    preferred_job_roles: "",
    career_interests: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        linkedin_url: metadata?.linkedin_url || "",
        github_url: metadata?.github_url || "",
        portfolio_url: metadata?.portfolio_url || "",
        preferred_job_roles: (metadata?.preferred_job_roles || []).join(", "),
        career_interests: (metadata?.career_interests || []).join(", "),
      });
      setFieldErrors({});
      setFormError("");
    }
  }, [metadata, isOpen]);

  const isValidUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.linkedin_url && !isValidUrl(form.linkedin_url)) {
      errs.linkedin_url = "Enter a valid URL (including http:// or https://).";
    }
    if (form.github_url && !isValidUrl(form.github_url)) {
      errs.github_url = "Enter a valid URL (including http:// or https://).";
    }
    if (form.portfolio_url && !isValidUrl(form.portfolio_url)) {
      errs.portfolio_url = "Enter a valid URL (including http:// or https://).";
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
      const updatedMetadata = {
        ...metadata,
        linkedin_url: form.linkedin_url.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
        portfolio_url: form.portfolio_url.trim() || undefined,
        preferred_job_roles: form.preferred_job_roles
          ? form.preferred_job_roles.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        career_interests: form.career_interests
          ? form.career_interests.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      await studentsApi.updateLinks(updatedMetadata);
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
      title="Edit Professional Links & Career Interests"
      subtitle="Connect public profiles and signal target job roles to recruiters."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <FormField label="LinkedIn Profile URL" error={fieldErrors.linkedin_url} helperText="Must start with https://">
          <Input
            type="url"
            value={form.linkedin_url}
            onChange={(e) => {
              setForm({ ...form, linkedin_url: e.target.value });
              if (fieldErrors.linkedin_url) setFieldErrors({ ...fieldErrors, linkedin_url: "" });
            }}
            hasError={Boolean(fieldErrors.linkedin_url)}
            placeholder="https://linkedin.com/in/username"
          />
        </FormField>

        <FormField label="GitHub Profile URL" error={fieldErrors.github_url}>
          <Input
            type="url"
            value={form.github_url}
            onChange={(e) => {
              setForm({ ...form, github_url: e.target.value });
              if (fieldErrors.github_url) setFieldErrors({ ...fieldErrors, github_url: "" });
            }}
            hasError={Boolean(fieldErrors.github_url)}
            placeholder="https://github.com/username"
          />
        </FormField>

        <FormField label="Portfolio / Website URL" error={fieldErrors.portfolio_url}>
          <Input
            type="url"
            value={form.portfolio_url}
            onChange={(e) => {
              setForm({ ...form, portfolio_url: e.target.value });
              if (fieldErrors.portfolio_url) setFieldErrors({ ...fieldErrors, portfolio_url: "" });
            }}
            hasError={Boolean(fieldErrors.portfolio_url)}
            placeholder="https://myportfolio.dev"
          />
        </FormField>

        <FormField label="Preferred Job Roles" helperText="Comma-separated (e.g. Frontend Engineer, Backend Developer)">
          <Input
            value={form.preferred_job_roles}
            onChange={(e) => setForm({ ...form, preferred_job_roles: e.target.value })}
            placeholder="Full Stack Engineer, Cloud Architect"
          />
        </FormField>

        <FormField label="Career Interests / Focus Areas" helperText="Comma-separated (e.g. Distributed Systems, Generative AI)">
          <Input
            value={form.career_interests}
            onChange={(e) => setForm({ ...form, career_interests: e.target.value })}
            placeholder="Machine Learning, Cybersecurity, DevOps"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save Links
          </Button>
        </div>
      </form>
    </Modal>
  );
};



