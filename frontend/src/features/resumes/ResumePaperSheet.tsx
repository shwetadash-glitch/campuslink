"use client";

import React from "react";

export interface ResumePaperSheetProps {
  label: string;
  content: any;
  variant?: "primary" | "baseline";
  template?: "modern" | "classic" | "technical";
}

export const ResumePaperSheet: React.FC<ResumePaperSheetProps> = ({
  label,
  content,
  variant = "primary",
  template: propTemplate,
}) => {
  // Parse content if passed as a string
  let data: any = content;
  if (typeof content === "string") {
    try {
      data = JSON.parse(content);
    } catch {
      data = { summary: content };
    }
  }

  const activeTemplate = propTemplate || data?.template || "modern";

  const pInfo = data?.personal_info || {};
  const fullName =
    pInfo.full_name ||
    [pInfo.first_name, pInfo.last_name].filter(Boolean).join(" ") ||
    "Student Name";

  const email = pInfo.email || "";
  const phone = pInfo.phone || "";
  const branch = pInfo.branch || "";
  const gradYear = pInfo.graduation_year || "";
  const cgpa = pInfo.cgpa !== null && pInfo.cgpa !== undefined ? pInfo.cgpa : null;
  const studentId = pInfo.student_identifier || "";
  const location = pInfo.location || "";
  const linkedin = pInfo.linkedin_url || pInfo.linkedin || "";
  const github = pInfo.github_url || pInfo.github || "";
  const portfolio = pInfo.portfolio_url || pInfo.portfolio || "";

  const summary = data?.summary || "";
  const skills = Array.isArray(data?.skills) ? data.skills : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const workExperience = Array.isArray(data?.work_experience)
    ? data.work_experience
    : Array.isArray(data?.experience)
    ? data.experience
    : [];
  const education = Array.isArray(data?.academic_history)
    ? data.academic_history
    : Array.isArray(data?.education)
    ? data.education
    : [];
  const certifications = Array.isArray(data?.certifications) ? data.certifications : [];
  const achievements = Array.isArray(data?.achievements) ? data.achievements : [];

  const isBaseline =
    variant === "baseline" ||
    label.toLowerCase().includes("baseline") ||
    label.toLowerCase().includes("profile");

  // Determine section ordering
  const defaultOrder =
    workExperience.length > 0
      ? ["summary", "work_experience", "skills", "projects", "education", "certifications", "achievements"]
      : ["summary", "education", "skills", "projects", "work_experience", "certifications", "achievements"];

  const sectionOrder: string[] = Array.isArray(data?.section_order) && data.section_order.length > 0
    ? data.section_order
    : defaultOrder;

  // Template styling helpers
  const containerFont =
    activeTemplate === "classic"
      ? "font-serif text-slate-900"
      : activeTemplate === "technical"
      ? "font-mono text-slate-900 text-xs"
      : "font-sans text-slate-800";

  const headerBorder =
    activeTemplate === "classic"
      ? "border-b-2 border-slate-900 text-center"
      : activeTemplate === "technical"
      ? "border-b border-teal-800 text-left"
      : "border-b-2 border-indigo-600 text-center";

  const sectionHeadingClass =
    activeTemplate === "classic"
      ? "text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-400 pb-0.5 mb-2 text-center"
      : activeTemplate === "technical"
      ? "text-2xs font-extrabold uppercase tracking-wider text-teal-800 border-b border-teal-600 pb-0.5 mb-1.5"
      : "text-2xs font-extrabold uppercase tracking-widest text-indigo-900 border-b border-indigo-200 pb-1 mb-2";

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "summary":
        if (!summary) return null;
        return (
          <div key="summary" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Professional Summary</h2>
            <p className="text-xs text-slate-700 leading-relaxed text-justify">
              {summary}
            </p>
          </div>
        );

      case "work_experience":
        if (workExperience.length === 0) return null;
        return (
          <div key="work_experience" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Work Experience</h2>
            <div className="space-y-3">
              {workExperience.map((exp: any, idx: number) => {
                const dates = [
                  exp.start_date,
                  exp.is_current ? "Present" : exp.end_date,
                ]
                  .filter(Boolean)
                  .join(" – ");

                const bullets: string[] = Array.isArray(exp.highlights) && exp.highlights.length > 0
                  ? exp.highlights
                  : exp.description
                  ? [exp.description]
                  : [];

                return (
                  <div key={idx} className="text-xs">
                    <div className="flex items-baseline justify-between">
                      <div className="font-bold text-slate-900">
                        <span>{exp.job_title}</span>
                        {exp.company && (
                          <span className="font-semibold text-slate-700"> • {exp.company}</span>
                        )}
                      </div>
                      <div className="text-2xs text-slate-500 font-medium whitespace-nowrap ml-2">
                        {[dates, exp.location].filter(Boolean).join(" | ")}
                      </div>
                    </div>
                    {exp.technologies && (
                      <div className="text-3xs text-slate-500 font-mono mt-0.5">
                        <strong className="text-slate-600">Tech Stack:</strong> {exp.technologies}
                      </div>
                    )}
                    {bullets.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-2xs text-slate-700 leading-relaxed">
                        {bullets.map((b, bIdx) => (
                          <li key={bIdx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "education":
        if (education.length === 0) return null;
        return (
          <div key="education" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Education & Academic Credentials</h2>
            <div className="space-y-2">
              {education.map((edu: any, idx: number) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">
                      {edu.qualification || "Degree / Coursework"}
                      {edu.specialization ? ` (${edu.specialization})` : ""}
                    </span>
                    <span className="text-2xs text-slate-500 font-medium">
                      {[edu.start_year, edu.end_year].filter(Boolean).join(" – ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-600 mt-0.5">
                    <span>{edu.institution || "University"}</span>
                    {edu.score_value ? (
                      <span className="font-semibold text-slate-800">
                        {edu.score_type || "Score"}: {edu.score_value}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "skills":
        if (skills.length === 0) return null;
        return (
          <div key="skills" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Technical & Domain Competencies</h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s: any, idx: number) => {
                const sName = typeof s === "string" ? s : s.name;
                const sProf = typeof s === "object" && s.proficiency_level ? s.proficiency_level : "";
                const isVer = typeof s === "object" && s.is_verified;

                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium border ${
                      isVer
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold"
                        : "bg-slate-50 text-slate-800 border-slate-200"
                    }`}
                  >
                    <span>{sName}</span>
                    {sProf && <span className="text-3xs text-slate-400">({sProf})</span>}
                    {isVer && <span className="text-emerald-600 text-3xs font-black">✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        );

      case "projects":
        if (projects.length === 0) return null;
        return (
          <div key="projects" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Key Projects & Engineering Systems</h2>
            <div className="space-y-2.5">
              {projects.map((proj: any, idx: number) => {
                const projBullets: string[] =
                  Array.isArray(proj.highlights) && proj.highlights.length > 0
                    ? proj.highlights
                    : proj.description
                    ? [proj.description]
                    : [];

                return (
                  <div key={idx} className="text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-900">{proj.title}</span>
                      {proj.project_url && (
                        <span className="text-3xs text-blue-600 underline font-mono truncate max-w-[180px]">
                          {proj.project_url}
                        </span>
                      )}
                    </div>
                    {proj.technologies && (
                      <div className="text-3xs text-slate-500 font-mono mt-0.5">
                        <strong className="text-slate-600">Technologies:</strong> {proj.technologies}
                      </div>
                    )}
                    {projBullets.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-2xs text-slate-700 leading-relaxed">
                        {projBullets.map((bullet, bIdx) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "certifications":
        if (certifications.length === 0) return null;
        return (
          <div key="certifications" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Certifications & Accreditations</h2>
            <div className="space-y-1.5">
              {certifications.map((c: any, idx: number) => (
                <div key={idx} className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{c.name}</span>
                    {c.issuing_org && (
                      <span className="text-2xs text-slate-600 ml-1.5">— {c.issuing_org}</span>
                    )}
                    {c.credential_id && (
                      <span className="text-3xs text-slate-400 font-mono ml-2">ID: {c.credential_id}</span>
                    )}
                  </div>
                  {c.issue_date && (
                    <span className="text-3xs text-slate-500">{c.issue_date}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "achievements":
        if (achievements.length === 0) return null;
        return (
          <div key="achievements" className="mb-3.5">
            <h2 className={sectionHeadingClass}>Honors & Key Achievements</h2>
            <div className="space-y-1.5">
              {achievements.map((ach: any, idx: number) => {
                const title = typeof ach === "object" ? ach.title || "" : String(ach);
                const issuer = typeof ach === "object" && ach.issuer ? ` — ${ach.issuer}` : "";
                const date = typeof ach === "object" && ach.date ? ` (${ach.date})` : "";
                const desc = typeof ach === "object" && ach.description ? `: ${ach.description}` : "";

                return (
                  <div key={idx} className="text-xs text-slate-800 flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>
                      <strong className="font-semibold text-slate-900">{title}</strong>
                      {issuer}
                      {date}
                      {desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Paper Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-t-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{label}</span>
          {isBaseline ? (
            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              🏛️ University Source of Truth
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              📄 Tailored Resume Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 uppercase font-semibold">
            {activeTemplate}
          </span>
          <span className="text-3xs text-slate-500 font-medium">Document Preview</span>
        </div>
      </div>

      {/* Realistic Paper Sheet */}
      <div className={`flex-1 bg-white border-x border-b border-slate-300 p-6 sm:p-8 shadow-md rounded-b-lg ${containerFont}`}>
        {/* Document Header / Contact Info */}
        <div className={`pb-3 mb-4 ${headerBorder}`}>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
            {fullName}
          </h1>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-2xs text-slate-600 font-medium">
            {branch && <span>{branch}</span>}
            {gradYear && <span>• Class of {gradYear}</span>}
            {cgpa !== null && (
              <span className="font-bold text-slate-800">• CGPA: {typeof cgpa === "number" ? cgpa.toFixed(2) : cgpa}</span>
            )}
            {studentId && <span>• ID: {studentId}</span>}
          </div>

          {/* Contact Details */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-2xs text-slate-600">
            {email && (
              <span className="flex items-center gap-1">
                <span>✉</span> {email}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1">
                <span>☎</span> {phone}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <span>📍</span> {location}
              </span>
            )}
          </div>

          {/* Web Links */}
          {(linkedin || github || portfolio) && (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-3xs">
              {linkedin && (
                <a
                  href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                >
                  LinkedIn
                </a>
              )}
              {github && (
                <a
                  href={github.startsWith("http") ? github : `https://${github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-800 hover:underline font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                >
                  GitHub
                </a>
              )}
              {portfolio && (
                <a
                  href={portfolio.startsWith("http") ? portfolio : `https://${portfolio}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 hover:underline font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                >
                  Portfolio
                </a>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Sections Rendered in Configured Sequence */}
        {sectionOrder.map((sectionKey) => renderSection(sectionKey))}
      </div>
    </div>
  );
};

export default ResumePaperSheet;
