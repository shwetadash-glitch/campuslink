"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/forms/FormError";
import { studentsApi } from "@/services/studentsApi";
import { parseApiError } from "@/services/apiClient";

export interface ResumeCardProps {
  resumeUrl?: string | null;
  onUploadSuccess: () => void;
}

export const ResumeCard: React.FC<ResumeCardProps> = ({
  resumeUrl,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf" && !selected.name.endsWith(".pdf")) {
        setError("Only PDF documents (.pdf) are allowed.");
        setFile(null);
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setError("Resume file size must not exceed 5 MB.");
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a valid PDF file first.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      await studentsApi.uploadResume(file);
      setSuccess("Resume uploaded successfully!");
      setFile(null);
      onUploadSuccess();
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card
      title="Resume / CV"
      subtitle="PDF format only (Max 5 MB). Used by recruiters and the matching engine."
    >
      <div className="space-y-4">
        {resumeUrl ? (
          <div className="p-4 bg-campusblue-50/60 border border-campusblue-100 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-campusblue-50 flex items-center justify-center text-campusblue-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-campusblue-900">Resume Uploaded</h4>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${resumeUrl.replace("/api/v1", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-campusblue-800 hover:underline inline-flex items-center gap-1 mt-0.5"
                >
                  <span>View Uploaded PDF</span>
                  <span>&nearr;</span>
                </a>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-campusblue-50 text-campusblue-900">
              Active
            </span>
          </div>
        ) : (
          <div className="p-4 bg-campusblue-50/60 border border-campusblue-100 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-campusblue-50 flex items-center justify-center text-campusblue-800 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xs text-campusblue-900">
              No resume uploaded yet. Recruiters prioritize applicants with an active resume document.
            </p>
          </div>
        )}

        {error && <FormError error={error} onDismiss={() => setError("")} />}
        {success && (
          <div className="p-3 bg-campusblue-50 border border-campusblue-100 text-campusblue-800 text-xs rounded-lg">
            {success}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="block w-full text-xs text-campusblue-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-campusblue-50 file:text-campusblue-800 hover:file:bg-campusblue-50 cursor-pointer"
          />
          <Button
            size="sm"
            onClick={handleUpload}
            loading={uploading}
            disabled={!file || uploading}
            className="w-full sm:w-auto shrink-0"
          >
            Upload Resume
          </Button>
        </div>
      </div>
    </Card>
  );
};




