"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { recruitersApi } from "@/services/recruitersApi";

export interface CandidateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number | null;
}

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      setError("");
      recruitersApi
        .getCandidateProfile(studentId)
        .then((data) => setProfile(data))
        .catch((err) => setError(err?.message || "Failed to load candidate profile."))
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [isOpen, studentId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profile ? `${profile.first_name} ${profile.last_name}` : "Candidate Profile"}
      subtitle={profile ? `Identifier: ${profile.student_identifier} • Department: ${profile.branch}` : ""}
      size="2xl"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close Profile
        </Button>
      }
    >
      {loading ? (
        <LoadingState message="Loading candidate credentials and academic records..." />
      ) : error ? (
        <div className="p-4 bg-campusblue-50 border border-campusblue-100 text-campusblue-800 text-xs rounded-lg">
          {error}
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Academic & Contact Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-campusblue-50 p-4 rounded-xl">
            <div>
              <span className="text-campusblue-300 block text-2xs">CGPA:</span>
              <span className="font-bold text-campusblue-700 text-sm">{profile.cgpa} / 10.0</span>
            </div>
            <div>
              <span className="text-campusblue-300 block text-2xs">Active Backlogs:</span>
              <span className={`font-bold text-sm ${profile.backlogs_current > 0 ? "text-campusblue-700" : "text-campusblue-700"}`}>
                {profile.backlogs_current}
              </span>
            </div>
            <div>
              <span className="text-campusblue-300 block text-2xs">Graduation:</span>
              <span className="font-semibold text-campusblue-900 text-sm">{profile.graduation_year || "—"}</span>
            </div>
            <div>
              <span className="text-campusblue-300 block text-2xs">Contact Phone:</span>
              <span className="font-semibold text-campusblue-900 text-sm">{profile.phone || "—"}</span>
            </div>
          </div>

          {/* Resume View */}
          {profile.resume_url && (
            <div className="p-3.5 bg-campusblue-50 border border-campusblue-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-campusblue-900 font-semibold">
                <span>📄 Candidate Resume Available</span>
              </div>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${profile.resume_url.replace("/api/v1", "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-campusblue-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Open Resume PDF</span>
                <span>&nearr;</span>
              </a>
            </div>
          )}

          {/* Bio */}
          {profile.profile_metadata?.bio && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-1">
                Candidate Bio
              </h4>
              <p className="text-xs text-campusblue-800 leading-relaxed bg-white p-3 border border-campusblue-50 rounded-lg">
                {profile.profile_metadata.bio}
              </p>
            </div>
          )}

          {/* Technical Skills */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Verified Skills ({profile.skills?.length || 0})
            </h4>
            {profile.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s: any) => (
                  <div key={s.id} className="p-2 bg-campusblue-50 border border-campusblue-100 rounded-lg flex items-center gap-2 text-xs">
                    <span className="font-semibold text-campusblue-900">{s.skill_name}</span>
                    <StatusBadge status={s.proficiency_level} size="sm" />
                    <span className="text-2xs text-campusblue-300">{s.months_experience} mo</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-campusblue-300">No skills listed.</p>
            )}
          </div>

          {/* Projects */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Applied Projects ({profile.projects?.length || 0})
            </h4>
            {profile.projects && profile.projects.length > 0 ? (
              <div className="space-y-2">
                {profile.projects.map((p: any) => (
                  <div key={p.id} className="p-3 bg-white border border-campusblue-100 rounded-lg text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-campusblue-900">{p.title}</span>
                      {p.project_url && (
                        <a href={p.project_url} target="_blank" rel="noreferrer" className="text-campusblue-700 hover:underline">
                          Code &rarr;
                        </a>
                      )}
                    </div>
                    <p className="text-campusblue-700">{p.description}</p>
                    {p.technologies && (
                      <span className="text-2xs text-campusblue-300 block mt-1">Tech: {p.technologies}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-campusblue-300">No projects recorded.</p>
            )}
          </div>

          {/* Certifications */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Certifications ({profile.certifications?.length || 0})
            </h4>
            {profile.certifications && profile.certifications.length > 0 ? (
              <div className="divide-y divide-gray-100 border border-campusblue-100 rounded-lg overflow-hidden text-xs">
                {profile.certifications.map((c: any) => (
                  <div key={c.id} className="p-2.5 bg-white flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-campusblue-900 block">{c.name}</span>
                      <span className="text-2xs text-campusblue-500">Issuer: {c.issuing_org}</span>
                    </div>
                    {c.credential_id && (
                      <span className="text-2xs font-mono text-campusblue-300">{c.credential_id}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-campusblue-300">No certifications recorded.</p>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};




