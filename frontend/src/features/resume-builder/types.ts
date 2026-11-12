export type TemplateId = 'modern' | 'executive' | 'compact' | 'creative';
export type FontFamily = 'inter' | 'jakarta' | 'merriweather' | 'garamond' | 'roboto';
export type PaperSize = 'a4' | 'letter';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  avatarUrl?: string;
  showAvatar: boolean;
}

export interface WorkExperienceItem {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate?: string;
  endDate: string;
  gpa?: string;
  honors?: string;
  coursework?: string;
}

export interface SkillItem {
  name: string;
  level?: SkillLevel;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: SkillItem[];
}

export interface ProjectItem {
  id: string;
  name: string;
  role?: string;
  url?: string;
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  technologies: string[];
  description?: string;
  highlights: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
  highlights?: string[];
}

export interface CustomSection {
  id: string;
  sectionTitle: string;
  items: CustomSectionItem[];
}

export interface ResumeSettings {
  template: TemplateId;
  accentColor: string;
  fontFamily: FontFamily;
  paperSize: PaperSize;
  fontSize: 'compact' | 'normal' | 'relaxed';
  sectionSpacing: 'compact' | 'normal' | 'relaxed';
  showDividers: boolean;
}

export interface ResumeData {
  id: string;
  title: string;
  lastUpdated: number;
  personalInfo: PersonalInfo;
  summary: string;
  experience: WorkExperienceItem[];
  education: EducationItem[];
  skills: SkillCategory[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  customSections: CustomSection[];
  settings: ResumeSettings;
}

export interface AtsScoreBreakdown {
  overallScore: number;
  categoryScores: {
    contactInfo: number;
    summary: number;
    experienceImpact: number;
    skillsAndKeywords: number;
    structureAndAts: number;
  };
  strengths: string[];
  improvements: {
    level: 'critical' | 'recommended' | 'optional';
    title: string;
    description: string;
    targetSection?: string;
  }[];
  metricsCount: number;
  actionVerbsFound: string[];
}

export const ACCENT_COLORS = [
  { name: 'Deep Indigo', value: '#4F46E5', class: 'bg-indigo-600' },
  { name: 'Forest Slate', value: '#0F172A', class: 'bg-slate-900' },
  { name: 'Emerald Teal', value: '#059669', class: 'bg-emerald-600' },
  { name: 'Royal Blue', value: '#2563EB', class: 'bg-blue-600' },
  { name: 'Crimson Rose', value: '#E11D48', class: 'bg-rose-600' },
  { name: 'Rich Amber', value: '#D97706', class: 'bg-amber-600' },
  { name: 'Electric Violet', value: '#7C3AED', class: 'bg-violet-600' },
  { name: 'Charcoal Minimal', value: '#334155', class: 'bg-slate-700' },
];

export const FONT_OPTIONS: { id: FontFamily; name: string; category: string; preview: string }[] = [
  { id: 'inter', name: 'Inter', category: 'Modern Sans', preview: 'Clean & crisp tech default' },
  { id: 'jakarta', name: 'Plus Jakarta', category: 'Geometric Sans', preview: 'Premium modern layout' },
  { id: 'merriweather', name: 'Merriweather', category: 'Executive Serif', preview: 'Editorial, high readability' },
  { id: 'garamond', name: 'EB Garamond', category: 'Academic Serif', preview: 'Classic Ivy League elegance' },
  { id: 'roboto', name: 'Roboto', category: 'Standard Sans', preview: 'Compact engineering density' },
];
