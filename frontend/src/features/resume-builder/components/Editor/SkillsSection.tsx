"use client";

import React, { useState } from 'react';
import { SkillCategory, SkillLevel } from '../../types';
import { Plus, Trash2, X, Wrench, Sparkles, Check } from '../Icons';

interface SkillsSectionProps {
  skills: SkillCategory[];
  onAddCategory: (name?: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddSkill: (catId: string, skillName: string, level?: SkillLevel) => void;
  onRemoveSkill: (catId: string, skillName: string) => void;
}

const PRESET_BUNDLES = [
  {
    name: 'Full-Stack TypeScript',
    category: 'Full-Stack Stack',
    skills: ['TypeScript', 'React 19', 'Next.js', 'Tailwind CSS', 'Node.js', 'PostgreSQL', 'Prisma'],
  },
  {
    name: 'Cloud & Distributed Systems',
    category: 'Cloud & Infrastructure',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Kafka', 'Redis', 'CI/CD Pipelines'],
  },
  {
    name: 'AI & Data Engineering',
    category: 'AI & Machine Learning',
    skills: ['Python', 'PyTorch', 'LangChain', 'OpenAI APIs', 'Vector DBs (Pinecone)', 'SQL', 'FastAPI'],
  },
];

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  skills,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSkill,
  onRemoveSkill,
}) => {
  const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});
  const [activeLevel, setActiveLevel] = useState<SkillLevel>('Advanced');

  const handleKeyDown = (catId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = newSkillInputs[catId]?.trim();
      if (val) {
        onAddSkill(catId, val, activeLevel);
        setNewSkillInputs((prev) => ({ ...prev, [catId]: '' }));
      }
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_BUNDLES[0]) => {
    // Check if category exists or create it
    const existingCat = skills.find((c) => c.name.toLowerCase() === preset.category.toLowerCase());
    if (existingCat) {
      preset.skills.forEach((s) => onAddSkill(existingCat.id, s, 'Advanced'));
    } else {
      onAddCategory(preset.category);
      setTimeout(() => {
        // Will add once created
      }, 50);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Skills & Competencies ({skills.reduce((acc, c) => acc + c.skills.length, 0)} total)
          </h4>
          <p className="text-3xs text-slate-500">
            Categorized skills heavily influence ATS keyword indexing and recruiter searches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAddCategory('New Skill Group')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Preset Bundles Banner */}
      <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
        <div className="flex items-center gap-1.5 text-2xs font-bold text-indigo-950 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick-Add Industry Skill Bundles</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_BUNDLES.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyPreset(b)}
              className="px-2.5 py-1 text-2xs font-semibold bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white shadow-2xs transition-all cursor-pointer"
            >
              + {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category Groups */}
      <div className="space-y-3.5">
        {skills.map((category) => (
          <div
            key={category.id}
            className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
          >
            {/* Category Name & Delete */}
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={category.name}
                onChange={(e) => onUpdateCategory(category.id, e.target.value)}
                placeholder="Category Name (e.g. Languages & Core)"
                className="text-xs font-bold text-slate-900 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 w-64"
              />

              <div className="flex items-center gap-2">
                <span className="text-3xs text-slate-400 font-semibold">
                  {category.skills.length} skills
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(category.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Input to add skill */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newSkillInputs[category.id] || ''}
                  onChange={(e) =>
                    setNewSkillInputs((prev) => ({ ...prev, [category.id]: e.target.value }))
                  }
                  onKeyDown={(e) => handleKeyDown(category.id, e)}
                  placeholder="Type skill & press Enter (e.g. Next.js, Rust, Docker)..."
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <select
                value={activeLevel}
                onChange={(e) => setActiveLevel(e.target.value as SkillLevel)}
                className="text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="Expert">Expert</option>
                <option value="Advanced">Advanced</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Beginner">Beginner</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const val = newSkillInputs[category.id]?.trim();
                  if (val) {
                    onAddSkill(category.id, val, activeLevel);
                    setNewSkillInputs((prev) => ({ ...prev, [category.id]: '' }));
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Skill Tag Chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-lg bg-slate-50/70 border border-slate-100">
              {category.skills.length === 0 ? (
                <span className="text-3xs text-slate-400 italic">No skills added in this group yet.</span>
              ) : (
                category.skills.map((skill, sIdx) => (
                  <div
                    key={sIdx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-200/90 shadow-2xs group"
                  >
                    <span>{skill.name}</span>
                    {skill.level && (
                      <span className="text-3xs px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-bold">
                        {skill.level}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveSkill(category.id, skill.name)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
