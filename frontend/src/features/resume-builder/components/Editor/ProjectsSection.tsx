"use client";

import React, { useState } from 'react';
import { ProjectItem } from '../../types';
import { Plus, Trash2, FolderGit2, ChevronDown, ChevronUp, X } from '../Icons';

interface ProjectsSectionProps {
  projects: ProjectItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ProjectItem>) => void;
  onDelete: (id: string) => void;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(projects[0]?.id || null);
  const [techInputs, setTechInputs] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAddTech = (projId: string, currentTech: string[]) => {
    const val = techInputs[projId]?.trim();
    if (val && !currentTech.includes(val)) {
      onUpdate(projId, { technologies: [...currentTech, val] });
      setTechInputs((prev) => ({ ...prev, [projId]: '' }));
    }
  };

  const handleRemoveTech = (projId: string, currentTech: string[], techToRemove: string) => {
    onUpdate(projId, {
      technologies: currentTech.filter((t) => t !== techToRemove),
    });
  };

  const handleAddBullet = (projId: string, currentBullets: string[]) => {
    onUpdate(projId, {
      highlights: [...currentBullets, 'Engineered core functionality resulting in measurable improvements.'],
    });
  };

  const handleUpdateBullet = (projId: string, currentBullets: string[], idx: number, val: string) => {
    const updated = [...currentBullets];
    updated[idx] = val;
    onUpdate(projId, { highlights: updated });
  };

  const handleDeleteBullet = (projId: string, currentBullets: string[], idx: number) => {
    onUpdate(projId, {
      highlights: currentBullets.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Key Projects & Open Source ({projects.length})
          </h4>
          <p className="text-3xs text-slate-500">
            Showcase technical depth with live URLs, GitHub repositories, and tech stacks.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <FolderGit2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No projects added yet</p>
          <p className="text-2xs text-slate-500 mb-3">Add open-source tools, hackathons, or enterprise projects.</p>
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            + Add Project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj, idx) => {
            const isExpanded = expandedId === proj.id;

            return (
              <div
                key={proj.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
              >
                <div
                  onClick={() => toggleExpand(proj.id)}
                  className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-2xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {proj.name || 'Untitled Project'}
                        </span>
                        {proj.role && <span className="text-3xs text-slate-500 italic">({proj.role})</span>}
                      </div>
                      <span className="text-3xs text-slate-500 font-medium">
                        {proj.technologies?.slice(0, 3).join(', ')}
                        {proj.technologies?.length > 3 ? ` +${proj.technologies.length - 3} more` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onDelete(proj.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(proj.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer ml-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-3.5 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => onUpdate(proj.id, { name: e.target.value })}
                          placeholder="e.g. HyperSync - CRDT Real-time Engine"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Your Role / Contribution
                        </label>
                        <input
                          type="text"
                          value={proj.role || ''}
                          onChange={(e) => onUpdate(proj.id, { role: e.target.value })}
                          placeholder="e.g. Lead Architect, Core Contributor"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          Live URL / Demo
                        </label>
                        <input
                          type="text"
                          value={proj.url || ''}
                          onChange={(e) => onUpdate(proj.id, { url: e.target.value })}
                          placeholder="https://myproject.dev"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                          GitHub Repository URL
                        </label>
                        <input
                          type="text"
                          value={proj.githubUrl || ''}
                          onChange={(e) => onUpdate(proj.id, { githubUrl: e.target.value })}
                          placeholder="https://github.com/user/repo"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Tech Stack Chips */}
                    <div>
                      <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                        Technologies Used
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={techInputs[proj.id] || ''}
                          onChange={(e) =>
                            setTechInputs((prev) => ({ ...prev, [proj.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTech(proj.id, proj.technologies || []);
                            }
                          }}
                          placeholder="Type tech and press Enter (e.g. Rust, WebSockets)..."
                          className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTech(proj.id, proj.technologies || [])}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {proj.technologies?.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs bg-slate-100 text-slate-800 border border-slate-200"
                          >
                            <span>{tech}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTech(proj.id, proj.technologies, tech)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bullets */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-3xs font-bold text-slate-700 uppercase tracking-wide">
                          Impact / Key Highlights
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddBullet(proj.id, proj.highlights || [])}
                          className="flex items-center gap-1 text-2xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {proj.highlights?.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-1.5">
                            <span className="text-slate-400 mt-2 text-2xs">•</span>
                            <textarea
                              rows={2}
                              value={bullet}
                              onChange={(e) =>
                                handleUpdateBullet(proj.id, proj.highlights, bIdx, e.target.value)
                              }
                              placeholder="Impact bullet..."
                              className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteBullet(proj.id, proj.highlights, bIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
    </div>
  );
};
