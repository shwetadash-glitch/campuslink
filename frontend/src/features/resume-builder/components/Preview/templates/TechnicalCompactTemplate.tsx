"use client";

import React from 'react';
import { ResumeData } from '../../../types';

interface TemplateProps {
  resume: ResumeData;
}

export const TechnicalCompactTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo, summary, experience, education, skills, projects, certifications, customSections, settings } = resume;
  const accent = settings.accentColor || '#1E293B';

  const fontClass =
    settings.fontFamily === 'roboto'
      ? 'font-roboto'
      : settings.fontFamily === 'jakarta'
      ? 'font-jakarta'
      : settings.fontFamily === 'merriweather'
      ? 'font-merriweather'
      : settings.fontFamily === 'garamond'
      ? 'font-garamond'
      : 'font-inter';

  return (
    <div className={`w-full bg-white text-slate-900 ${fontClass} leading-tight text-3xs select-text`}>
      {/* High-Density Header */}
      <header className="border-b border-slate-300 pb-2 mb-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 inline mr-2">
              {personalInfo.fullName || 'Software Engineer'}
            </h1>
            <span className="text-xs font-semibold text-slate-600">
              | {personalInfo.jobTitle || 'Full-Stack Developer'}
            </span>
          </div>
          {personalInfo.location && (
            <span className="text-2xs font-mono text-slate-500">{personalInfo.location}</span>
          )}
        </div>

        {/* Compact metadata links row */}
        <div className="flex flex-wrap items-center gap-x-3 text-2xs text-slate-600 mt-1">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="hover:underline text-slate-800">
              {personalInfo.email}
            </a>
          )}
          {personalInfo.phone && <span>· {personalInfo.phone}</span>}
          {personalInfo.github && (
            <a
              href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-mono hover:underline"
            >
              · {personalInfo.github.replace(/^https?:\/\//, '')}
            </a>
          )}
          {personalInfo.linkedin && (
            <a
              href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-mono hover:underline"
            >
              · {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
          {personalInfo.website && (
            <a
              href={personalInfo.website.startsWith('http') ? personalInfo.website : `https://${personalInfo.website}`}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-mono hover:underline"
            >
              · {personalInfo.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </header>

      <div className="space-y-2.5">
        {/* Technical Summary */}
        {summary && (
          <section className="resume-avoid-break">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
              Summary
            </h2>
            <p className="text-2xs leading-normal text-slate-700">{summary}</p>
          </section>
        )}

        {/* Skills - Grouped horizontally with pipe/tag */}
        {skills.length > 0 && skills.some((c) => c.skills.length > 0) && (
          <section className="resume-avoid-break">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
              Technical Proficiencies
            </h2>
            <div className="space-y-0.5 text-2xs">
              {skills.map((cat) => (
                <div key={cat.id} className="flex">
                  <span className="font-bold text-slate-900 w-36 flex-shrink-0">
                    {cat.name}:
                  </span>
                  <span className="text-slate-700 flex-1">
                    {cat.skills.map((s) => s.name).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience - Inline high density */}
        {experience.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
              Experience
            </h2>
            <div className="space-y-2">
              {experience.map((exp) => (
                <div key={exp.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between text-2xs">
                    <div>
                      <strong className="text-slate-950 font-bold">{exp.jobTitle}</strong>
                      <span className="text-slate-700">, {exp.company}</span>
                      {exp.location && <span className="text-slate-500 font-normal"> — {exp.location}</span>}
                    </div>
                    <span className="text-3xs font-mono text-slate-600 tabular-nums">
                      {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-3.5 mt-0.5 space-y-0.5 text-2xs text-slate-700">
                      {exp.highlights.map((bullet, idx) => (
                        <li key={idx} className="leading-snug">
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

        {/* Key Projects */}
        {projects.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
              Projects & Open Source
            </h2>
            <div className="space-y-1.5">
              {projects.map((proj) => (
                <div key={proj.id} className="resume-avoid-break text-2xs">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-bold text-slate-950">{proj.name}</span>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className="font-mono text-3xs text-slate-500">
                          {' '}
                          [{proj.technologies.join(', ')}]
                        </span>
                      )}
                    </div>
                    {proj.url && (
                      <a
                        href={proj.url.startsWith('http') ? proj.url : `https://${proj.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-3xs font-mono text-indigo-600 hover:underline"
                        style={{ color: accent }}
                      >
                        {proj.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-3.5 mt-0.5 space-y-0.5 text-slate-700">
                      {proj.highlights.map((h, i) => (
                        <li key={i} className="leading-snug">{h}</li>
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
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
              Education
            </h2>
            <div className="space-y-1 text-2xs">
              {education.map((edu) => (
                <div key={edu.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <strong className="text-slate-950">{edu.institution}</strong>
                      <span className="text-slate-700"> — {edu.degree}</span>
                      {edu.gpa && <span className="text-slate-500 font-mono"> (GPA: {edu.gpa})</span>}
                    </div>
                    <span className="text-3xs font-mono text-slate-600 tabular-nums">
                      {edu.endDate}
                    </span>
                  </div>
                  {(edu.honors || edu.coursework) && (
                    <p className="text-3xs text-slate-600 mt-0.5">
                      {edu.honors && <span className="font-medium text-slate-800">{edu.honors}. </span>}
                      {edu.coursework && <span>Coursework: {edu.coursework}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <section className="resume-avoid-break">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
              Certifications
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-2xs text-slate-800">
              {certifications.map((cert) => (
                <span key={cert.id}>
                  <strong>{cert.name}</strong> ({cert.issuer}, {cert.issueDate})
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Custom Sections */}
        {customSections.map((sec) => (
          <section key={sec.id} className="resume-avoid-break">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
              {sec.sectionTitle}
            </h2>
            <div className="space-y-1 text-2xs">
              {sec.items.map((item) => (
                <div key={item.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    {item.date && <span className="text-3xs font-mono text-slate-500">{item.date}</span>}
                  </div>
                  {item.subtitle && <p className="text-3xs text-slate-600 italic">{item.subtitle}</p>}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-3.5 mt-0.5 space-y-0.5 text-slate-700">
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
