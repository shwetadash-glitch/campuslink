"use client";

import React from 'react';
import { TemplateId } from '../types';
import { X, Check, LayoutTemplate, Sparkles, Building2, Code2, Palette } from './Icons';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: TemplateId;
  onSelectTemplate: (templateId: TemplateId) => void;
}

interface TemplateOption {
  id: TemplateId;
  title: string;
  category: string;
  tagline: string;
  features: string[];
  icon: React.ElementType;
  previewWireframe: React.ReactNode;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  selectedTemplate,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  const templates: TemplateOption[] = [
    {
      id: 'modern',
      title: 'Modern Minimalist',
      category: 'Tech & Startups',
      tagline: 'Clean aesthetic with crisp section dividers and tag chips.',
      features: ['Bold accent headers', 'Tag chips for proficiencies', 'High readability', '100% ATS-compliant'],
      icon: Code2,
      previewWireframe: (
        <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="w-1/2 h-2.5 bg-indigo-600 rounded-xs"></div>
            <div className="w-1/3 h-1.5 bg-slate-300 rounded-xs"></div>
            <div className="w-full h-0.5 bg-slate-200 my-1"></div>
            <div className="w-1/4 h-1.5 bg-indigo-400 rounded-xs"></div>
            <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
            <div className="w-5/6 h-1 bg-slate-200 rounded-xs"></div>
          </div>
          <div className="flex gap-1">
            <div className="w-8 h-2 bg-slate-200 rounded-full"></div>
            <div className="w-10 h-2 bg-slate-200 rounded-full"></div>
            <div className="w-7 h-2 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      ),
    },
    {
      id: 'executive',
      title: 'Executive Classic',
      category: 'Finance & Consulting',
      tagline: 'Traditional Ivy-League serif typography with centered header.',
      features: ['Centered header hierarchy', 'Garamond & Merriweather typography', 'Rigorous whitespace balance', 'Maximum ATS clarity'],
      icon: Building2,
      previewWireframe: (
        <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col items-center justify-between">
          <div className="w-full space-y-1 text-center flex flex-col items-center">
            <div className="w-2/3 h-2.5 bg-slate-900 rounded-xs"></div>
            <div className="w-1/3 h-1 bg-slate-400 rounded-xs"></div>
            <div className="w-full h-0.5 bg-slate-900 my-1"></div>
            <div className="w-full flex justify-between">
              <div className="w-1/3 h-1.5 bg-slate-800 rounded-xs"></div>
              <div className="w-1/5 h-1.5 bg-slate-400 rounded-xs"></div>
            </div>
            <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
            <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
          </div>
          <div className="w-full h-0.5 bg-slate-300"></div>
        </div>
      ),
    },
    {
      id: 'compact',
      title: 'Technical Compact',
      category: 'Software Engineering',
      tagline: 'High-density layout engineered to maximize single-page real estate.',
      features: ['Inline role & date metadata', 'Tight line spacing', 'Maximized content density', 'Engineering standard'],
      icon: LayoutTemplate,
      previewWireframe: (
        <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded p-2 flex flex-col justify-between font-mono">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="w-2/5 h-2 bg-slate-900 rounded-xs"></div>
              <div className="w-1/4 h-1.5 bg-slate-400 rounded-xs"></div>
            </div>
            <div className="w-full h-px bg-slate-300"></div>
            <div className="w-full flex justify-between">
              <div className="w-1/2 h-1.5 bg-slate-800 rounded-xs"></div>
              <div className="w-1/6 h-1.5 bg-slate-400 rounded-xs"></div>
            </div>
            <div className="w-11/12 h-1 bg-slate-200 rounded-xs"></div>
            <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
            <div className="w-4/5 h-1 bg-slate-200 rounded-xs"></div>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-xs"></div>
        </div>
      ),
    },
    {
      id: 'creative',
      title: 'Creative Contemporary',
      category: 'Product & Design',
      tagline: 'Modern dual-column format with vibrant hero accent bar.',
      features: ['Colored hero accent banner', 'Side-by-side structure', 'Photo support', 'Visual portfolio appeal'],
      icon: Palette,
      previewWireframe: (
        <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded p-2 flex flex-col justify-between">
          <div className="w-full h-6 bg-indigo-600 rounded-xs mb-1.5 p-1 flex items-center justify-between">
            <div className="w-1/2 h-2 bg-white/90 rounded-xs"></div>
            <div className="w-4 h-4 rounded-full bg-white/40"></div>
          </div>
          <div className="grid grid-cols-12 gap-1.5 flex-1">
            <div className="col-span-4 bg-slate-100 rounded-xs p-1 space-y-1">
              <div className="w-full h-1 bg-slate-300 rounded-xs"></div>
              <div className="w-3/4 h-1 bg-slate-300 rounded-xs"></div>
            </div>
            <div className="col-span-8 space-y-1">
              <div className="w-full h-1.5 bg-slate-400 rounded-xs"></div>
              <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
              <div className="w-5/6 h-1 bg-slate-200 rounded-xs"></div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Choose Resume Template</h3>
              <p className="text-xs text-slate-300">All templates are tested and certified for ATS scanners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Cards Grid */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => {
              const isSelected = selectedTemplate === tpl.id;
              const Icon = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    onSelectTemplate(tpl.id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top title & icon */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{tpl.title}</h4>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wide bg-indigo-600 text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-2xs text-slate-500 font-medium">{tpl.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Wireframe Preview */}
                    <div className="mb-3">{tpl.previewWireframe}</div>

                    <p className="text-xs text-slate-600 mb-3">{tpl.tagline}</p>

                    {/* Bullet features */}
                    <div className="grid grid-cols-2 gap-1.5 text-2xs text-slate-500">
                      {tpl.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isSelected ? '✓ Currently Selected' : 'Switch to this Template'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <p className="text-2xs text-slate-500">
            Tip: You can switch templates anytime without losing any of your typed data.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
