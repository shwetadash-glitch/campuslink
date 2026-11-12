"use client";

import React, { useState } from 'react';
import { WorkExperienceItem } from '../../types';
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, ChevronDown, ChevronUp, Briefcase } from '../Icons';
import { AIEnhanceModal } from '../AIEnhanceModal';

interface ExperienceSectionProps {
  experience: WorkExperienceItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<WorkExperienceItem>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  experience,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(experience[0]?.id || null);
  const [aiBulletModal, setAiBulletModal] = useState<{
    isOpen: boolean;
    expId: string;
    bulletIdx: number;
    text: string;
    jobTitle: string;
  }>({
    isOpen: false,
    expId: '',
    bulletIdx: -1,
    text: '',
    jobTitle: '',
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAddBullet = (expId: string, currentBullets: string[]) => {
    onUpdate(expId, {
      highlights: [...currentBullets, 'Accomplished [X] measured by [Y]% by implementing [Z].'],
    });
  };

  const handleUpdateBullet = (expId: string, currentBullets: string[], idx: number, val: string) => {
    const updated = [...currentBullets];
    updated[idx] = val;
    onUpdate(expId, { highlights: updated });
  };

  const handleDeleteBullet = (expId: string, currentBullets: string[], idx: number) => {
    onUpdate(expId, {
      highlights: currentBullets.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Work Experience ({experience.length})
          </h4>
          <p className="text-3xs text-slate-500">
            Detail your career trajectory with quantified achievements (metrics, scale, cost savings).
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Position</span>
        </button>
      </div>

      {experience.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No work experience added yet</p>
          <p className="text-2xs text-slate-500 mb-3">Add your employment, internships, or freelance roles.</p>
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
          >
            + Add First Experience
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {experience.map((exp, expIdx) => {
            const isExpanded = expandedId === exp.id;

            return (
              <div
                key={exp.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(exp.id)}
                  className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-2xs">
                      #{expIdx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {exp.jobTitle || 'Untitled Position'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {exp.company ? `@ ${exp.company}` : ''}
                        </span>
                      </div>
                      <span className="text-3xs text-slate-500 font-medium">
                        {exp.startDate || 'Start'} – {exp.isCurrent ? 'Present' : exp.endDate || 'End'}
                        {exp.location ? ` · ${exp.location}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={expIdx === 0}
                      onClick={() => onMove(exp.id, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={expIdx === experience.length - 1}
                      onClick={() => onMove(exp.id, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(exp.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete experience"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(exp.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer ml-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Form Content */}
                {isExpanded && (
                  <div className="p-4 space-y-3.5 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          value={exp.jobTitle}
                          onChange={(e) => onUpdate(exp.id, { jobTitle: e.target.value })}
                          placeholder="e.g. Senior Software Engineer"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Company / Organization *
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => onUpdate(exp.id, { company: e.target.value })}
                          placeholder="e.g. Stripe, Google, Acme Inc."
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => onUpdate(exp.id, { location: e.target.value })}
                          placeholder="e.g. San Francisco, CA (or Remote)"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                            Start Date
                          </label>
                          <input
                            type="text"
                            value={exp.startDate}
                            onChange={(e) => onUpdate(exp.id, { startDate: e.target.value })}
                            placeholder="e.g. 2021-03"
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-3xs font-bold text-slate-600 uppercase">
                              End Date
                            </label>
                            <label className="flex items-center gap-1 text-3xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exp.isCurrent}
                                onChange={(e) => onUpdate(exp.id, { isCurrent: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                              />
                              <span>Present</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            disabled={exp.isCurrent}
                            value={exp.isCurrent ? 'Present' : exp.endDate}
                            onChange={(e) => onUpdate(exp.id, { endDate: e.target.value })}
                            placeholder="e.g. 2023-08"
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bullet Points with XYZ Formula Enhancer */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-3xs font-bold text-slate-700 uppercase tracking-wide">
                          Accomplishments / Bullet Points ({exp.highlights.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddBullet(exp.id, exp.highlights)}
                          className="flex items-center gap-1 text-2xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {exp.highlights.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-1.5">
                            <span className="text-slate-400 mt-2 text-2xs">•</span>
                            <textarea
                              rows={2}
                              value={bullet}
                              onChange={(e) => handleUpdateBullet(exp.id, exp.highlights, bIdx, e.target.value)}
                              placeholder="Accomplished [X], measured by [Y]%, by doing [Z]..."
                              className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setAiBulletModal({
                                    isOpen: true,
                                    expId: exp.id,
                                    bulletIdx: bIdx,
                                    text: bullet,
                                    jobTitle: exp.jobTitle,
                                  })
                                }
                                title="Enhance bullet with AI / XYZ formula"
                                className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBullet(exp.id, exp.highlights, bIdx)}
                                title="Remove bullet point"
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Bullet Enhancer Modal */}
      <AIEnhanceModal
        isOpen={aiBulletModal.isOpen}
        onClose={() => setAiBulletModal((prev) => ({ ...prev, isOpen: false }))}
        targetType="bullet"
        currentText={aiBulletModal.text}
        jobTitle={aiBulletModal.jobTitle}
        onApply={(enhanced) => {
          const targetExp = experience.find((e) => e.id === aiBulletModal.expId);
          if (targetExp) {
            handleUpdateBullet(aiBulletModal.expId, targetExp.highlights, aiBulletModal.bulletIdx, enhanced);
          }
        }}
      />
    </div>
  );
};
