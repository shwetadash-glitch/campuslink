"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ResumeData, ResumeSettings } from './types';
import { SAMPLE_STAFF_ENGINEER_RESUME, INITIAL_EMPTY_RESUME } from './sampleData';

const STORAGE_KEY = 'campuslink_resume_builder_v2';
const MAX_HISTORY = 25;

export function useResumeStore() {
  const [resume, setResumeState] = useState<ResumeData>(SAMPLE_STAFF_ENGINEER_RESUME);
  const [history, setHistory] = useState<ResumeData[]>([]);
  const [future, setFuture] = useState<ResumeData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const isInitialMount = useRef(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setResumeState(parsed);
      }
    } catch (e) {
      console.warn('Failed to load resume from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever resume changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
        setSaveStatus('saved');
      } catch (e) {
        console.error('Failed to save resume to localStorage:', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [resume]);

  // Push state to undo stack
  const updateResume = useCallback((updater: (prev: ResumeData) => ResumeData) => {
    setResumeState((prev) => {
      const next = updater(prev);
      next.lastUpdated = Date.now();
      setHistory((h) => [...h.slice(-MAX_HISTORY), prev]);
      setFuture([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [resume, ...f]);
    setResumeState(previous);
  }, [history, resume]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, resume]);
    setResumeState(next);
  }, [future, resume]);

  // Mutators
  const updateTitle = useCallback((title: string) => {
    updateResume((prev) => ({ ...prev, title }));
  }, [updateResume]);

  const updatePersonalInfo = useCallback((updates: Partial<ResumeData['personalInfo']>) => {
    updateResume((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...updates },
    }));
  }, [updateResume]);

  const updateSummary = useCallback((summary: string) => {
    updateResume((prev) => ({ ...prev, summary }));
  }, [updateResume]);

  const updateSettings = useCallback((updates: Partial<ResumeSettings>) => {
    updateResume((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, [updateResume]);

  // Work Experience
  const addExperience = useCallback(() => {
    updateResume((prev) => ({
      ...prev,
      experience: [
        {
          id: `exp-${Date.now()}`,
          jobTitle: 'Software Engineer',
          company: 'Acme Corp',
          location: 'San Francisco, CA',
          startDate: '2022-01',
          endDate: '',
          isCurrent: true,
          highlights: ['Accomplished [X] measured by [Y]% by implementing [Z].'],
        },
        ...prev.experience,
      ],
    }));
  }, [updateResume]);

  const updateExperience = useCallback((id: string, updates: Partial<ResumeData['experience'][0]>) => {
    updateResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  }, [updateResume]);

  const deleteExperience = useCallback((id: string) => {
    updateResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id),
    }));
  }, [updateResume]);

  const moveExperience = useCallback((id: string, direction: 'up' | 'down') => {
    updateResume((prev) => {
      const index = prev.experience.findIndex((e) => e.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.experience.length) return prev;

      const newExp = [...prev.experience];
      const temp = newExp[index];
      newExp[index] = newExp[targetIndex];
      newExp[targetIndex] = temp;
      return { ...prev, experience: newExp };
    });
  }, [updateResume]);

  // Education
  const addEducation = useCallback(() => {
    updateResume((prev) => ({
      ...prev,
      education: [
        {
          id: `edu-${Date.now()}`,
          degree: 'B.S. in Computer Science',
          institution: 'University Name',
          location: 'City, State',
          startDate: '2018-09',
          endDate: '2022-05',
          gpa: '3.80 / 4.00',
          honors: 'Dean\'s List',
          coursework: '',
        },
        ...prev.education,
      ],
    }));
  }, [updateResume]);

  const updateEducation = useCallback((id: string, updates: Partial<ResumeData['education'][0]>) => {
    updateResume((prev) => ({
      ...prev,
      education: prev.education.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  }, [updateResume]);

  const deleteEducation = useCallback((id: string) => {
    updateResume((prev) => ({
      ...prev,
      education: prev.education.filter((item) => item.id !== id),
    }));
  }, [updateResume]);

  // Skills
  const addSkillCategory = useCallback((name: string = 'New Category') => {
    updateResume((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          id: `skill-cat-${Date.now()}`,
          name,
          skills: [],
        },
      ],
    }));
  }, [updateResume]);

  const updateSkillCategory = useCallback((id: string, name: string) => {
    updateResume((prev) => ({
      ...prev,
      skills: prev.skills.map((cat) => (cat.id === id ? { ...cat, name } : cat)),
    }));
  }, [updateResume]);

  const deleteSkillCategory = useCallback((id: string) => {
    updateResume((prev) => ({
      ...prev,
      skills: prev.skills.filter((cat) => cat.id !== id),
    }));
  }, [updateResume]);

  const addSkillToCategory = useCallback((catId: string, skillName: string, level: ResumeData['skills'][0]['skills'][0]['level'] = 'Advanced') => {
    if (!skillName.trim()) return;
    updateResume((prev) => ({
      ...prev,
      skills: prev.skills.map((cat) => {
        if (cat.id !== catId) return cat;
        if (cat.skills.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) return cat;
        return {
          ...cat,
          skills: [...cat.skills, { name: skillName.trim(), level }],
        };
      }),
    }));
  }, [updateResume]);

  const removeSkillFromCategory = useCallback((catId: string, skillName: string) => {
    updateResume((prev) => ({
      ...prev,
      skills: prev.skills.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          skills: cat.skills.filter((s) => s.name !== skillName),
        };
      }),
    }));
  }, [updateResume]);

  // Projects
  const addProject = useCallback(() => {
    updateResume((prev) => ({
      ...prev,
      projects: [
        {
          id: `proj-${Date.now()}`,
          name: 'New Project Title',
          role: 'Lead Developer',
          url: '',
          githubUrl: '',
          startDate: '2023',
          endDate: 'Present',
          technologies: ['React', 'TypeScript', 'Tailwind'],
          highlights: ['Built high performance web application delivering seamless UX.'],
        },
        ...prev.projects,
      ],
    }));
  }, [updateResume]);

  const updateProject = useCallback((id: string, updates: Partial<ResumeData['projects'][0]>) => {
    updateResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  }, [updateResume]);

  const deleteProject = useCallback((id: string) => {
    updateResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  }, [updateResume]);

  // Certifications
  const addCertification = useCallback(() => {
    updateResume((prev) => ({
      ...prev,
      certifications: [
        {
          id: `cert-${Date.now()}`,
          name: 'Professional Certificate',
          issuer: 'Certifying Body',
          issueDate: '2023-01',
          url: '',
        },
        ...prev.certifications,
      ],
    }));
  }, [updateResume]);

  const updateCertification = useCallback((id: string, updates: Partial<ResumeData['certifications'][0]>) => {
    updateResume((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  }, [updateResume]);

  const deleteCertification = useCallback((id: string) => {
    updateResume((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((item) => item.id !== id),
    }));
  }, [updateResume]);

  // Custom Sections
  const addCustomSection = useCallback((title: string = 'Additional Section') => {
    updateResume((prev) => ({
      ...prev,
      customSections: [
        ...prev.customSections,
        {
          id: `cust-sec-${Date.now()}`,
          sectionTitle: title,
          items: [
            {
              id: `item-${Date.now()}`,
              title: 'Key Recognition or Role',
              subtitle: 'Organization / Issuer',
              date: '2023',
              highlights: ['Notable achievement or contribution.'],
            },
          ],
        },
      ],
    }));
  }, [updateResume]);

  const updateCustomSection = useCallback((id: string, updates: Partial<ResumeData['customSections'][0]>) => {
    updateResume((prev) => ({
      ...prev,
      customSections: prev.customSections.map((sec) => (sec.id === id ? { ...sec, ...updates } : sec)),
    }));
  }, [updateResume]);

  const deleteCustomSection = useCallback((id: string) => {
    updateResume((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((sec) => sec.id !== id),
    }));
  }, [updateResume]);

  // Bulk Actions
  const loadSampleData = useCallback(() => {
    updateResume(() => ({
      ...SAMPLE_STAFF_ENGINEER_RESUME,
      lastUpdated: Date.now(),
    }));
  }, [updateResume]);

  const clearAllData = useCallback(() => {
    updateResume(() => ({
      ...INITIAL_EMPTY_RESUME,
      lastUpdated: Date.now(),
    }));
  }, [updateResume]);

  const exportToJson = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(resume, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${resume.personalInfo.fullName.replace(/\s+/g, '_') || 'Resume'}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [resume]);

  const importFromJson = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.personalInfo && parsed.settings) {
        updateResume(() => parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [updateResume]);

  // Print / PDF Export
  const downloadPdf = useCallback(() => {
    setIsGeneratingPdf(true);
    // Give state time to paint cleanly then trigger native browser print
    setTimeout(() => {
      window.print();
      setIsGeneratingPdf(false);
    }, 300);
  }, []);

  return {
    resume,
    isLoaded,
    saveStatus,
    activeSection,
    setActiveSection,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    updateTitle,
    updatePersonalInfo,
    updateSummary,
    updateSettings,
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
    loadSampleData,
    clearAllData,
    exportToJson,
    importFromJson,
    downloadPdf,
    isGeneratingPdf,
  };
}
