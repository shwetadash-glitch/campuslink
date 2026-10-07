"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StudentCertificationItem } from "./types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface CertModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: StudentCertificationItem | null;
  onSuccess: () => void;
}

export const CertModal: React.FC<CertModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: "",
    issuing_org: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setForm({
          name: item.name,
          issuing_org: item.issuing_org,
          issue_date: item.issue_date || "",
          expiry_date: item.expiry_date || "",
          credential_id: item.credential_id || "",
        });
      } else {
        setForm({
          name: "",
          issuing_org: "",
          issue_date: "",
          expiry_date: "",
          credential_id: "",
        });
      }
      setFieldErrors({});
      setFormError("");
      setProofFile(null);
    }
  }, [item, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = "Certification name must be at least 2 characters.";
    }
    if (!form.issuing_org.trim() || form.issuing_org.trim().length < 2) {
      errs.issuing_org = "Issuing organization must be at least 2 characters.";
    }
    if (form.issue_date) {
      const issueD = new Date(form.issue_date);
      if (issueD > new Date()) {
        errs.issue_date = "Issue date cannot be in the future.";
      }
    }
    if (form.issue_date && form.expiry_date) {
      const issueD = new Date(form.issue_date);
      const expiryD = new Date(form.expiry_date);
      if (expiryD < issueD) {
        errs.expiry_date = "Expiry date cannot precede issue date.";
      }
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
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("issuing_org", form.issuing_org.trim());
      if (form.issue_date) formData.append("issue_date", form.issue_date);
      if (form.expiry_date) formData.append("expiry_date", form.expiry_date);
      if (form.credential_id) formData.append("credential_id", form.credential_id.trim());
      if (proofFile) formData.append("proof_file", proofFile);

      if (item) {
        await studentsApi.updateCertification(item.id, formData);
      } else {
        await studentsApi.createCertification(formData);
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
      title={item ? "Edit Certification" : "Add Industry Certification"}
      subtitle="Credentials from AWS, GCP, Microsoft, Coursera, etc."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <FormField label="Certification Name" required error={fieldErrors.name}>
          <Input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
            }}
            hasError={Boolean(fieldErrors.name)}
            placeholder="e.g. AWS Certified Solutions Architect - Associate"
          />
        </FormField>

        <FormField label="Issuing Organization" required error={fieldErrors.issuing_org}>
          <Input
            value={form.issuing_org}
            onChange={(e) => {
              setForm({ ...form, issuing_org: e.target.value });
              if (fieldErrors.issuing_org) setFieldErrors({ ...fieldErrors, issuing_org: "" });
            }}
            hasError={Boolean(fieldErrors.issuing_org)}
            placeholder="e.g. Amazon Web Services (AWS)"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Issue Date" error={fieldErrors.issue_date}>
            <Input
              type="date"
              value={form.issue_date}
              onChange={(e) => {
                setForm({ ...form, issue_date: e.target.value });
                if (fieldErrors.issue_date) setFieldErrors({ ...fieldErrors, issue_date: "" });
              }}
              hasError={Boolean(fieldErrors.issue_date)}
            />
          </FormField>

          <FormField label="Expiry Date" error={fieldErrors.expiry_date} helperText="Leave empty if non-expiring">
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(e) => {
                setForm({ ...form, expiry_date: e.target.value });
                if (fieldErrors.expiry_date) setFieldErrors({ ...fieldErrors, expiry_date: "" });
              }}
              hasError={Boolean(fieldErrors.expiry_date)}
            />
          </FormField>
        </div>

        <FormField label="Credential ID / Verification URL" helperText="Optional public license number or credential URL">
          <Input
            value={form.credential_id}
            onChange={(e) => setForm({ ...form, credential_id: e.target.value })}
            placeholder="e.g. AWS-ASA-12345678"
          />
        </FormField>

        <FormField label="Proof Document (PDF, Optional)" error={fieldErrors.proof_file}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) setProofFile(e.target.files[0]);
              else setProofFile(null);
            }}
            className="block w-full text-sm text-campusblue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-campusblue-50 file:text-campusblue-800 hover:file:bg-campusblue-50 cursor-pointer"
          />
          {item?.proof_path && !proofFile && (
            <p className="mt-1 text-xs text-campusblue-500 flex items-center gap-1">
              <svg className="w-3 h-3 text-campusblue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Current proof document is attached. Uploading a new one will replace it.
            </p>
          )}
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {item ? "Update Certification" : "Add Certification"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};




