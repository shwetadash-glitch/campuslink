"use client";

import React from 'react';
import { ResumeData } from '../../types';
import { ModernMinimalistTemplate } from './templates/ModernMinimalistTemplate';
import { ExecutiveClassicTemplate } from './templates/ExecutiveClassicTemplate';
import { TechnicalCompactTemplate } from './templates/TechnicalCompactTemplate';
import { CreativeContemporaryTemplate } from './templates/CreativeContemporaryTemplate';

interface ResumeRendererProps {
  resume: ResumeData;
}

export const ResumeRenderer: React.FC<ResumeRendererProps> = ({ resume }) => {
  switch (resume.settings.template) {
    case 'executive':
      return <ExecutiveClassicTemplate resume={resume} />;
    case 'compact':
      return <TechnicalCompactTemplate resume={resume} />;
    case 'creative':
      return <CreativeContemporaryTemplate resume={resume} />;
    case 'modern':
    default:
      return <ModernMinimalistTemplate resume={resume} />;
  }
};
