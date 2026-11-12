"use client";

import React from 'react';
import { ResumeData } from '../../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from '../../Icons';

interface TemplateProps {
  resume: ResumeData;
}

export const ModernMinimalistTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo, summary, experience, education, skills, projects, certifications, customSections, settings } = resume;
  const accent = settings.accentColor || '#4F46E5';

  const fontClass =
    settings.fontFamily === 'jakarta'
      ? 'font-jakarta'
      : settings.fontFamily === 'merriweather'
      ? 'font-merriweather'
      : settings.fontFamily === 'garamond'
      ? 'font-garamond'
      : settings.fontFamily === 'roboto'
      ? 'font-roboto'
      : 'font-inter';

  const spacingClass =
    settings.sectionSpacing === 'compact'
      ? 'space-y-4'
      : settings.sectionSpacing === 'relaxed'
      ? 'space-y-7'
      : 'space-y-5';

  return (
    <div className={`w-full bg-white text-slate-800 ${fontClass} leading-relaxed select-text`}>
      {/* Header */}
      <header className="pb-5 border-b border-slate-200">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
              {personalInfo.fullName || 'Your Name'}
            </h1>
            <p className="text-base font-medium tracking-tight text-slate-600 mb-3" style={{ color: accent }}>
              {personalInfo.jobTitle || 'Professional Title'}
            </p>

            {/* Contact links */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
              {personalInfo.email && (
                <a href={`mailto:${personalInfo.email}`} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{personalInfo.email}</span>
                </a>
              )}
              {personalInfo.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{personalInfo.phone}</span>
                </span>
              )}
              {personalInfo.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{personalInfo.location}</span>
                </span>
              )}
              {personalInfo.website && (
                <a href={personalInfo.website.startsWith('http') ? personalInfo.website : `https://${personalInfo.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{personalInfo.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {personalInfo.linkedin && (
                <a href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  <Linkedin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
              {personalInfo.github && (
                <a href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <span>{personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
            </div>
          </div>

          {/* Profile Photo if enabled */}
          {personalInfo.showAvatar && personalInfo.avatarUrl && (
            <div className="flex-shrink-0">
              <img
                src={personalInfo.avatarUrl}
                alt={personalInfo.fullName}
                className="w-20 h-20 rounded-full object-cover border-2 shadow-sm"
                style={{ borderColor: accent }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content Sections */}
      <div className={`mt-5 ${spacingClass}`}>
        {/* Summary */}
        {summary && (
          <section className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-2 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              Professional Summary
            </h2>
            <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
          </section>
        )}

        {/* Work Experience */}
        {experience.length > 0 && (
          <section className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-3 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              Work Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{exp.jobTitle}</span>
                      <span className="text-xs text-slate-500 font-medium"> · {exp.company}</span>
                    </div>
                    <span className="text-2xs font-medium text-slate-500 tabular-nums">
                      {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>
                  {exp.location && (
                    <p className="text-3xs text-slate-400 mb-1.5">{exp.location}</p>
                  )}
                  {exp.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-700">
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

        {/* Skills */}
        {skills.length > 0 && skills.some((c) => c.skills.length > 0) && (
          <section className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-2.5 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              Skills & Proficiencies
            </h2>
            <div className="space-y-2">
              {skills.map((cat) => (
                <div key={cat.id} className="flex items-baseline gap-2 text-xs">
                  <span className="font-semibold text-slate-800 min-w-32 text-2xs uppercase tracking-wide">
                    {cat.name}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-800 border border-slate-200/80"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-3 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              Key Projects
            </h2>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div key={proj.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{proj.name}</span>
                      {proj.role && <span className="text-2xs text-slate-500 italic">({proj.role})</span>}
                    </div>
                    {proj.url && (
                      <a
                        href={proj.url.startsWith('http') ? proj.url : `https://${proj.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-3xs font-medium hover:underline text-indigo-600"
                        style={{ color: accent }}
                      >
                        {proj.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <p className="text-3xs text-slate-500 font-mono mb-1">
                      Tech: {proj.technologies.join(', ')}
                    </p>
                  )}
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-700">
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

        {/* Education */}
        {education.length > 0 && (
          <section className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-2.5 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              Education
            </h2>
            <div className="space-y-2.5">
              {education.map((edu) => (
                <div key={edu.id} className="resume-avoid-break">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{edu.degree}</span>
                      <span className="text-xs text-slate-600"> · {edu.institution}</span>
                    </div>
                    <span className="text-2xs font-medium text-slate-500 tabular-nums">
                      {edu.endDate}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-2xs text-slate-500 mt-0.5">
                    {edu.location && <span>{edu.location}</span>}
                    {edu.gpa && <span className="font-medium text-slate-700">GPA: {edu.gpa}</span>}
                    {edu.honors && <span className="text-emerald-700 italic">{edu.honors}</span>}
                  </div>
                  {edu.coursework && (
                    <p className="text-3xs text-slate-500 mt-0.5">Coursework: {edu.coursework}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <section className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-2 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              Certifications & Credentials
            </h2>
            <div className="space-y-1.5">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{cert.name}</span>
                    <span className="text-slate-500 text-2xs"> — {cert.issuer}</span>
                  </div>
                  <span className="text-2xs text-slate-500 tabular-nums">{cert.issueDate}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom Sections */}
        {customSections.map((sec) => (
          <section key={sec.id} className="resume-avoid-break">
            <h2
              className="text-xs font-bold tracking-wider uppercase pb-1 mb-2 border-b"
              style={{ color: accent, borderColor: `${accent}30` }}
            >
              {sec.sectionTitle}
            </h2>
            <div className="space-y-2">
              {sec.items.map((item) => (
                <div key={item.id} className="resume-avoid-break text-xs">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{item.title}</span>
                      {item.subtitle && <span className="text-slate-500 italic"> · {item.subtitle}</span>}
                    </div>
                    {item.date && <span className="text-2xs text-slate-500">{item.date}</span>}
                  </div>
                  {item.description && <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-slate-700">
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
