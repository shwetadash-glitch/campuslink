"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ResumeData } from '../../types';
import { ResumeRenderer } from './ResumeRenderer';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileText,
  Printer,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
} from '../Icons';

interface ResumePreviewContainerProps {
  resume: ResumeData;
  onDownloadPdf: () => void;
  isGeneratingPdf: boolean;
}

const ZOOM_STEPS = [0.5, 0.65, 0.75, 0.85, 1.0, 1.15, 1.25, 1.5];

export const ResumePreviewContainer: React.FC<ResumePreviewContainerProps> = ({
  resume,
  onDownloadPdf,
  isGeneratingPdf,
}) => {
  const [zoomIndex, setZoomIndex] = useState(4); // default 100% (index 4)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [estimatedPages, setEstimatedPages] = useState(1);

  const currentZoom = ZOOM_STEPS[zoomIndex];

  // Auto-calculate height and estimate page count based on A4 height (1123px at 96 DPI)
  useEffect(() => {
    if (sheetRef.current) {
      const height = sheetRef.current.scrollHeight;
      const a4HeightPx = 1123;
      const pages = Math.max(1, Math.ceil(height / a4HeightPx));
      setEstimatedPages(pages);
    }
  }, [resume, currentZoom]);

  const handleZoomIn = () => {
    if (zoomIndex < ZOOM_STEPS.length - 1) {
      setZoomIndex((prev) => prev + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex((prev) => prev - 1);
    }
  };

  const handleFitToWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 64; // accounting for padding
      const targetWidth = 794; // A4 standard width in px
      const scale = Math.min(1.2, Math.max(0.5, containerWidth / targetWidth));
      // find closest step
      const closestIdx = ZOOM_STEPS.reduce((prev, curr, idx) =>
        Math.abs(curr - scale) < Math.abs(ZOOM_STEPS[prev] - scale) ? idx : prev, 0);
      setZoomIndex(closestIdx);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full bg-slate-100/80 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md' : ''
      }`}
    >
      {/* Floating Glassmorphic Control Bar */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        {/* Left: Document info */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-2xs uppercase tracking-wide">
            <FileText className="w-3 h-3 text-indigo-600" />
            {resume.settings.paperSize.toUpperCase()} · {resume.settings.template.toUpperCase()}
          </span>
          <span className="hidden sm:inline-block text-slate-400">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
            <Layers className="w-3 h-3" />
            {estimatedPages} {estimatedPages === 1 ? 'Page' : 'Pages'} (A4 format)
          </span>
        </div>

        {/* Center / Right: Zoom & Export Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200 text-slate-600">
            <button
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              title="Zoom Out"
              className="p-1.5 rounded-md hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToWidth}
              title="Fit to Width"
              className="px-2 py-1 text-2xs font-bold tabular-nums hover:text-slate-900 transition-colors cursor-pointer"
            >
              {Math.round(currentZoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              title="Zoom In"
              className="p-1.5 rounded-md hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download PDF button */}
          <button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Preparing...' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Viewport for Scaled A4 Sheet */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${currentZoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="relative transition-all duration-150"
        >
          {/* Realistic A4 Paper Sheet (210mm x 297mm standard ratio: 794px x 1123px) */}
          <div
            ref={sheetRef}
            className="resume-paper-container relative bg-white text-slate-900 shadow-xl border border-slate-200/90 rounded-sm"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm 18mm',
              boxSizing: 'border-box',
            }}
          >
            {/* The Actual Rendered Resume Template */}
            <ResumeRenderer resume={resume} />

            {/* Visual Page Break Marker (Guides user on A4 boundary at 1123px) */}
            <div
              className="no-print absolute left-0 right-0 pointer-events-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
              style={{ top: '1123px' }}
            >
              <div className="w-full border-b-2 border-dashed border-rose-400"></div>
              <span className="absolute px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-3xs font-bold border border-rose-200 shadow-xs uppercase tracking-wider">
                ✂ A4 Page 1 Break Indicator
              </span>
            </div>

            {/* Page 2 Break Marker if content exceeds 2 pages */}
            <div
              className="no-print absolute left-0 right-0 pointer-events-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
              style={{ top: '2246px' }}
            >
              <div className="w-full border-b-2 border-dashed border-rose-400"></div>
              <span className="absolute px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-3xs font-bold border border-rose-200 shadow-xs uppercase tracking-wider">
                ✂ A4 Page 2 Break Indicator
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
