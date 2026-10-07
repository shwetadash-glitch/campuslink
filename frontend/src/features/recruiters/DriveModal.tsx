"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { DriveData, JobData } from "./types";
import { recruitersApi } from "@/services/recruitersApi";
import { parseApiError } from "@/services/apiClient";

export interface DriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive?: DriveData | null;
  jobs: JobData[];
  onSuccess: () => void;
}

export const DriveModal: React.FC<DriveModalProps> = ({
  isOpen,
  onClose,
  drive,
  jobs,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    job_id: jobs[0]?.id || 0,
    name: "",
    description: "",
    date: "",
    start_time: "09:00",
    end_time: "17:00",
    registration_start: "",
    registration_deadline: "",
    mode: "IN_PERSON",
    venue: "Main Auditorium & Labs",
    capacity: 100,
    status: "DRAFT" as DriveData["status"],
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (drive) {
        setForm({
          job_id: drive.job_id,
          name: drive.name,
          description: drive.description || "",
          date: drive.date ? drive.date.slice(0, 10) : "",
          start_time: drive.start_time || "09:00",
          end_time: drive.end_time || "17:00",
          registration_start: drive.registration_start ? drive.registration_start.slice(0, 16) : "",
          registration_deadline: drive.registration_deadline ? drive.registration_deadline.slice(0, 16) : "",
          mode: drive.mode || "IN_PERSON",
          venue: drive.venue || "Main Auditorium & Labs",
          capacity: drive.capacity ?? 100,
          status: drive.status || "DRAFT",
        });
      } else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const defaultDate = nextWeek.toISOString().slice(0, 10);

        setForm({
          job_id: jobs[0]?.id || 0,
          name: "",
          description: "",
          date: defaultDate,
          start_time: "09:00",
          end_time: "17:00",
          registration_start: "",
          registration_deadline: "",
          mode: "IN_PERSON",
          venue: "Main Auditorium & Labs",
          capacity: 100,
          status: "DRAFT",
        });
      }
      setFieldErrors({});
      setFormError("");
    }
  }, [drive, isOpen, jobs]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.job_id) {
      errs.job_id = "Please select an associated job posting.";
    }
    if (!form.name.trim() || form.name.trim().length < 3) {
      errs.name = "Drive name must be at least 3 characters.";
    }
    if (!form.date) {
      errs.date = "Drive date is required.";
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (form.date < today) {
        errs.date = "Drive date cannot be in the past.";
      }
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      errs.end_time = "End time must be later than start time.";
    }
    if (form.capacity <= 0) {
      errs.capacity = "Capacity must be greater than zero.";
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
        job_id: Number(form.job_id),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        registration_start: form.registration_start ? new Date(form.registration_start).toISOString() : undefined,
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : undefined,
        mode: form.mode,
        venue: form.venue.trim() || undefined,
        capacity: Number(form.capacity),
        status: form.status,
      };

      if (drive) {
        await recruitersApi.updateDrive(drive.id, payload);
      } else {
        await recruitersApi.createDrive(payload);
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
      title={drive ? "Edit Placement Drive" : "Schedule Placement Drive"}
      subtitle="Organize on-campus or virtual interview events and registration windows."
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={formError} onDismiss={() => setFormError("")} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Target Job Posting" required error={fieldErrors.job_id}>
              <Select
                value={form.job_id}
                onChange={(e) => {
                  setForm({ ...form, job_id: parseInt(e.target.value) || 0 });
                  if (fieldErrors.job_id) setFieldErrors({ ...fieldErrors, job_id: "" });
                }}
                hasError={Boolean(fieldErrors.job_id)}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.status})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Status" required>
            <Select
              value={form.status}
              onChange={(e: any) => setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="REGISTRATION_OPEN">Registration Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Drive Event Name" required error={fieldErrors.name}>
          <Input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
            }}
            hasError={Boolean(fieldErrors.name)}
            placeholder="e.g. 2026 Campus Recruitment Drive - Day 1"
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Schedule notes, interview rounds, instructions..."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Drive Date" required error={fieldErrors.date}>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => {
                setForm({ ...form, date: e.target.value });
                if (fieldErrors.date) setFieldErrors({ ...fieldErrors, date: "" });
              }}
              hasError={Boolean(fieldErrors.date)}
            />
          </FormField>

          <FormField label="Start Time (24h)" required error={fieldErrors.start_time}>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </FormField>

          <FormField label="End Time (24h)" required error={fieldErrors.end_time}>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => {
                setForm({ ...form, end_time: e.target.value });
                if (fieldErrors.end_time) setFieldErrors({ ...fieldErrors, end_time: "" });
              }}
              hasError={Boolean(fieldErrors.end_time)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Mode">
            <Select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
            >
              <option value="IN_PERSON">In Person (On Campus)</option>
              <option value="VIRTUAL">Virtual (Video/Remote)</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </FormField>

          <FormField label="Venue / Location">
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="e.g. Computer Science Lab 3"
            />
          </FormField>

          <FormField label="Max Candidate Capacity" required error={fieldErrors.capacity}>
            <Input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => {
                setForm({ ...form, capacity: parseInt(e.target.value) || 0 });
                if (fieldErrors.capacity) setFieldErrors({ ...fieldErrors, capacity: "" });
              }}
              hasError={Boolean(fieldErrors.capacity)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-campusblue-50">
          <FormField label="Registration Start (Optional)">
            <Input
              type="datetime-local"
              value={form.registration_start}
              onChange={(e) => setForm({ ...form, registration_start: e.target.value })}
            />
          </FormField>

          <FormField label="Registration Deadline (Optional)" error={fieldErrors.registration_deadline}>
            <Input
              type="datetime-local"
              value={form.registration_deadline}
              onChange={(e) => {
                setForm({ ...form, registration_deadline: e.target.value });
                if (fieldErrors.registration_deadline) setFieldErrors({ ...fieldErrors, registration_deadline: "" });
              }}
              hasError={Boolean(fieldErrors.registration_deadline)}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-campusblue-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {drive ? "Update Drive" : "Schedule Drive"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};



