import { ResumeData, AtsScoreBreakdown } from './types';

const STRONG_ACTION_VERBS = [
  'spearheaded', 'architected', 'engineered', 'orchestrated', 'streamlined',
  'accelerated', 'optimized', 'reduced', 'scaled', 'implemented', 'designed',
  'pioneered', 'formulated', 'mentored', 'directed', 'championed', 'deployed',
  'modernized', 'automated', 'delivered', 'consolidated', 'negotiated',
  'established', 'revamped', 'built', 'developed', 'launched', 'solved'
];

export function calculateAtsScore(resume: ResumeData): AtsScoreBreakdown {
  let contactScore = 0;
  let summaryScore = 0;
  let experienceScore = 0;
  let skillsScore = 0;
  let structureScore = 0;

  const strengths: string[] = [];
  const improvements: AtsScoreBreakdown['improvements'] = [];
  const actionVerbsFound: string[] = [];
  let metricsCount = 0;

  // 1. Contact Information (Max 20 points)
  const p = resume.personalInfo;
  if (p.fullName && p.fullName.trim().length > 2) contactScore += 5;
  else improvements.push({ level: 'critical', title: 'Missing Full Name', description: 'Enter your legal full name for ATS record creation.', targetSection: 'personal' });

  if (p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) contactScore += 5;
  else improvements.push({ level: 'critical', title: 'Invalid or Missing Email', description: 'ATS parsers require a valid email address.', targetSection: 'personal' });

  if (p.phone && p.phone.trim().length >= 7) contactScore += 4;
  else improvements.push({ level: 'recommended', title: 'Missing Phone Number', description: 'Recruiters often conduct initial phone screens.', targetSection: 'personal' });

  if (p.location && p.location.trim().length > 2) contactScore += 3;
  else improvements.push({ level: 'recommended', title: 'Missing Location', description: 'Include your City and Country/State for location filtering.', targetSection: 'personal' });

  if (p.linkedin || p.github || p.website) {
    contactScore += 3;
    strengths.push('Professional portfolio / LinkedIn links present');
  }

  // 2. Professional Summary (Max 15 points)
  const summaryWords = resume.summary ? resume.summary.trim().split(/\s+/).filter(Boolean).length : 0;
  if (summaryWords >= 30 && summaryWords <= 120) {
    summaryScore = 15;
    strengths.push(`Optimized summary length (${summaryWords} words)`);
  } else if (summaryWords > 0 && summaryWords < 30) {
    summaryScore = 8;
    improvements.push({ level: 'recommended', title: 'Summary Too Brief', description: 'Expand your professional summary to at least 30-50 words highlighting key value.', targetSection: 'summary' });
  } else if (summaryWords > 120) {
    summaryScore = 10;
    improvements.push({ level: 'optional', title: 'Summary Length', description: 'Consider tightening your summary to under 100 words for recruiter skimmability.', targetSection: 'summary' });
  } else {
    improvements.push({ level: 'recommended', title: 'Missing Professional Summary', description: 'Add a 3-4 sentence elevator pitch demonstrating your core strengths.', targetSection: 'summary' });
  }

  // 3. Work Experience & Impact (Max 35 points)
  if (resume.experience.length > 0) {
    experienceScore += 10;
    let totalBullets = 0;

    resume.experience.forEach(exp => {
      totalBullets += exp.highlights.length;
      exp.highlights.forEach(bullet => {
        const lower = bullet.toLowerCase();

        // Check for metrics (% or $ or digits or reduction terms)
        const hasMetric = /\b\d+(\.\d+)?%?\b|\$|\b(\d+x|\d+k|\d+m|\d+b)\b/i.test(bullet);
        if (hasMetric) {
          metricsCount++;
        }

        // Check for strong action verbs
        STRONG_ACTION_VERBS.forEach(verb => {
          if (new RegExp(`\\b${verb}\\b`, 'i').test(lower)) {
            if (!actionVerbsFound.includes(verb)) {
              actionVerbsFound.push(verb);
            }
          }
        });
      });
    });

    if (totalBullets >= 4) experienceScore += 8;
    else improvements.push({ level: 'recommended', title: 'Add More Detail to Experience', description: 'Include at least 2-4 quantifiable bullet points per relevant role.', targetSection: 'experience' });

    if (metricsCount >= 3) {
      experienceScore += 12;
      strengths.push(`Strong quantitative impact: ${metricsCount} measurable metrics detected`);
    } else {
      experienceScore += Math.min(12, metricsCount * 4);
      improvements.push({ level: 'critical', title: 'Quantify Your Accomplishments', description: 'Use the XYZ formula: Accomplished [X], measured by [Y]%, by doing [Z].', targetSection: 'experience' });
    }

    if (actionVerbsFound.length >= 4) {
      experienceScore += 5;
      strengths.push(`Rich leadership vocabulary (${actionVerbsFound.length} strong action verbs)`);
    } else {
      experienceScore += actionVerbsFound.length;
      improvements.push({ level: 'recommended', title: 'Enhance Action Verbs', description: 'Start bullets with decisive verbs like Spearheaded, Engineered, Architected.', targetSection: 'experience' });
    }
  } else {
    improvements.push({ level: 'critical', title: 'No Work Experience Listed', description: 'Add your employment or internship history.', targetSection: 'experience' });
  }

  // 4. Skills & Keywords (Max 15 points)
  let totalSkills = 0;
  resume.skills.forEach(cat => {
    totalSkills += cat.skills.length;
  });

  if (totalSkills >= 8) {
    skillsScore = 15;
    strengths.push(`Rich skill catalog: ${totalSkills} industry skills categorized`);
  } else if (totalSkills >= 4) {
    skillsScore = 10;
    improvements.push({ level: 'recommended', title: 'Expand Technical Skills', description: 'Target at least 8-12 relevant technologies and competencies.', targetSection: 'skills' });
  } else {
    skillsScore = totalSkills * 2;
    improvements.push({ level: 'critical', title: 'Add Skills Section', description: 'ATS systems heavily score keyword matches in skills sections.', targetSection: 'skills' });
  }

  // 5. Structure & ATS Compliance (Max 15 points)
  if (resume.education.length > 0) {
    structureScore += 7;
    strengths.push('Education credentials verified');
  } else {
    improvements.push({ level: 'recommended', title: 'Add Education Details', description: 'Include your highest degree or university coursework.', targetSection: 'education' });
  }

  if (resume.projects.length > 0 || resume.certifications.length > 0) {
    structureScore += 8;
    strengths.push('Portfolio projects or industry certifications included');
  } else {
    structureScore += 3;
    improvements.push({ level: 'optional', title: 'Add Projects or Certifications', description: 'Projects and certifications provide strong proof of ability.', targetSection: 'projects' });
  }

  const overallScore = Math.min(100, Math.round(contactScore + summaryScore + experienceScore + skillsScore + structureScore));

  return {
    overallScore,
    categoryScores: {
      contactInfo: Math.min(20, contactScore),
      summary: Math.min(15, summaryScore),
      experienceImpact: Math.min(35, experienceScore),
      skillsAndKeywords: Math.min(15, skillsScore),
      structureAndAts: Math.min(15, structureScore),
    },
    strengths,
    improvements,
    metricsCount,
    actionVerbsFound,
  };
}
