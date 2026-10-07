"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AcademicHistoryItem } from "./types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface AcademicModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: AcademicHistoryItem | null;
  onSuccess: () => void;
}

export const AcademicModal: React.FC<AcademicModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    qualification: "Bachelor of Technology",
    institution: "",
    specialization: "",
    start_year: 2022,
    end_year: 2026,
    score_type: "CGPA",
    score_value: 8.5,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setForm({
          qualification: item.qualification,
          institution: item.institution,
          specialization: item.specialization || "",
          start_year: item.start_year || 2022,
          end_year: item.end_year || 2026,
          score_type: item.score_type || "CGPA",
          score_value: item.score_value ?? 8.5,
        });
      } else {
        setForm({
          qualification: "Bachelor of Technology",
          institution: "",
          specialization: "",
          start_year: 2022,
          end_year: 2026,
          score_type: "CGPA",
          score_value: 8.5,
        });
      }
      setFieldErrors({});
      setFormError("");
    }
  }, [item, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.qualification.trim()) errs.qualification = "Qualification is required.";
    if (!form.institution.trim()) errs.institution = "Institution is required.";
    if (form.start_year && form.end_year && form.start_year > form.end_year) {
      errs.end_year = "End year must be greater than or equal to start year.";
    }
    if (form.score_type === "CGPA") {
      if (form.score_value < 0 || form.score_value > 10) {
        errs.score_value = "CGPA score must be between 0.0 and 10.0.";
      }
    } else if (form.score_type === "PERCENTAGE") {
      if (form.score_value < 0 || form.score_value > 100) {
        errs.score_value = "Percentage score must be between 0% and 100%.";
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
      const payload = {
        qualification: form.qualification.trim(),
        institution: form.institution.trim(),
        specialization: form.specialization.trim() || undefined,
        start_year: Number(form.start_year),
        end_year: Number(form.end_year),
        score_type: form.score_type,
        score_value: Number(form.score_value),
      };

      if (item) {
        await studentsApi.updateAcademicHistory(item.id, payload);
      } else {
        await studentsApi.createAcademicHistory(payload);
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
      title={item ? "Edit Academic Record" : "Add Academic History"}
      subtitle="Degrees, diplomas, and secondary school achievements."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <FormField label="Qualification / Degree" required error={fieldErrors.qualification}>
          <Input
            value={form.qualification}
            onChange={(e) => {
              setForm({ ...form, qualification: e.target.value });
              if (fieldErrors.qualification) setFieldErrors({ ...fieldErrors, qualification: "" });
            }}
            hasError={Boolean(fieldErrors.qualification)}
            placeholder="e.g. Bachelor of Technology"
          />
        </FormField>

        <FormField label="Institution / University" required error={fieldErrors.institution}>
          <Input
            value={form.institution}
            onChange={(e) => {
              setForm({ ...form, institution: e.target.value });
              if (fieldErrors.institution) setFieldErrors({ ...fieldErrors, institution: "" });
            }}
            hasError={Boolean(fieldErrors.institution)}
            placeholder="e.g. National Institute of Technology"
          />
        </FormField>

        <FormField label="Specialization / Stream" error={fieldErrors.specialization}>
          <Input
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            placeholder="e.g. Computer Science and Engineering"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start Year">
            <Input
              type="number"
              min={1980}
              max={2100}
              value={form.start_year}
              onChange={(e) => setForm({ ...form, start_year: parseInt(e.target.value) || 0 })}
            />
          </FormField>

          <FormField label="End Year / Expected" error={fieldErrors.end_year}>
            <Input
              type="number"
              min={1980}
              max={2100}
              value={form.end_year}
              onChange={(e) => {
                setForm({ ...form, end_year: parseInt(e.target.value) || 0 });
                if (fieldErrors.end_year) setFieldErrors({ ...fieldErrors, end_year: "" });
              }}
              hasError={Boolean(fieldErrors.end_year)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Score System" required>
            <Select
              value={form.score_type}
              onChange={(e) => {
                const newType = e.target.value;
                setForm({
                  ...form,
                  score_type: newType,
                  score_value: newType === "CGPA" ? 8.5 : 85,
                });
              }}
            >
              <option value="CGPA">CGPA (0 - 10)</option>
              <option value="PERCENTAGE">Percentage (0 - 100%)</option>
            </Select>
          </FormField>

          <FormField
            label={form.score_type === "CGPA" ? "CGPA (0 - 10)" : "Percentage (0 - 100)"}
            required
            error={fieldErrors.score_value}
          >
            <Input
              type="number"
              step={form.score_type === "CGPA" ? "0.01" : "0.1"}
              value={form.score_value}
              onChange={(e) => {
                setForm({ ...form, score_value: parseFloat(e.target.value) || 0 });
                if (fieldErrors.score_value) setFieldErrors({ ...fieldErrors, score_value: "" });
              }}
              hasError={Boolean(fieldErrors.score_value)}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {item ? "Update Record" : "Save Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};



