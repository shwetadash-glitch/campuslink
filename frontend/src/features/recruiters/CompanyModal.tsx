"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CompanyData } from "./types";
import { recruitersApi } from "@/services/recruitersApi";
import { parseApiError } from "@/services/apiClient";

export interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: CompanyData | null;
  onSuccess: (data?: any) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: "",
    industry: "",
    size: "51-200",
    website: "",
    headquarters: "",
    description: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: company?.name || "",
        industry: company?.industry || "",
        size: company?.size || "51-200",
        website: company?.website || "",
        headquarters: company?.headquarters || "",
        description: company?.description || "",
      });
      setFieldErrors({});
      setFormError("");
    }
  }, [company, isOpen]);

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
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = "Company name must be at least 2 characters.";
    }
    if (form.website && !isValidUrl(form.website)) {
      errs.website = "Enter a valid URL (including http:// or https://).";
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
      await recruitersApi.updateCompany({
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        size: form.size,
        website: form.website.trim() || undefined,
        headquarters: form.headquarters.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      onSuccess({ name: form.name.trim(), industry: form.industry.trim() || undefined, size: form.size, website: form.website.trim() || undefined, headquarters: form.headquarters.trim() || undefined, description: form.description.trim() || undefined });
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
      title="Edit Company Profile"
      subtitle="Corporate identity, industry classification, and headquarters."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <FormField label="Company Name" required error={fieldErrors.name}>
          <Input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
            }}
            hasError={Boolean(fieldErrors.name)}
            placeholder="e.g. Acme Technologies Inc."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Industry / Sector">
            <Input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="e.g. Information Technology"
            />
          </FormField>

          <FormField label="Company Size">
            <Select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            >
              <option value="1-50">1-50 employees (Early Stage)</option>
              <option value="51-200">51-200 employees (Growth)</option>
              <option value="201-500">201-500 employees (Mid-Market)</option>
              <option value="501-1000">501-1000 employees (Large)</option>
              <option value="1000+">1000+ employees (Enterprise)</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Website URL" error={fieldErrors.website} helperText="Must include https://">
            <Input
              type="url"
              value={form.website}
              onChange={(e) => {
                setForm({ ...form, website: e.target.value });
                if (fieldErrors.website) setFieldErrors({ ...fieldErrors, website: "" });
              }}
              hasError={Boolean(fieldErrors.website)}
              placeholder="https://acme.com"
            />
          </FormField>

          <FormField label="Headquarters">
            <Input
              value={form.headquarters}
              onChange={(e) => setForm({ ...form, headquarters: e.target.value })}
              placeholder="e.g. Bangalore, India"
            />
          </FormField>
        </div>

        <FormField label="Company Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Pioneering AI cloud infrastructure for global organizations..."
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save Company
          </Button>
        </div>
      </form>
    </Modal>
  );
};



