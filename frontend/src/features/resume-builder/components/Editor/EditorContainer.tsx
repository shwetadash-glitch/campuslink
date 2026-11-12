"use client";

import React, { useState } from 'react';
import { ResumeData, SkillLevel } from '../../types';
import { PersonalInfoSection } from './PersonalInfoSection';
import { SummarySection } from './SummarySection';
import { ExperienceSection } from './ExperienceSection';
import { EducationSection } from './EducationSection';
import { SkillsSection } from './SkillsSection';
import { ProjectsSection } from './ProjectsSection';
import { CertificationsSection } from './CertificationsSection';
import { CustomSections } from './CustomSections';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  Layers,
  CheckCircle2,
} from '../Icons';

interface EditorContainerProps {
  resume: ResumeData;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  // State handlers
  updatePersonalInfo: (updates: Partial<ResumeData['personalInfo']>) => void;
  updateSummary: (summary: string) => void;
  addExperience: () => void;
  updateExperience: (id: string, updates: Partial<ResumeData['experience'][0]>) => void;
  deleteExperience: (id: string) => void;
  moveExperience: (id: string, direction: 'up' | 'down') => void;
  addEducation: () => void;
  updateEducation: (id: string, updates: Partial<ResumeData['education'][0]>) => void;
  deleteEducation: (id: string) => void;
  addSkillCategory: (name?: string) => void;
  updateSkillCategory: (id: string, name: string) => void;
  deleteSkillCategory: (id: string) => void;
  addSkillToCategory: (catId: string, skillName: string, level?: SkillLevel) => void;
  removeSkillFromCategory: (catId: string, skillName: string) => void;
  addProject: () => void;
  updateProject: (id: string, updates: Partial<ResumeData['projects'][0]>) => void;
  deleteProject: (id: string) => void;
  addCertification: () => void;
  updateCertification: (id: string, updates: Partial<ResumeData['certifications'][0]>) => void;
  deleteCertification: (id: string) => void;
  addCustomSection: (title?: string) => void;
  updateCustomSection: (id: string, updates: Partial<ResumeData['customSections'][0]>) => void;
  deleteCustomSection: (id: string) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  resume,
  activeSection,
  onSelectSection,
  updatePersonalInfo,
  updateSummary,
  addExperience,
  updateExperience,
  deleteExperience,
  moveExperience,
  addEducation,
  updateEducation,
  deleteEducation,
  addSkillCategory,
  updateSkillCategory,
  deleteSkillCategory,
  addSkillToCategory,
  removeSkillFromCategory,
  addProject,
  updateProject,
  deleteProject,
  addCertification,
  updateCertification,
  deleteCertification,
  addCustomSection,
  updateCustomSection,
  deleteCustomSection,
}) => {
  const sections = [
    {
      id: 'personal',
      label: 'Personal Details',
      icon: User,
      isComplete: Boolean(resume.personalInfo.fullName && resume.personalInfo.email),
      count: null,
    },
    {
      id: 'summary',
      label: 'Summary',
      icon: FileText,
      isComplete: Boolean(resume.summary && resume.summary.length > 40),
      count: null,
    },
    {
      id: 'experience',
      label: 'Experience',
      icon: Briefcase,
      isComplete: resume.experience.length > 0,
      count: resume.experience.length,
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: Wrench,
      isComplete: resume.skills.some((c) => c.skills.length > 0),
      count: resume.skills.reduce((acc, c) => acc + c.skills.length, 0),
    },
    {
      id: 'education',
      label: 'Education',
      icon: GraduationCap,
      isComplete: resume.education.length > 0,
      count: resume.education.length,
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      isComplete: resume.projects.length > 0,
      count: resume.projects.length,
    },
    {
      id: 'certifications',
      label: 'Certifications',
      icon: Award,
      isComplete: resume.certifications.length > 0,
      count: resume.certifications.length,
    },
    {
      id: 'custom',
      label: 'Custom Sections',
      icon: Layers,
      isComplete: resume.customSections.length > 0,
      count: resume.customSections.length,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Scrollable Horizontal Subnav for Sections */}
      <div className="flex items-center gap-1.5 p-2.5 overflow-x-auto bg-slate-50/80 border-b border-slate-200 text-xs no-scrollbar">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;

          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{sec.label}</span>
              {sec.count !== null && sec.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {sec.count}
                </span>
              )}
              {sec.isComplete && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Editor Content Body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {activeSection === 'personal' && (
          <PersonalInfoSection
            personalInfo={resume.personalInfo}
            onChange={updatePersonalInfo}
          />
        )}

        {activeSection === 'summary' && (
          <SummarySection
            summary={resume.summary}
            jobTitle={resume.personalInfo.jobTitle}
            onChange={updateSummary}
          />
        )}

        {activeSection === 'experience' && (
          <ExperienceSection
            experience={resume.experience}
            onAdd={addExperience}
            onUpdate={updateExperience}
            onDelete={deleteExperience}
            onMove={moveExperience}
          />
        )}

        {activeSection === 'education' && (
          <EducationSection
            education={resume.education}
            onAdd={addEducation}
            onUpdate={updateEducation}
            onDelete={deleteEducation}
          />
        )}

        {activeSection === 'skills' && (
          <SkillsSection
            skills={resume.skills}
            onAddCategory={addSkillCategory}
            onUpdateCategory={updateSkillCategory}
            onDeleteCategory={deleteSkillCategory}
            onAddSkill={addSkillToCategory}
            onRemoveSkill={removeSkillFromCategory}
          />
        )}

        {activeSection === 'projects' && (
          <ProjectsSection
            projects={resume.projects}
            onAdd={addProject}
            onUpdate={updateProject}
            onDelete={deleteProject}
          />
        )}

        {activeSection === 'certifications' && (
          <CertificationsSection
            certifications={resume.certifications}
            onAdd={addCertification}
            onUpdate={updateCertification}
            onDelete={deleteCertification}
          />
        )}

        {activeSection === 'custom' && (
          <CustomSections
            customSections={resume.customSections}
            onAddSection={addCustomSection}
            onUpdateSection={updateCustomSection}
            onDeleteSection={deleteCustomSection}
          />
        )}
      </div>
    </div>
  );
};
