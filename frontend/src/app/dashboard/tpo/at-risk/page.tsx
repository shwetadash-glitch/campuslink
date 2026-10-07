"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";

const AT_RISK_STUDENTS = [
  { id: 201, student: "James Smith", studentId: "STU042", branch: "Mechanical", riskLevel: "HIGH", score: 21.3, reason: "Consistent low performance in technical assessments. Needs immediate intervention.", intervention: "None" },
  { id: 202, student: "Emma Wilson", studentId: "STU088", branch: "Computer Science", riskLevel: "MEDIUM", score: 35.0, reason: "Excellent technical skills but failing communication rounds in mock interviews.", intervention: "Communication Workshop" },
  { id: 203, student: "Rahul Sharma", studentId: "ROLL2026012", branch: "Civil", riskLevel: "HIGH", score: 18.5, reason: "Multiple active academic backlogs preventing eligibility for most core companies.", intervention: "Academic Counseling" },
  { id: 204, student: "Sophia Lee", studentId: "STU015", branch: "ECE", riskLevel: "MEDIUM", score: 48.2, reason: "Has not attended any of the pre-placement technical training sessions.", intervention: "None" },
  { id: 205, student: "Ankit Patel", studentId: "ROLL2026045", branch: "Information Technology", riskLevel: "HIGH", score: 52.1, reason: "Rejected in final HR rounds by 4 different companies consecutively.", intervention: "Mock HR Interviews" },
  { id: 206, student: "Olivia Davis", studentId: "STU102", branch: "Computer Science", riskLevel: "MEDIUM", score: 49.5, reason: "Aptitude scores are borderline passing. May struggle with top-tier company cutoffs.", intervention: "Aptitude Remedial Class" },
];

export default function AtRiskCenterPage() {
  const [students, setStudents] = useState(AT_RISK_STUDENTS);
  const [counselingModal, setCounselingModal] = useState<{ id: number, name: string } | null>(null);
  
  const [branchFilter, setBranchFilter] = useState("All Branches");
  const [sortBy, setSortBy] = useState("severity");

  const branches = ["All Branches", ...Array.from(new Set(students.map(s => s.branch)))];

  const filteredAndSortedStudents = students
    .filter(s => branchFilter === "All Branches" || s.branch === branchFilter)
    .sort((a, b) => {
      if (sortBy === "severity") {
        // High risk first, then lowest score
        if (a.riskLevel === "HIGH" && b.riskLevel !== "HIGH") return -1;
        if (b.riskLevel === "HIGH" && a.riskLevel !== "HIGH") return 1;
        return a.score - b.score;
      } else {
        // Just score low to high
        return a.score - b.score;
      }
    });

  const handleAction = (id: number, actionType: string) => {
    alert(`Initiating ${actionType} workflow... Student has been notified.`);
    setStudents(students.map(s => s.id === id ? { ...s, intervention: actionType } : s));
  };

  const handleSendCounseling = (e: React.FormEvent) => {
    e.preventDefault();
    if (counselingModal) {
      setStudents(students.map(s => s.id === counselingModal.id ? { ...s, intervention: "1-on-1 Counseling" } : s));
      setCounselingModal(null);
      alert("Counseling request sent to student!");
    }
  };

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader 
        title="Cohort & At-Risk Center" 
        description="Monitor student cohorts and automatically identify candidates at high risk of remaining unplaced to provide early intervention." 
        actionLabel="Generate Risk Report"
        onAction={() => alert("Generating PDF risk report for Dean of Students...")}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Unplaced</h3>
            <div className="text-3xl font-black text-campusblue-900">342</div>
            <div className="text-[11px] text-campusblue-300 font-medium mt-1">Total cohort size: 850</div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-5 shadow-sm">
            <h3 className="text-red-700 text-xs font-bold uppercase tracking-wider mb-1">High Risk Candidates</h3>
            <div className="text-3xl font-black text-red-600">{students.filter(s => s.riskLevel === 'HIGH').length}</div>
            <div className="text-[11px] text-red-500 font-medium mt-1">Requires immediate action</div>
          </div>
          <div className="bg-campusblue-50 rounded-xl border border-campusblue-50 p-5 shadow-sm">
            <h3 className="text-campusblue-800 text-xs font-bold uppercase tracking-wider mb-1">Borderline / Medium Risk</h3>
            <div className="text-3xl font-black text-campusblue-700">{students.filter(s => s.riskLevel === 'MEDIUM').length}</div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1">Needs targeted upskilling</div>
          </div>
          <div className="bg-campusblue-50 rounded-xl border border-campusblue-50 p-5 shadow-sm">
            <h3 className="text-campusblue-800 text-xs font-bold uppercase tracking-wider mb-1">Intervention Success</h3>
            <div className="text-3xl font-black text-campusblue-700">68%</div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1">Placed after remedial action</div>
          </div>
        </div>

        {/* Main List */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="border-b border-campusblue-100 bg-campusblue-50 px-6 py-4 flex justify-between items-center">
            <h2 className="font-bold text-campusblue-900">AI-Flagged At-Risk Students</h2>
            <div className="flex gap-2">
              <select 
                className="text-sm border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select 
                className="text-sm border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="severity">Sort by: Risk Severity</option>
                <option value="score">Sort by: Readiness Score (Low to High)</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-campusblue-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Candidate Profile</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Readiness %</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider w-1/3">AI Diagnosis / Risk Factor</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Active Intervention</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Action Plan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredAndSortedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-campusblue-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${student.riskLevel === 'HIGH' ? 'bg-red-500' : 'bg-campusblue-300'}`}></div>
                        <div>
                          <div className="text-sm font-bold text-campusblue-900">{student.student}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-campusblue-500 bg-campusblue-50 px-1.5 py-0.5 rounded">{student.studentId}</span>
                            <span className="text-xs text-campusblue-500">{student.branch}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-black ${student.score < 30 ? 'text-red-600' : 'text-campusblue-700'}`}>
                          {student.score}%
                        </span>
                        <div className="w-16 bg-campusblue-100 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${student.score < 30 ? 'bg-red-500' : 'bg-campusblue-500'}`} 
                            style={{ width: `${student.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-campusblue-700 leading-relaxed font-medium">
                        {student.reason}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.intervention === 'None' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-campusblue-50 text-campusblue-700 uppercase tracking-wider">
                          No Action Taken
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-campusblue-50 text-campusblue-800 border border-campusblue-50 uppercase tracking-wider">
                          {student.intervention}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col gap-2 items-end">
                        <button 
                          onClick={() => setCounselingModal({ id: student.id, name: student.student })}
                          className="text-xs font-bold text-campusblue-800 bg-white border border-campusblue-200 hover:bg-campusblue-50 px-3 py-1.5 rounded shadow-sm transition"
                        >
                          Schedule Counseling
                        </button>
                        <button 
                          onClick={() => handleAction(student.id, "Remedial Training Course")}
                          className="text-xs font-bold text-campusblue-800 bg-campusblue-50 border border-campusblue-100 hover:bg-campusblue-50 px-3 py-1.5 rounded shadow-sm transition"
                        >
                          Assign Training
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Counseling Modal */}
      {counselingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Message Student
              </h2>
              <button onClick={() => setCounselingModal(null)} className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSendCounseling} className="p-6">
              <p className="text-sm text-campusblue-700 mb-5">
                Send a direct message to <strong>{counselingModal.name}</strong> to schedule a mandatory 1-on-1 counseling session regarding their placement readiness.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-campusblue-800 mb-1">Subject</label>
                  <input required defaultValue="Mandatory TPO Counseling Session Required" className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm font-semibold text-campusblue-900" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-campusblue-800 mb-1">Message Body</label>
                  <textarea 
                    required 
                    rows={5} 
                    className="w-full border-campusblue-200 rounded-lg shadow-sm focus:ring-blue-500 focus:border-campusblue-500 text-sm resize-none" 
                    defaultValue={`Hi ${counselingModal.name},\n\nPlease report to the Placement Office on [Date] at [Time] for a mandatory 1-on-1 counseling session to discuss your placement progress.\n\nRegards,\nPlacement Officer`}
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-campusblue-50 flex justify-end gap-3">
                <button type="button" onClick={() => setCounselingModal(null)} className="px-4 py-2 text-sm font-bold text-campusblue-700 hover:bg-campusblue-50 rounded-lg transition">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-campusblue-700 hover:bg-campusblue-800 rounded-lg shadow-sm transition">Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}





