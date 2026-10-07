"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { StudentProjectItem } from "./types";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: StudentProjectItem | null;
  onSuccess: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    technologies: "",
    project_url: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setForm({
          title: item.title,
          description: item.description || "",
          technologies: item.technologies || "",
          project_url: item.project_url || "",
        });
      } else {
        setForm({
          title: "",
          description: "",
          technologies: "",
          project_url: "",
        });
      }
      setFieldErrors({});
      setFormError("");
    }
  }, [item, isOpen]);

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
    if (!form.title.trim() || form.title.trim().length < 2) {
      errs.title = "Project title must be at least 2 characters.";
    }
    if (!form.description.trim() || form.description.trim().length < 5) {
      errs.description = "Project description must be at least 5 characters.";
    }
    if (form.project_url && !isValidUrl(form.project_url)) {
      errs.project_url = "Enter a valid URL (including http:// or https://).";
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
        title: form.title.trim(),
        description: form.description.trim(),
        technologies: form.technologies.trim() || undefined,
        project_url: form.project_url.trim() || undefined,
      };

      if (item) {
        await studentsApi.updateProject(item.id, payload);
      } else {
        await studentsApi.createProject(payload);
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
      title={item ? "Edit Capstone / Personal Project" : "Add Project"}
      subtitle="Showcase applied engineering experience, architecture, and live links."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <FormField label="Project Title" required error={fieldErrors.title}>
          <Input
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: "" });
            }}
            hasError={Boolean(fieldErrors.title)}
            placeholder="e.g. Distributed Task Scheduler"
          />
        </FormField>

        <FormField
          label="Project Description"
          required
          error={fieldErrors.description}
          helperText="Summarize architecture, responsibilities, and outcomes."
        >
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => {
              setForm({ ...form, description: e.target.value });
              if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: "" });
            }}
            hasError={Boolean(fieldErrors.description)}
            placeholder="Built a fault-tolerant job scheduler in Go using Raft consensus..."
          />
        </FormField>

        <FormField label="Technologies Used" helperText="Comma-separated (e.g. Go, Redis, Docker, gRPC)">
          <Input
            value={form.technologies}
            onChange={(e) => setForm({ ...form, technologies: e.target.value })}
            placeholder="e.g. Python, FastAPI, React, PostgreSQL"
          />
        </FormField>

        <FormField label="Live Demo / Repository URL" error={fieldErrors.project_url}>
          <Input
            type="url"
            value={form.project_url}
            onChange={(e) => {
              setForm({ ...form, project_url: e.target.value });
              if (fieldErrors.project_url) setFieldErrors({ ...fieldErrors, project_url: "" });
            }}
            hasError={Boolean(fieldErrors.project_url)}
            placeholder="https://github.com/username/project"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {item ? "Update Project" : "Add Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};



