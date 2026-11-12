"use client";

import React from 'react';
import { ResumeData } from '../../../types';

interface TemplateProps {
  resume: ResumeData;
}

export const ExecutiveClassicTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo, summary, experience, education, skills, projects, certifications, customSections, settings } = resume;
  const accent = settings.accentColor || '#0F172A';

  // Executive classic defaults to serif (Merriweather / Garamond)
  const fontClass =
    settings.fontFamily === 'garamond'
      ? 'font-garamond'
      : settings.fontFamily === 'inter'
      ? 'font-inter'
      : settings.fontFamily === 'jakarta'
      ? 'font-jakarta'
      : settings.fontFamily === 'roboto'
      ? 'font-roboto'
      : 'font-merriweather';

  const spacingClass =
    settings.sectionSpacing === 'compact'
      ? 'space-y-3.5'
      : settings.sectionSpacing === 'relaxed'
      ? 'space-y-6'
      : 'space-y-4.5';

  return (
    <div className={`w-full bg-white text-slate-900 ${fontClass} leading-relaxed select-text`}>
      {/* Centered Traditional Executive Header */}
      <header className="text-center pb-4 border-b-2 border-slate-900">
        <h1 className="text-2xl font-bold tracking-normal uppercase text-slate-950 mb-1">
          {personalInfo.fullName || 'Executive Candidate'}
        </h1>
        {personalInfo.jobTitle && (
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-700 mb-2">
            {personalInfo.jobTitle}
          </p>
        )}

        {/* Contact Strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-2xs text-slate-700 font-serif">
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.phone && <span>• {personalInfo.phone}</span>}
          {personalInfo.email && (
            <span>
              • <a href={`mailto:${personalInfo.email}`} className="hover:underline">{personalInfo.email}</a>
            </span>
          )}
          {personalInfo.linkedin && (
            <span>
              • <a href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="hover:underline">{personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>
            </span>
          )}
          {personalInfo.website && (
            <span>
              • <a href={personalInfo.website.startsWith('http') ? personalInfo.website : `https://${personalInfo.website}`} target="_blank" rel="noreferrer" className="hover:underline">{personalInfo.website.replace(/^https?:\/\//, '')}</a>
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className={`mt-4 ${spacingClass}`}>
        {/* Professional Summary */}
        {summary && (
          <section className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1.5">
              Executive Profile
            </h2>
            <p className="text-xs leading-relaxed text-slate-800 text-justify">{summary}</p>
          </section>
        )}

        {/* Work Experience */}
        {experience.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-2.5">
              Professional Experience
            </h2>
            <div className="space-y-3.5">
              {experience.map((exp) => (
                <div key={exp.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-950">{exp.company}</span>
                    <span className="text-2xs italic text-slate-700">{exp.location}</span>
                  </div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs italic font-medium text-slate-800">{exp.jobTitle}</span>
                    <span className="text-2xs text-slate-700 tabular-nums">
                      {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-800">
                      {exp.highlights.map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-2">
              Education & Academic Honors
            </h2>
            <div className="space-y-2">
              {education.map((edu) => (
                <div key={edu.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-950">{edu.institution}</span>
                    <span className="text-2xs text-slate-700">{edu.location}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="italic text-slate-800">{edu.degree}</span>
                    <span className="text-2xs text-slate-700 tabular-nums">{edu.endDate}</span>
                  </div>
                  {(edu.gpa || edu.honors || edu.coursework) && (
                    <div className="text-2xs text-slate-700 mt-0.5">
                      {edu.gpa && <span className="font-semibold">GPA: {edu.gpa} </span>}
                      {edu.honors && <span>• {edu.honors} </span>}
                      {edu.coursework && <p className="text-3xs text-slate-600 mt-0.5">Relevant Coursework: {edu.coursework}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core Competencies / Skills */}
        {skills.length > 0 && skills.some((c) => c.skills.length > 0) && (
          <section className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-2">
              Core Competencies & Skills
            </h2>
            <div className="space-y-1.5 text-xs">
              {skills.map((cat) => (
                <div key={cat.id} className="leading-snug">
                  <span className="font-bold text-slate-950">{cat.name}: </span>
                  <span className="text-slate-800">
                    {cat.skills.map((s) => s.name).join(' • ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Selected Projects / Initiatives */}
        {projects.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-2">
              Key Initiatives & Projects
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj) => (
                <div key={proj.id} className="resume-avoid-break text-xs">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-bold text-slate-950">{proj.name}</span>
                      {proj.role && <span className="text-2xs italic text-slate-700"> — {proj.role}</span>}
                    </div>
                    {proj.url && (
                      <span className="text-2xs text-slate-600 underline">
                        {proj.url.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                  </div>
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-800">
                      {proj.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications & Affiliations */}
        {certifications.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1.5">
              Certifications & Professional Licensure
            </h2>
            <div className="space-y-1 text-xs">
              {certifications.map((c) => (
                <div key={c.id} className="flex items-baseline justify-between">
                  <span>
                    <strong className="text-slate-950">{c.name}</strong>, {c.issuer}
                  </span>
                  <span className="text-2xs text-slate-700 tabular-nums">{c.issueDate}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom Sections */}
        {customSections.map((sec) => (
          <section key={sec.id} className="resume-avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-300 pb-0.5 mb-1.5">
              {sec.sectionTitle}
            </h2>
            <div className="space-y-2 text-xs">
              {sec.items.map((item) => (
                <div key={item.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-950">{item.title}</span>
                    {item.date && <span className="text-2xs text-slate-700">{item.date}</span>}
                  </div>
                  {item.subtitle && <p className="italic text-2xs text-slate-700">{item.subtitle}</p>}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-800">
                      {item.highlights.map((h, hi) => (
                        <li key={hi}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
