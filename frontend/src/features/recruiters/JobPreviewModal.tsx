"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobData } from "./types";

export interface JobPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobData | null;
  companyName?: string | null;
}

export const JobPreviewModal: React.FC<JobPreviewModalProps> = ({
  isOpen,
  onClose,
  job,
  companyName,
}) => {
  if (!job) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Candidate Job Preview"
      subtitle="This is how applicants and eligible students will see this job opportunity."
      size="2xl"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close Preview
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Header Block */}
        <div className="p-4 bg-campusblue-50 border border-campusblue-100 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-700 block">
                {companyName || "Hiring Company"}
              </span>
              <h2 className="text-lg font-bold text-campusblue-900 mt-0.5">{job.title}</h2>
            </div>
            <StatusBadge status={job.status} size="md" />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-campusblue-700 mt-2">
            <span>Type: <strong>{job.employment_type}</strong></span>
            <span>Mode: <strong>{job.remote_type || "On-site"}</strong></span>
            <span>Location: <strong>{job.location || "Flexible"}</strong></span>
            <span>Compensation: <strong className="text-campusblue-800">{job.salary_range || "Competitive"}</strong></span>
            <span>Openings: <strong>{job.openings ?? "—"}</strong></span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
            Role Description & Responsibilities
          </h4>
          <p className="text-xs text-campusblue-800 leading-relaxed whitespace-pre-line bg-white p-4 border border-campusblue-50 rounded-lg">
            {job.description}
          </p>
        </div>

        {/* Eligibility Criteria */}
        {job.eligibility_config && (
          <div className="p-4 bg-campusblue-50/50 border border-campusblue-50 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-900 mb-2">
              Candidate Eligibility Engine Requirements
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-campusblue-500 block text-2xs">Minimum CGPA:</span>
                <span className="font-bold text-campusblue-900">
                  {job.eligibility_config.min_cgpa ?? "None"} / 10.0
                </span>
              </div>
              <div>
                <span className="text-campusblue-500 block text-2xs">Maximum Backlogs:</span>
                <span className="font-bold text-campusblue-900">
                  {job.eligibility_config.max_backlogs ?? "None"}
                </span>
              </div>
              <div>
                <span className="text-campusblue-500 block text-2xs">Graduation Year:</span>
                <span className="font-bold text-campusblue-900">
                  {job.eligibility_config.graduation_year ?? "All"}
                </span>
              </div>
              <div>
                <span className="text-campusblue-500 block text-2xs">Allowed Branches:</span>
                <span className="font-bold text-campusblue-900">
                  {job.eligibility_config.allowed_branches?.join(", ") || "All Branches"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Required Skills */}
        {job.requirements && job.requirements.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Skill Requirements & Weights ({job.requirements.length})
            </h4>
            <div className="divide-y divide-gray-100 border border-campusblue-100 rounded-lg overflow-hidden">
              {job.requirements.map((r) => (
                <div key={r.id} className="p-3 bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-campusblue-900">{r.skill_name || `Skill #${r.skill_id}`}</span>
                    <StatusBadge status={r.required_proficiency} size="sm" />
                    {r.is_mandatory ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-bold bg-campusblue-50 text-campusblue-800 border border-campusblue-100">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-2xs bg-campusblue-50 text-campusblue-700">
                        Preferred
                      </span>
                    )}
                  </div>
                  <div className="text-right text-campusblue-500">
                    <span>Weight: <strong>{r.weight}x</strong></span>
                    {r.minimum_experience > 0 && (
                      <span className="ml-2">({r.minimum_experience} mo exp)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-2xs text-campusblue-300">
          Application Deadline: {job.application_deadline ? new Date(job.application_deadline).toLocaleString() : "Rolling admissions"}
        </div>
      </div>
    </Modal>
  );
};




