"use client";

import React, { useState } from 'react';
import { CustomSection, CustomSectionItem } from '../../types';
import { Plus, Trash2, Layers, ChevronDown, ChevronUp } from '../Icons';

interface CustomSectionsProps {
  customSections: CustomSection[];
  onAddSection: (title?: string) => void;
  onUpdateSection: (id: string, updates: Partial<CustomSection>) => void;
  onDeleteSection: (id: string) => void;
}

const COMMON_SUGGESTIONS = [
  'Awards & Honors',
  'Publications & Research',
  'Volunteer & Community',
  'Spoken Languages',
  'Patents & Inventions',
  'Conferences & Speaking',
];

export const CustomSections: React.FC<CustomSectionsProps> = ({
  customSections,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(customSections[0]?.id || null);

  const handleAddItem = (secId: string, currentItems: CustomSectionItem[]) => {
    onUpdateSection(secId, {
      items: [
        ...currentItems,
        {
          id: `item-${Date.now()}`,
          title: 'Title / Honor',
          subtitle: 'Organization',
          date: '2023',
          highlights: ['Description or key achievement.'],
        },
      ],
    });
  };

  const handleUpdateItem = (
    secId: string,
    currentItems: CustomSectionItem[],
    itemId: string,
    updates: Partial<CustomSectionItem>
  ) => {
    onUpdateSection(secId, {
      items: currentItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    });
  };

  const handleDeleteItem = (secId: string, currentItems: CustomSectionItem[], itemId: string) => {
    onUpdateSection(secId, {
      items: currentItems.filter((item) => item.id !== itemId),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Custom Sections ({customSections.length})
          </h4>
          <p className="text-3xs text-slate-500">
            Add specialized sections for awards, publications, languages, or patents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAddSection('Additional Section')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Section</span>
        </button>
      </div>

      {/* Quick suggest pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-3xs text-slate-400 font-semibold uppercase">Popular:</span>
        {COMMON_SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onAddSection(s)}
            className="px-2 py-0.5 rounded text-3xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            + {s}
          </button>
        ))}
      </div>

      {customSections.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <Layers className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">No custom sections added</p>
          <p className="text-2xs text-slate-500 mb-2">Showcase unique achievements or publications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customSections.map((sec) => {
            const isExpanded = expandedId === sec.id;

            return (
              <div
                key={sec.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
              >
                <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100">
                  <input
                    type="text"
                    value={sec.sectionTitle}
                    onChange={(e) => onUpdateSection(sec.id, { sectionTitle: e.target.value })}
                    className="text-xs font-bold text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 w-56"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddItem(sec.id, sec.items)}
                      className="px-2.5 py-1 text-2xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors mr-1 cursor-pointer"
                    >
                      + Add Item
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSection(sec.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete entire section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : sec.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white">
                    {sec.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              handleUpdateItem(sec.id, sec.items, item.id, { title: e.target.value })
                            }
                            placeholder="Title or Honor name"
                            className="text-xs font-semibold text-slate-900 flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={item.date || ''}
                            onChange={(e) =>
                              handleUpdateItem(sec.id, sec.items, item.id, { date: e.target.value })
                            }
                            placeholder="Year / Date"
                            className="text-xs text-slate-600 w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(sec.id, sec.items, item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={item.subtitle || ''}
                          onChange={(e) =>
                            handleUpdateItem(sec.id, sec.items, item.id, { subtitle: e.target.value })
                          }
                          placeholder="Subtitle (Organization, Issuer, Conference)"
                          className="w-full text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        />

                        <textarea
                          rows={2}
                          value={item.highlights?.[0] || ''}
                          onChange={(e) =>
                            handleUpdateItem(sec.id, sec.items, item.id, {
                              highlights: [e.target.value],
                            })
                          }
                          placeholder="Key details, citation, or description..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
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
