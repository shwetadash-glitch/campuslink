"use client";

import React, { useState, useRef } from 'react';
import { ResumeData, TemplateId, FontFamily, ACCENT_COLORS, FONT_OPTIONS } from '../types';
import {
  LayoutTemplate,
  Palette,
  Type,
  Printer,
  Download,
  Upload,
  Undo2,
  Redo2,
  Sparkles,
  Award,
  ChevronDown,
  Check,
  RefreshCw,
  Trash2,
} from './Icons';

interface NavbarProps {
  resume: ResumeData;
  onUpdateTitle: (title: string) => void;
  onUpdateSettings: (settings: Partial<ResumeData['settings']>) => void;
  atsScore: number;
  onOpenAtsModal: () => void;
  onOpenTemplateModal: () => void;
  onLoadSample: () => void;
  onClearAll: () => void;
  onDownloadPdf: () => void;
  onExportJson: () => void;
  onImportJson: (json: string) => void;
  saveStatus: 'saved' | 'saving';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isGeneratingPdf: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  resume,
  onUpdateTitle,
  onUpdateSettings,
  atsScore,
  onOpenAtsModal,
  onOpenTemplateModal,
  onLoadSample,
  onClearAll,
  onDownloadPdf,
  onExportJson,
  onImportJson,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isGeneratingPdf,
}) => {
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) onImportJson(content);
      };
      reader.readAsText(file);
    }
  };

  const getAtsBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
  };

  return (
    <header className="no-print h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 select-none shadow-2xs">
      {/* Left: Brand & Document Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-black tracking-tight text-slate-900 leading-none">
              CAMPUSLINK
            </span>
            <span className="text-3xs font-semibold text-slate-400 uppercase tracking-widest">
              Resume Studio
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

        {/* Document Title (Editable) */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={resume.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white px-2 py-1 rounded-md border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-indigo-500 max-w-[140px] sm:max-w-[220px] truncate"
            title="Rename resume"
          />
          <span className="text-3xs text-slate-400 hidden lg:inline">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-600">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <Check className="w-2.5 h-2.5" /> Auto-saved
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Center: Style Customizers (Templates, Accent, Font) */}
      <div className="hidden lg:flex items-center gap-1.5">
        {/* Template Switcher */}
        <button
          onClick={onOpenTemplateModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-indigo-600" />
          <span className="capitalize">{resume.settings.template} Template</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Accent Color Picker Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowColorDropdown(!showColorDropdown);
              setShowFontDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
              style={{ backgroundColor: resume.settings.accentColor }}
            ></span>
            <span className="hidden xl:inline">Color</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showColorDropdown && (
            <div className="absolute top-full left-0 mt-1.5 p-2.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 grid grid-cols-4 gap-2 w-48 animate-in fade-in duration-100">
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.value}
                  onClick={() => {
                    onUpdateSettings({ accentColor: col.value });
                    setShowColorDropdown(false);
                  }}
                  title={col.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs"
                  style={{ backgroundColor: col.value }}
                >
                  {resume.settings.accentColor === col.value && (
                    <Check className="w-4 h-4 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Family Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFontDropdown(!showFontDropdown);
              setShowColorDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
          >
            <Type className="w-3.5 h-3.5 text-slate-600" />
            <span className="capitalize">{resume.settings.fontFamily}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showFontDropdown && (
            <div className="absolute top-full left-0 mt-1.5 p-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 w-56 animate-in fade-in duration-100 space-y-1">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onUpdateSettings({ fontFamily: f.id });
                    setShowFontDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                    resume.settings.fontFamily === f.id
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-3xs text-slate-400">{f.category}</div>
                  </div>
                  {resume.settings.fontFamily === f.id && (
                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center ml-1 border-l border-slate-200 pl-2">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: ATS Score, Sample, Actions, Download PDF */}
      <div className="flex items-center gap-2">
        {/* ATS Score Badge (Clickable) */}
        <button
          onClick={onOpenAtsModal}
          title="Click to view full ATS score breakdown & recommendations"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs ${getAtsBadgeColor(
            atsScore
          )}`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>ATS {atsScore}%</span>
        </button>

        {/* Load Sample Button */}
        <button
          onClick={onLoadSample}
          title="Populate with Staff Engineer / High-Impact achievements"
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Sample Data</span>
        </button>

        {/* Export JSON / Import JSON */}
        <div className="hidden sm:flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Resume JSON"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExportJson}
            title="Export Resume JSON"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clear All Data */}
        <button
          onClick={() => {
            if (confirm('Clear all resume data and start with an empty sheet?')) {
              onClearAll();
            }
          }}
          title="Clear all fields"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer hidden sm:block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Download PDF Primary Action Button */}
        <button
          onClick={onDownloadPdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-60"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{isGeneratingPdf ? 'Exporting...' : 'Download PDF'}</span>
        </button>
      </div>
    </header>
  );
};
