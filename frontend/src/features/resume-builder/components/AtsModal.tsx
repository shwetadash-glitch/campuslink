"use client";

import React from 'react';
import { AtsScoreBreakdown } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, X, Award, TrendingUp, Sparkles } from './Icons';

interface AtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  atsData: AtsScoreBreakdown;
  onNavigateSection?: (sectionId: string) => void;
}

export const AtsModal: React.FC<AtsModalProps> = ({
  isOpen,
  onClose,
  atsData,
  onNavigateSection,
}) => {
  if (!isOpen) return null;

  const { overallScore, categoryScores, strengths, improvements, metricsCount, actionVerbsFound } = atsData;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreVerdict = (score: number) => {
    if (score >= 90) return { title: 'ATS-Optimized & Recruiter-Ready', desc: 'Your resume passes ATS keyword parsing and highlights measurable achievements.' };
    if (score >= 75) return { title: 'Good Foundation, minor gaps', desc: 'A few tweaks to quantifiable metrics and action verbs will push you above 90%.' };
    return { title: 'Needs Action', desc: 'Critical contact or experience details need attention to pass standard ATS screeners.' };
  };

  const verdict = getScoreVerdict(overallScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ATS Score & Recruiter Insights</h3>
              <p className="text-xs text-slate-300">Algorithmic analysis of your resume’s readability & keywords</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Score Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-500 bg-white shadow-xs">
              <span className="text-3xl font-black text-slate-900 tabular-nums">{overallScore}</span>
              <span className="text-3xs uppercase font-bold text-slate-500">out of 100</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-block px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 mb-1">
                {verdict.title}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {verdict.desc}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-2xs text-slate-500">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>{metricsCount}</strong> Measurable Metrics
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <strong>{actionVerbsFound.length}</strong> Power Action Verbs
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Score Category Progress Bars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Category Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Contact & Links</span>
                  <span className="font-bold text-slate-900">{categoryScores.contactInfo} / 20</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(categoryScores.contactInfo / 20) * 100}%` }}></div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Experience & Impact</span>
                  <span className="font-bold text-slate-900">{categoryScores.experienceImpact} / 35</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(categoryScores.experienceImpact / 35) * 100}%` }}></div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Skills & Tech Stack</span>
                  <span className="font-bold text-slate-900">{categoryScores.skillsAndKeywords} / 15</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(categoryScores.skillsAndKeywords / 15) * 100}%` }}></div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Education & Structure</span>
                  <span className="font-bold text-slate-900">{categoryScores.structureAndAts} / 15</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(categoryScores.structureAndAts / 15) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Verified Strengths
              </h4>
              <div className="space-y-1.5">
                {strengths.map((str, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{str}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Improvement Checklist */}
          {improvements.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                High-ROI Recommendations ({improvements.length})
              </h4>
              <div className="space-y-2">
                {improvements.map((imp, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                      imp.level === 'critical'
                        ? 'border-rose-200 bg-rose-50/50'
                        : imp.level === 'recommended'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {imp.level === 'critical' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{imp.title}</span>
                          <span className="text-3xs uppercase font-extrabold px-1.5 py-0.5 rounded bg-white/80 border text-slate-600">
                            {imp.level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{imp.description}</p>
                      </div>
                    </div>
                    {imp.targetSection && onNavigateSection && (
                      <button
                        onClick={() => {
                          onNavigateSection(imp.targetSection!);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-2xs font-semibold text-slate-700 hover:text-slate-900 bg-white rounded-md border border-slate-300 shadow-2xs hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Go to section
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Got it, Back to Editing
          </button>
        </div>
      </div>
    </div>
  );
};
