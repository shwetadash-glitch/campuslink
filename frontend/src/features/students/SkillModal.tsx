"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StudentSkillItem } from "./types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: StudentSkillItem | null;
  onSuccess: () => void;
}

export const SkillModal: React.FC<SkillModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    skill_name: "",
    proficiency_level: "INTERMEDIATE" as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
    months_experience: 12,
    source: "SELF_REPORTED",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setForm({
          skill_name: item.skill_name,
          proficiency_level: item.proficiency_level,
          months_experience: item.months_experience,
          source: item.source || "SELF_REPORTED",
        });
      } else {
        setForm({
          skill_name: "",
          proficiency_level: "INTERMEDIATE",
          months_experience: 12,
          source: "SELF_REPORTED",
        });
      }
      setFieldErrors({});
      setFormError("");
    }
  }, [item, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.skill_name.trim()) {
      errs.skill_name = "Skill name is required.";
    }
    if (form.months_experience < 0 || form.months_experience > 600) {
      errs.months_experience = "Experience must be between 0 and 600 months.";
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
        skill_name: form.skill_name.trim(),
        proficiency_level: form.proficiency_level,
        months_experience: Number(form.months_experience),
        source: form.source,
      };

      if (item) {
        await studentsApi.updateSkill(item.id, payload);
      } else {
        await studentsApi.createSkill(payload);
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
      title={item ? "Edit Technical Skill" : "Add Technical Skill"}
      subtitle="Programming languages, frameworks, developer tools, or databases."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <FormField label="Skill Name" required error={fieldErrors.skill_name}>
          <Input
            value={form.skill_name}
            onChange={(e) => {
              setForm({ ...form, skill_name: e.target.value });
              if (fieldErrors.skill_name) setFieldErrors({ ...fieldErrors, skill_name: "" });
            }}
            hasError={Boolean(fieldErrors.skill_name)}
            placeholder="e.g. Python, React, PostgreSQL"
          />
        </FormField>

        <FormField label="Proficiency Level" required>
          <Select
            value={form.proficiency_level}
            onChange={(e: any) => setForm({ ...form, proficiency_level: e.target.value })}
          >
            <option value="BEGINNER">Beginner (Foundational awareness)</option>
            <option value="INTERMEDIATE">Intermediate (Can build features independently)</option>
            <option value="ADVANCED">Advanced (Deep practical mastery)</option>
            <option value="EXPERT">Expert (Production architecture & optimization)</option>
          </Select>
        </FormField>

        <FormField
          label="Experience in Months"
          required
          error={fieldErrors.months_experience}
          helperText="e.g. 12 = 1 year of practical or academic experience"
        >
          <Input
            type="number"
            min={0}
            max={600}
            value={form.months_experience}
            onChange={(e) => {
              setForm({ ...form, months_experience: parseInt(e.target.value) || 0 });
              if (fieldErrors.months_experience) setFieldErrors({ ...fieldErrors, months_experience: "" });
            }}
            hasError={Boolean(fieldErrors.months_experience)}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {item ? "Update Skill" : "Add Skill"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};



