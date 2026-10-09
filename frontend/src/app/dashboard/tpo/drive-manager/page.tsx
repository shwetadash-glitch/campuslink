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
                        <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-campusblue-900 mb-2">Drive Status</label>
                <select className="w-full p-2.5 border border-campusblue-200 rounded-lg text-sm text-campusblue-800 bg-white focus:outline-none focus:ring-2 focus:ring-campusblue-500">
                  <option value="active">Active (Accepting Applications)</option>
                  <option value="drafts">Draft (Setup Phase)</option>
                  <option value="completed">Completed (Archived)</option>
                </select>
              </div>
              
              <div className="p-4 bg-campusblue-50/50 rounded-xl border border-campusblue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-campusblue-900 text-sm">AI Shortlisting Rules</h3>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-campusblue-200 appearance-none cursor-pointer checked:right-0 checked:border-green-500 transition-all duration-300" defaultChecked />
                      <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-campusblue-200 cursor-pointer"></label>
                  </div>
                </div>
                <p className="text-xs text-campusblue-500 mb-4">Automatically filter candidates based on readiness dimensions before they reach the recruiter.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="flex justify-between text-xs font-semibold text-campusblue-800 mb-1">
                      <span>Minimum Readiness Score</span>
                      <span className="text-campusblue-900">75 / 100</span>
                    </label>
                    <input type="range" min="0" max="100" defaultValue="75" className="w-full h-2 bg-campusblue-200 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-campusblue-900 mb-2">Rounds Configuration</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-campusblue-100 rounded-lg bg-white">
                    <span className="text-sm font-medium text-campusblue-800">1. Online Assessment</span>
                    <button className="text-xs bg-campusblue-50 text-campusblue-700 px-2 py-1 rounded hover:bg-campusblue-100">Edit</button>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-campusblue-100 rounded-lg bg-white">
                    <span className="text-sm font-medium text-campusblue-800">2. Technical Interview</span>
                    <button className="text-xs bg-campusblue-50 text-campusblue-700 px-2 py-1 rounded hover:bg-campusblue-100">Edit</button>
                  </div>
                  <button className="w-full py-2 border-2 border-dashed border-campusblue-200 rounded-lg text-sm text-campusblue-500 font-semibold hover:border-campusblue-400 hover:text-campusblue-700 transition">
                    + Add New Round
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-campusblue-50 bg-campusblue-50 flex justify-between items-center">
              <button onClick={() => setManagingDrive(null)} className="text-campusblue-600 hover:text-campusblue-900 font-semibold text-sm px-4">
                Cancel
              </button>
              <button onClick={() => { alert("Configuration saved!"); setManagingDrive(null); }} className="bg-campusblue-900 hover:bg-campusblue-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}





