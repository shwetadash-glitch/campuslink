import { Metadata } from 'next';
import ResumeBuilderApp from '@/features/resume-builder/ResumeBuilderApp';

export const metadata: Metadata = {
  title: 'Resume Studio | Modern ATS-Compliant Resume Builder',
  description: 'Build modern, production-grade, and aesthetically stunning ATS-compliant resumes with real-time preview, instant PDF export, and AI bullet point enhancer.',
};

export default function ResumeBuilderRoute() {
  return <ResumeBuilderApp />;
}
