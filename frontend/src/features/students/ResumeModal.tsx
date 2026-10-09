import React, { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  readinessScore?: number | null;
}

export function ResumeModal({ isOpen, onClose, studentId, studentName, readinessScore }: ResumeModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      const internalId = studentId;
      
      apiClient.get<any>('/api/v1/officer/students/' + internalId)
        .then((res) => {
          setProfile(res.data ? res.data : res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-campusblue-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-campusblue-50 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-campusblue-900">Candidate Profile & Resume</h2>
            {readinessScore != null && (
              <span className="bg-campusblue-50 text-campusblue-900 text-xs font-bold px-3 py-1 rounded-full border border-campusblue-100">
                Readiness Score: {Math.round(readinessScore)}%
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-campusblue-400 hover:text-campusblue-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex justify-center">
          {loading ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-campusblue-500 font-semibold animate-pulse">Loading Candidate Profile...</p>
            </div>
          ) : !profile ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-red-500 font-semibold">Failed to load candidate profile.</p>
            </div>
          ) : (
            <div className="bg-white w-[210mm] min-h-[297mm] shadow-md p-[15mm] text-black font-serif print:shadow-none print:w-full print:h-full print:p-0">
              
              {/* Profile Header */}
              <div className="border-b-2 border-black pb-4 mb-4">
                <h1 className="text-3xl font-bold uppercase text-center mb-1">
                  {profile.basic_info?.first_name} {profile.basic_info?.last_name}
                </h1>
                <p className="text-center font-bold mb-2">
                  {profile.basic_info?.branch} | {profile.basic_info?.student_identifier} | Class of {profile.basic_info?.graduation_year || "Unknown"}
                </p>
                
                <div className="text-center text-sm">
                  Email: {profile.basic_info?.email || profile.basic_info?.user?.email || "N/A"} | Phone: {profile.basic_info?.phone || "N/A"}
                </div>
              </div>

              {/* Bio/Objective Section */}
              {profile.basic_info?.profile_metadata?.bio && (
                <div className="mb-4">
                  <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Objective</div>
                  <p className="text-justify text-sm leading-relaxed">{profile.basic_info.profile_metadata.bio}</p>
                </div>
              )}

              {/* Academic Details Section */}
              <div className="mb-4 text-sm">
                <div className="font-bold underline decoration-1 mb-1">Academic Record:</div>
                <div className="font-semibold mb-2">
                  B.Tech CGPA: {profile.basic_info?.cgpa || 'N/A'} / 10.0 | Active Backlogs: {profile.basic_info?.backlogs_current || 0}
                </div>
                {profile.academic_history && profile.academic_history.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1">
                    {profile.academic_history.map((edu: any, i: number) => (
                      <li key={i}>
                        <span className="font-medium">{edu.institution_name}</span> ({edu.board_or_university})
                        <br />
                        {edu.degree_type} - {edu.percentage_or_cgpa} {edu.is_cgpa ? 'CGPA' : '%'} ({edu.year_of_passing})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Technical Skills */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Technical Skills</div>
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-sm leading-relaxed">
                    {profile.skills.map((s: any, i: number) => (
                      <span key={i} className="font-medium bg-gray-100 px-2 py-1 rounded">
                        {s.skill?.name || s.skill_name || "Skill"} 
                        {s.proficiency_level ? ' (' + s.proficiency_level + ')' : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-500">No skills added.</p>
                )}
              </div>

              {/* Major Projects */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Projects</div>
                {profile.projects && profile.projects.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-3">
                    {profile.projects.map((p: any, i: number) => (
                      <li key={i}>
                        <div className="flex justify-between items-baseline">
                          <strong className="text-base">{p.title}</strong>
                          <span className="italic text-campusblue-800">{p.start_date ? new Date(p.start_date).toLocaleDateString() : ''} - {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Present'}</span>
                        </div>
                        <div className="italic text-gray-600 text-sm mb-1">{p.project_url && <a href={p.project_url} target="_blank" rel="noreferrer" className="hover:underline">{p.project_url}</a>}</div>
                        <p className="text-justify text-sm leading-relaxed">{p.description}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-gray-500">No projects added.</p>
                )}
              </div>

              {/* Certifications */}
              <div className="mb-4">
                <div className="bg-campusblue-100 px-2 py-1 font-bold mb-2">Certifications</div>
                {profile.certifications && profile.certifications.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                    {profile.certifications.map((c: any, i: number) => (
                      <li key={i}>
                        <div className="flex justify-between items-baseline">
                          <strong>{c.name}</strong>
                          <span>{c.issue_date ? new Date(c.issue_date).getFullYear() : ''}</span>
                        </div>
                        <div className="italic text-gray-600">{c.issuing_org}</div>
                        {c.credential_url && (
                          <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-campusblue-600 hover:underline">
                            View Credential
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-gray-500">No certifications added.</p>
                )}
              </div>
              
              {/* Attached Resume */}
              {profile.basic_info?.resume_url && (
                <div className="mt-8 pt-4 border-t text-center">
                  <a 
                    href={(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001") + profile.basic_info.resume_url.replace("/api/v1", "")}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-campusblue-900 text-white px-6 py-2 rounded-lg hover:bg-campusblue-800 font-sans"
                  >
                    <span>Download Original PDF Resume</span>
                    <span>&nearr;</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex justify-end shrink-0">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-campusblue-900 text-white text-sm font-semibold rounded hover:bg-campusblue-800 transition mr-2"
          >
            Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-campusblue-200 text-campusblue-800 text-sm font-semibold rounded hover:bg-campusblue-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
