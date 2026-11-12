"use client";

import React, { useState } from 'react';
import { Sparkles, Wand2, Lightbulb } from '../Icons';
import { AIEnhanceModal } from '../AIEnhanceModal';

interface SummarySectionProps {
  summary: string;
  jobTitle?: string;
  onChange: (summary: string) => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  jobTitle,
  onChange,
}) => {
  const [showAiModal, setShowAiModal] = useState(false);

  const wordCount = summary ? summary.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = summary ? summary.length : 0;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Professional Summary / Bio
          </h4>
          <p className="text-3xs text-slate-500">
            A 3-4 sentence elevator pitch highlighting leadership, key domain expertise, and metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>✨ Improve with AI</span>
        </button>
      </div>

      <div className="relative">
        <textarea
          rows={5}
          value={summary}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Staff Software Engineer with 8+ years architecting high-throughput distributed microservices, real-time collaboration engines, and enterprise web applications..."
          className="w-full text-xs p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed transition-colors shadow-2xs"
        />

        {/* Counter footer */}
        <div className="flex items-center justify-between mt-1 px-1 text-3xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className={wordCount >= 30 && wordCount <= 120 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
              {wordCount} Words
            </span>
            <span>·</span>
            <span>{charCount} Characters</span>
          </div>
          <span className="text-slate-500">
            Recommended: 40–100 words for optimal ATS skimmability
          </span>
        </div>
      </div>

      {/* Pro tip card */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-2xs text-amber-900">
        <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>ATS Pro-Tip:</strong> Tailor the first sentence to match your target job title directly (e.g. <em>"Senior Full-Stack Engineer with..."</em>) and mention 2-3 of your strongest core languages or frameworks.
        </p>
      </div>

      {/* AI Enhancement Modal */}
      <AIEnhanceModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        targetType="summary"
        currentText={summary}
        jobTitle={jobTitle || 'Senior Software Engineer'}
        onApply={(enhanced) => onChange(enhanced)}
      />
    </div>
  );
};
