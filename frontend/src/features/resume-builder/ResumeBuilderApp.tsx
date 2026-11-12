"use client";

import React, { useState, useMemo } from 'react';
import { useResumeStore } from './useResumeStore';
import { calculateAtsScore } from './atsScorer';
import { Navbar } from './components/Navbar';
import { EditorContainer } from './components/Editor/EditorContainer';
import { ResumePreviewContainer } from './components/Preview/ResumePreviewContainer';
import { TemplateModal } from './components/TemplateModal';
import { AtsModal } from './components/AtsModal';
import { Edit3, Eye, Sparkles } from './components/Icons';

export default function ResumeBuilderApp() {
  const store = useResumeStore();
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAtsModal, setShowAtsModal] = useState(false);

  // Real-time ATS Score calculation
  const atsData = useMemo(() => {
    return calculateAtsScore(store.resume);
  }, [store.resume]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-inter">
      {/* Top Utility Navigation */}
      <Navbar
        resume={store.resume}
        onUpdateTitle={store.updateTitle}
        onUpdateSettings={store.updateSettings}
        atsScore={atsData.overallScore}
        onOpenAtsModal={() => setShowAtsModal(true)}
        onOpenTemplateModal={() => setShowTemplateModal(true)}
        onLoadSample={store.loadSampleData}
        onClearAll={store.clearAllData}
        onDownloadPdf={store.downloadPdf}
        onExportJson={store.exportToJson}
        onImportJson={store.importFromJson}
        saveStatus={store.saveStatus}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={store.undo}
        onRedo={store.redo}
        isGeneratingPdf={store.isGeneratingPdf}
      />

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Editor (45% on desktop) */}
        <section
          className={`w-full md:w-[45%] h-full overflow-hidden flex flex-col z-10 ${
            mobileTab === 'preview' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <EditorContainer
            resume={store.resume}
            activeSection={store.activeSection}
            onSelectSection={store.setActiveSection}
            updatePersonalInfo={store.updatePersonalInfo}
            updateSummary={store.updateSummary}
            addExperience={store.addExperience}
            updateExperience={store.updateExperience}
            deleteExperience={store.deleteExperience}
            moveExperience={store.moveExperience}
            addEducation={store.addEducation}
            updateEducation={store.updateEducation}
            deleteEducation={store.deleteEducation}
            addSkillCategory={store.addSkillCategory}
            updateSkillCategory={store.updateSkillCategory}
            deleteSkillCategory={store.deleteSkillCategory}
            addSkillToCategory={store.addSkillToCategory}
            removeSkillFromCategory={store.removeSkillFromCategory}
            addProject={store.addProject}
            updateProject={store.updateProject}
            deleteProject={store.deleteProject}
            addCertification={store.addCertification}
            updateCertification={store.updateCertification}
            deleteCertification={store.deleteCertification}
            addCustomSection={store.addCustomSection}
            updateCustomSection={store.updateCustomSection}
            deleteCustomSection={store.deleteCustomSection}
          />
        </section>

        {/* Right Panel: Live Preview (55% on desktop) */}
        <section
          className={`w-full md:w-[55%] h-full overflow-hidden flex flex-col ${
            mobileTab === 'editor' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ResumePreviewContainer
            resume={store.resume}
            onDownloadPdf={store.downloadPdf}
            isGeneratingPdf={store.isGeneratingPdf}
          />
        </section>

        {/* Floating Mobile Mode Toggle (Stacked Layout) */}
        <div className="no-print md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md p-1 rounded-full shadow-xl border border-slate-700/60 flex items-center gap-1">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview ({atsData.overallScore}%)</span>
          </button>
        </div>
      </main>

      {/* Template Selection Modal */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        selectedTemplate={store.resume.settings.template}
        onSelectTemplate={(tpl) => store.updateSettings({ template: tpl })}
      />

      {/* ATS Analysis Breakdown Modal */}
      <AtsModal
        isOpen={showAtsModal}
        onClose={() => setShowAtsModal(false)}
        atsData={atsData}
        onNavigateSection={(sec) => store.setActiveSection(sec)}
      />
    </div>
  );
}
