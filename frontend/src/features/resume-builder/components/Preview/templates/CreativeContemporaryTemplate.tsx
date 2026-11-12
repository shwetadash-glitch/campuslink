"use client";

import React from 'react';
import { ResumeData } from '../../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from '../../Icons';

interface TemplateProps {
  resume: ResumeData;
}

export const CreativeContemporaryTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo, summary, experience, education, skills, projects, certifications, customSections, settings } = resume;
  const accent = settings.accentColor || '#4F46E5';

  const fontClass =
    settings.fontFamily === 'jakarta'
      ? 'font-jakarta'
      : settings.fontFamily === 'garamond'
      ? 'font-garamond'
      : settings.fontFamily === 'merriweather'
      ? 'font-merriweather'
      : settings.fontFamily === 'roboto'
      ? 'font-roboto'
      : 'font-inter';

  return (
    <div className={`w-full bg-white text-slate-800 ${fontClass} leading-relaxed select-text`}>
      {/* Top Banner / Hero */}
      <div className="p-6 rounded-xl mb-5 text-white flex items-center justify-between" style={{ backgroundColor: accent }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <p className="text-sm font-medium opacity-90 tracking-wide text-white/90">
            {personalInfo.jobTitle || 'Product & Tech Innovator'}
          </p>
        </div>
        {personalInfo.showAvatar && personalInfo.avatarUrl && (
          <img
            src={personalInfo.avatarUrl}
            alt={personalInfo.fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-white/60 shadow-md"
          />
        )}
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (35%) */}
        <aside className="col-span-4 space-y-4 text-xs pr-2 border-r border-slate-200">
          {/* Contact Details */}
          <div className="resume-avoid-break space-y-1.5 text-slate-600">
            <h3 className="font-bold text-2xs uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
              Contact
            </h3>
            {personalInfo.email && (
              <div className="flex items-center gap-1.5 break-all">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{personalInfo.location}</span>
              </div>
            )}
            {personalInfo.linkedin && (
              <div className="flex items-center gap-1.5 break-all">
                <Linkedin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>
              </div>
            )}
            {personalInfo.github && (
              <div className="flex items-center gap-1.5 break-all">
                <Github className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}</span>
              </div>
            )}
          </div>

          {/* Education */}
          {education.length > 0 && (
            <div className="resume-avoid-break space-y-2">
              <h3 className="font-bold text-2xs uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
                Education
              </h3>
              {education.map((edu) => (
                <div key={edu.id} className="text-2xs">
                  <div className="font-bold text-slate-900">{edu.degree}</div>
                  <div className="text-slate-600">{edu.institution}</div>
                  <div className="text-slate-400">{edu.endDate} {edu.gpa ? `· GPA ${edu.gpa}` : ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="resume-avoid-break space-y-2.5">
              <h3 className="font-bold text-2xs uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
                Core Skills
              </h3>
              {skills.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="text-3xs uppercase font-bold text-slate-500 tracking-wider">{cat.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {cat.skills.map((s, si) => (
                      <span key={si} className="px-1.5 py-0.5 rounded text-3xs font-medium bg-slate-100 text-slate-700">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="resume-avoid-break space-y-1.5">
              <h3 className="font-bold text-2xs uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
                Certifications
              </h3>
              {certifications.map((c) => (
                <div key={c.id} className="text-2xs">
                  <div className="font-semibold text-slate-800">{c.name}</div>
                  <div className="text-slate-500 text-3xs">{c.issuer} ({c.issueDate})</div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Right Column (65%) */}
        <main className="col-span-8 space-y-4">
          {/* Summary */}
          {summary && (
            <section className="resume-avoid-break">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }}></span>
                About Me
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
            </section>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <section className="resume-avoid-break space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }}></span>
                Experience
              </h2>
              {experience.map((exp) => (
                <div key={exp.id} className="resume-avoid-break text-xs pl-2.5 border-l-2 border-slate-200">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="font-bold text-slate-900">{exp.jobTitle}</span>
                    <span className="text-2xs text-slate-400 tabular-nums">
                      {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 font-medium mb-1">{exp.company} {exp.location ? `· ${exp.location}` : ''}</p>
                  {exp.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-1 text-slate-700">
                      {exp.highlights.map((bullet, idx) => (
                        <li key={idx} className="leading-relaxed">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section className="resume-avoid-break space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }}></span>
                Key Projects
              </h2>
              {projects.map((proj) => (
                <div key={proj.id} className="resume-avoid-break text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">{proj.name}</span>
                    {proj.url && (
                      <span className="text-2xs text-indigo-600 font-medium">{proj.url.replace(/^https?:\/\//, '')}</span>
                    )}
                  </div>
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-700">
                      {proj.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Custom Sections */}
          {customSections.map((sec) => (
            <section key={sec.id} className="resume-avoid-break space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }}></span>
                {sec.sectionTitle}
              </h2>
              {sec.items.map((item) => (
                <div key={item.id} className="text-xs">
                  <div className="flex items-baseline justify-between font-bold text-slate-900">
                    <span>{item.title}</span>
                    {item.date && <span className="text-2xs text-slate-400 font-normal">{item.date}</span>}
                  </div>
                  {item.subtitle && <p className="text-2xs text-slate-500 italic">{item.subtitle}</p>}
                  {item.highlights && item.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-700">
                      {item.highlights.map((h, hi) => (
                        <li key={hi}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
};
