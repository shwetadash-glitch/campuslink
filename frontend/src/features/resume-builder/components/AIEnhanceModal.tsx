"use client";

import React, { useState } from 'react';
import { Sparkles, Check, Copy, Wand2, ArrowRight, X, Lightbulb } from './Icons';

interface AIEnhanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'summary' | 'bullet';
  currentText: string;
  jobTitle?: string;
  onApply: (enhancedText: string) => void;
}

const ACTION_VERBS = [
  'Spearheaded', 'Architected', 'Engineered', 'Accelerated',
  'Orchestrated', 'Streamlined', 'Scaled', 'Optimized',
  'Championed', 'Modernized', 'Automated', 'Pioneered'
];

export const AIEnhanceModal: React.FC<AIEnhanceModalProps> = ({
  isOpen,
  onClose,
  targetType,
  currentText,
  jobTitle = 'Senior Engineer',
  onApply,
}) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // XYZ Formula interactive helper state
  const [xyzWhat, setXyzWhat] = useState('');
  const [xyzMetric, setXyzMetric] = useState('');
  const [xyzHow, setXyzHow] = useState('');

  if (!isOpen) return null;

  // Generate intelligent suggestions based on target type
  const summarySuggestions = [
    {
      label: 'Staff & High-Impact (Metrics-Driven)',
      badge: 'Best for Tech Leads / Staff',
      text: `Results-driven ${jobTitle} with proven expertise architecting high-throughput distributed architectures and leading high-velocity engineering pods. Track record reducing cloud infrastructure overhead by 35%+ while scaling systems to 10M+ daily active users. Expert in TypeScript, Go, Next.js, and cloud-native systems design.`,
    },
    {
      label: 'Deep Technical Specialist',
      badge: 'Best for Core Systems & Performance',
      text: `Dedicated ${jobTitle} specializing in low-latency systems, database optimization, and resilient microservices. Adept at diagnosing bottlenecks, reducing P99 latency by over 50%, and enforcing rigorous type-safety and automated CI/CD testing pipelines across enterprise platforms.`,
    },
    {
      label: 'Modern Product & Innovation Focus',
      badge: 'Best for Startups & Scaleups',
      text: `Innovative and customer-obsessed ${jobTitle} bridging complex technical architecture with intuitive user experiences. Passionate about rapid iteration, zero-to-one product launches, and building scalable full-stack web applications with modern React, Node, and event-driven architectures.`,
    },
  ];

  const bulletSuggestions = [
    {
      label: 'Impact & Optimization (XYZ Formula)',
      badge: 'Strong ATS Score',
      text: `Spearheaded optimization of core data caching layer, decreasing P99 latency by 45% (from 320ms to 175ms) by implementing Redis read-replicas and distributed cache warming.`,
    },
    {
      label: 'Efficiency & Cost Reduction',
      badge: 'Business Value',
      text: `Reduced cloud infrastructure expenditure by $45,000/year by re-architecting legacy monolithic background jobs into auto-scaling Kubernetes worker pods.`,
    },
    {
      label: 'Leadership & Engineering Velocity',
      badge: 'Team Velocity',
      text: `Mentored 6 junior/mid-level software engineers on Clean Architecture principles, resulting in a 30% reduction in production PR cycle times.`,
    },
  ];

  const suggestions = targetType === 'summary' ? summarySuggestions : bulletSuggestions;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleGenerateXyz = () => {
    if (!xyzWhat && !xyzMetric && !xyzHow) return;
    const generated = `Accomplished ${xyzWhat || 'core objective'}, measured by ${xyzMetric || '35% improvement'}, by ${xyzHow || 'engineering scalable architecture'}.`;
    onApply(generated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {targetType === 'summary' ? 'AI Summary Enhancer' : 'XYZ Formula Bullet Assistant'}
              </h3>
              <p className="text-xs text-slate-300">
                Generate high-impact, ATS-optimized content in seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Action Verbs Quick Pills */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommended Action Verbs</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACTION_VERBS.map((verb) => (
                <button
                  key={verb}
                  onClick={() => {
                    if (targetType === 'bullet') {
                      setXyzWhat(`${verb} `);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md text-2xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  {verb}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive XYZ Formula Assistant (for bullet points) */}
          {targetType === 'bullet' && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  The Google & Harvard "XYZ" Formula
                </h4>
              </div>
              <p className="text-xs text-indigo-900/80">
                Formula: <em>Accomplished [X], measured by [Y], by doing [Z]</em>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                    X: Accomplished What?
                  </label>
                  <input
                    type="text"
                    value={xyzWhat}
                    onChange={(e) => setXyzWhat(e.target.value)}
                    placeholder="e.g. database migration"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                    Y: Measured by? (Metric)
                  </label>
                  <input
                    type="text"
                    value={xyzMetric}
                    onChange={(e) => setXyzMetric(e.target.value)}
                    placeholder="e.g. 40% latency reduction"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                    Z: By Doing What?
                  </label>
                  <input
                    type="text"
                    value={xyzHow}
                    onChange={(e) => setXyzHow(e.target.value)}
                    placeholder="e.g. indexing & caching"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
              {(xyzWhat || xyzMetric || xyzHow) && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-indigo-900 font-medium">
                    Preview: <em>Accomplished {xyzWhat || '[X]'}, measured by {xyzMetric || '[Y]'}, by doing {xyzHow || '[Z]'}.</em>
                  </p>
                  <button
                    onClick={handleGenerateXyz}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Use This Bullet
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Tailored Suggestions */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ready-to-Use High-Impact Variations
            </label>
            <div className="space-y-2.5">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedOption === idx
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-indigo-100 text-indigo-700">
                        {item.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.text, idx);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(suggestions[selectedOption].text);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span>Apply Selected Suggestion</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
