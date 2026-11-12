"use client";

import React, { useState } from 'react';
import { EducationItem } from '../../types';
import { Plus, Trash2, GraduationCap, ChevronDown, ChevronUp } from '../Icons';

interface EducationSectionProps {
  education: EducationItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<EducationItem>) => void;
  onDelete: (id: string) => void;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  education,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(education[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Education ({education.length})
          </h4>
          <p className="text-3xs text-slate-500">
            Degrees, academic institutions, honors, and relevant coursework.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Education</span>
        </button>
      </div>

      {education.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No education entries yet</p>
          <p className="text-2xs text-slate-500 mb-3">Add your university, college, or specialized degree.</p>
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            + Add Degree
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {education.map((edu, idx) => {
            const isExpanded = expandedId === edu.id;

            return (
              <div
                key={edu.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
              >
                <div
                  onClick={() => toggleExpand(edu.id)}
                  className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-2xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {edu.degree || 'Degree / Major'}
                      </span>
                      <span className="text-3xs text-slate-500 font-medium">
                        {edu.institution || 'Institution'} · {edu.endDate || 'Graduation'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onDelete(edu.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete education entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(edu.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer ml-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Degree / Major *
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => onUpdate(edu.id, { degree: e.target.value })}
                          placeholder="e.g. B.S. in Computer Science"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Institution / University *
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => onUpdate(edu.id, { institution: e.target.value })}
                          placeholder="e.g. Stanford University"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={edu.location}
                          onChange={(e) => onUpdate(edu.id, { location: e.target.value })}
                          placeholder="e.g. Stanford, CA"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                            Graduation Date
                          </label>
                          <input
                            type="text"
                            value={edu.endDate}
                            onChange={(e) => onUpdate(edu.id, { endDate: e.target.value })}
                            placeholder="e.g. 2022-05"
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                            GPA (Optional)
                          </label>
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => onUpdate(edu.id, { gpa: e.target.value })}
                            placeholder="e.g. 3.9 / 4.0"
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                        Honors / Distinctions
                      </label>
                      <input
                        type="text"
                        value={edu.honors || ''}
                        onChange={(e) => onUpdate(edu.id, { honors: e.target.value })}
                        placeholder="e.g. Magna Cum Laude, Dean's List, Tau Beta Pi"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                        Relevant Coursework
                      </label>
                      <input
                        type="text"
                        value={edu.coursework || ''}
                        onChange={(e) => onUpdate(edu.id, { coursework: e.target.value })}
                        placeholder="e.g. Distributed Systems, Algorithms, Computer Architecture"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
