"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";

const MOCK_DRIVES = [
  { id: 1, name: "TechCorp Campus Drive 2026", company: "TechCorp", role: "Software Engineer", type: "ON_CAMPUS", status: "active", date: "Oct 15, 2026", candidates: 145 },
  { id: 2, name: "Innovate Intern Hiring", company: "Innovate Solutions", role: "Frontend Intern", type: "VIRTUAL", status: "active", date: "Oct 20, 2026", candidates: 312 },
  { id: 3, name: "Global Systems Mega Drive", company: "Global Systems", role: "Data Analyst", type: "HYBRID", status: "drafts", date: "TBD", candidates: 0 },
  { id: 4, name: "AI Engineer Specialized Drive", company: "NextGen AI", role: "Machine Learning Engineer", type: "VIRTUAL", status: "drafts", date: "TBD", candidates: 0 },
  { id: 5, name: "Fintech Early Careers 2026", company: "Fintech XYZ", role: "Business Analyst", type: "ON_CAMPUS", status: "completed", date: "Sep 10, 2026", candidates: 85 },
];

export default function DriveManagerPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [managingDrive, setManagingDrive] = useState<any>(null);

  const filteredDrives = MOCK_DRIVES.filter(d => d.status === activeTab);

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader 
        title="Drive Lifecycle Manager" 
        description="Create, stage, and track corporate placement drives through their complete lifecycle." 
        actionLabel="Create New Drive"
        onAction={() => alert("Drive creation wizard coming soon!")}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="border-b border-campusblue-100 bg-campusblue-50 px-6 py-4 flex gap-4">
            <button 
              onClick={() => setActiveTab("active")}
              className={`text-sm font-semibold pb-1 transition-colors ${activeTab === "active" ? "text-campusblue-700 border-b-2 border-campusblue-700" : "text-campusblue-500 hover:text-campusblue-800"}`}
            >
              Active Drives
            </button>
            <button 
              onClick={() => setActiveTab("drafts")}
              className={`text-sm font-semibold pb-1 transition-colors ${activeTab === "drafts" ? "text-campusblue-700 border-b-2 border-campusblue-700" : "text-campusblue-500 hover:text-campusblue-800"}`}
            >
              Drafts
            </button>
            <button 
              onClick={() => setActiveTab("completed")}
              className={`text-sm font-semibold pb-1 transition-colors ${activeTab === "completed" ? "text-campusblue-700 border-b-2 border-campusblue-700" : "text-campusblue-500 hover:text-campusblue-800"}`}
            >
              Completed
            </button>
          </div>
          
          <div className="p-6">
            {filteredDrives.length > 0 ? (
              <div className="space-y-4">
                {filteredDrives.map(drive => (
                  <div key={drive.id} className="border border-campusblue-100 rounded-xl p-5 hover:border-campusblue-200 hover:shadow-md transition bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-campusblue-50 rounded-lg flex items-center justify-center font-bold text-campusblue-500 shrink-0">
                        {drive.company.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-campusblue-900 text-lg mb-1">{drive.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-campusblue-500">
                          <span className="font-semibold text-campusblue-700">{drive.company}</span>
                          <span>&bull;</span>
                          <span>{drive.role}</span>
                          <span>&bull;</span>
                          <span className="bg-campusblue-50 px-2 py-0.5 rounded text-campusblue-700 font-medium">{drive.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 md:border-l md:border-campusblue-50 md:pl-6">
                      <div className="text-center">
                        <div className="text-2xl font-black text-campusblue-900">{drive.candidates}</div>
                        <div className="text-[10px] uppercase font-bold text-campusblue-300 tracking-wider">Candidates</div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <div className="text-sm font-bold text-campusblue-900">{drive.date}</div>
                        <div className="text-[10px] uppercase font-bold text-campusblue-300 tracking-wider">Schedule</div>
                      </div>
                      <button onClick={() => setManagingDrive(drive)} className="bg-campusblue-50 hover:bg-campusblue-50 border border-campusblue-100 px-4 py-2 rounded-lg text-sm font-semibold text-campusblue-800 transition">
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6">
                {activeTab === "active" && (
                  <EmptyState 
                    title="No active drives found" 
                    description="You haven't scheduled any active placement drives for this cohort yet."
                    actionText="Create New Drive"
                    onAction={() => alert("Drive creation wizard coming soon!")}
                  />
                )}
                {activeTab === "drafts" && (
                  <EmptyState 
                    title="No drafted drives" 
                    description="You do not have any unfinished or drafted placement drive setups."
                    actionText="Create New Drive"
                    onAction={() => alert("Drive creation wizard coming soon!")}
                  />
                )}
                {activeTab === "completed" && (
                  <EmptyState 
                    title="No completed drives" 
                    description="You do not have any historically completed placement drives on record."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {managingDrive && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-6 border-b border-campusblue-50 flex justify-between items-center bg-campusblue-50/50">
              <div>
                <span className="bg-campusblue-50 text-campusblue-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">Management Console</span>
                <h2 className="text-xl font-bold text-campusblue-900 leading-tight">Configure Drive</h2>
                <p className="text-sm text-campusblue-500 mt-1">{managingDrive.name}</p>
              </div>
              <button onClick={() => setManagingDrive(null)} className="w-8 h-8 flex items-center justify-center bg-campusblue-50 hover:bg-campusblue-100 rounded-full text-campusblue-500 hover:text-campusblue-800 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-campusblue-700 leading-relaxed">
                The comprehensive drive management configuration panel is currently under active development. Once finalized, this interface will allow Placement Officers to:
              </p>
              <ul className="list-disc list-inside text-sm text-campusblue-800 space-y-2 ml-1">
                <li><span className="font-semibold">Review & Approve</span> corporate job requisitions.</li>
                <li><span className="font-semibold">Deploy AI Rules</span> based on cohort readiness scoring.</li>
                <li><span className="font-semibold">Schedule Rounds</span> using the Conflict-Free Scheduler.</li>
                <li><span className="font-semibold">Monitor Pipeline</span> for real-time candidate conversions.</li>
              </ul>
            </div>
            <div className="p-6 border-t border-campusblue-50 bg-campusblue-50 flex justify-end">
              <button onClick={() => setManagingDrive(null)} className="bg-campusblue-900 hover:bg-campusblue-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}




