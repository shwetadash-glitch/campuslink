"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";

const MOCK_OFFERS = [
  { id: 101, student: "Alice Johnson", studentId: "STU001", branch: "Computer Science", company: "TechCorp", role: "Software Engineer", ctc: "18.5 LPA", date: "Oct 22, 2026", status: "PENDING" },
  { id: 102, student: "Bob Smith", studentId: "STU002", branch: "Information Technology", company: "Innovate Solutions", role: "Frontend Developer", ctc: "12.0 LPA", date: "Oct 21, 2026", status: "PENDING" },
  { id: 107, student: "Sarah Williams", studentId: "STU003", branch: "ECE", company: "HardwareSync", role: "Embedded Systems Engineer", ctc: "11.5 LPA", date: "Oct 23, 2026", status: "PENDING" },
  { id: 108, student: "David Chen", studentId: "STU004", branch: "Computer Science", company: "CloudNet", role: "Cloud Architect", ctc: "22.0 LPA", date: "Oct 23, 2026", status: "PENDING" },
  { id: 109, student: "Priya Patel", studentId: "STU005", branch: "Information Technology", company: "FinTech Global", role: "Quantitative Analyst", ctc: "28.5 LPA", date: "Oct 24, 2026", status: "PENDING" },
  { id: 103, student: "First9 Last9", studentId: "ROLL2026009", branch: "CSE", company: "Global Systems", role: "Data Analyst", ctc: "14.2 LPA", date: "Oct 20, 2026", status: "VERIFIED" },
  { id: 104, student: "First8 Last8", studentId: "ROLL2026008", branch: "IT", company: "TechCorp", role: "Systems Engineer", ctc: "10.0 LPA", date: "Oct 20, 2026", status: "VERIFIED" },
  { id: 105, student: "First7 Last7", studentId: "ROLL2026007", branch: "MECH", company: "AutoMech Industries", role: "Design Engineer", ctc: "8.5 LPA", date: "Oct 18, 2026", status: "VERIFIED" },
  { id: 110, student: "First6 Last6", studentId: "ROLL2026006", branch: "ECE", company: "Nexus Networks", role: "Network Engineer", ctc: "9.0 LPA", date: "Oct 15, 2026", status: "VERIFIED" },
  { id: 111, student: "First5 Last5", studentId: "ROLL2026005", branch: "CSE", company: "AI Innovations", role: "Machine Learning Engineer", ctc: "32.0 LPA", date: "Oct 14, 2026", status: "VERIFIED" },
  { id: 112, student: "First4 Last4", studentId: "ROLL2026004", branch: "CSE", company: "TechCorp", role: "Software Engineer", ctc: "18.5 LPA", date: "Oct 12, 2026", status: "VERIFIED" },
  { id: 106, student: "Test Student", studentId: "STU0035", branch: "Computer Science", company: "StartupX", role: "Full Stack Intern", ctc: "6.0 LPA", date: "Oct 24, 2026", status: "FLAGGED", flagReason: "Missing official company letterhead." },
  { id: 113, student: "John Doe", studentId: "STU0099", branch: "MECH", company: "BuildIt Construction", role: "Site Manager", ctc: "7.0 LPA", date: "Oct 25, 2026", status: "FLAGGED", flagReason: "CTC breakdown does not match the total offered amount." },
];

export default function OfferDeskPage() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [offers, setOffers] = useState(MOCK_OFFERS);
  const [viewingOffer, setViewingOffer] = useState<any | null>(null);
  
  const filteredOffers = offers.filter(o => o.status === activeTab);
  
  const handleVerify = (id: number) => {
    setOffers(offers.map(o => o.id === id ? { ...o, status: "VERIFIED" } : o));
    alert("Offer officially verified and added to placement telemetry!");
  };

  const handleFlag = (id: number) => {
    const reason = prompt("Enter reason for flagging this offer:");
    if (reason) {
      setOffers(offers.map(o => o.id === id ? { ...o, status: "FLAGGED", flagReason: reason } : o));
    }
  };

  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader 
        title="Offer Verification Desk" 
        description="Centralized audit trail for reviewing, validating, and recording corporate placement letters." 
        actionLabel="Export Offer Data"
        onAction={() => alert("Exporting data...")}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Review</h3>
            <div className="text-3xl font-black text-campusblue-700">{offers.filter(o => o.status === 'PENDING').length}</div>
            <div className="text-[11px] text-campusblue-300 font-medium mt-1">Requires TPO Action</div>
          </div>
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Verified</h3>
            <div className="text-3xl font-black text-campusblue-700">{offers.filter(o => o.status === 'VERIFIED').length}</div>
            <div className="text-[11px] text-campusblue-300 font-medium mt-1">Official Placements</div>
          </div>
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Avg Verified CTC</h3>
            <div className="text-3xl font-black text-campusblue-900">12.4 <span className="text-lg font-bold text-campusblue-300">LPA</span></div>
            <div className="text-[11px] text-campusblue-300 font-medium mt-1">Across all branches</div>
          </div>
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <h3 className="text-campusblue-500 text-xs font-bold uppercase tracking-wider mb-1">Highest CTC</h3>
            <div className="text-3xl font-black text-campusblue-700">44.5 <span className="text-lg font-bold text-campusblue-200">LPA</span></div>
            <div className="text-[11px] text-campusblue-500 font-medium mt-1">TechCorp SDE Role</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm overflow-hidden">
          <div className="border-b border-campusblue-100 bg-campusblue-50 px-6 py-4 flex gap-6">
            <button 
              onClick={() => setActiveTab("PENDING")}
              className={`text-sm font-bold pb-1 transition-colors relative ${activeTab === "PENDING" ? "text-campusblue-700 border-b-2 border-campusblue-700" : "text-campusblue-500 hover:text-campusblue-800"}`}
            >
              Pending Review
              <span className="ml-2 bg-campusblue-50 text-campusblue-800 py-0.5 px-2 rounded-full text-[10px]">{offers.filter(o => o.status === 'PENDING').length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("VERIFIED")}
              className={`text-sm font-bold pb-1 transition-colors ${activeTab === "VERIFIED" ? "text-campusblue-700 border-b-2 border-campusblue-700" : "text-campusblue-500 hover:text-campusblue-800"}`}
            >
              Verified Offers
            </button>
            <button 
              onClick={() => setActiveTab("FLAGGED")}
              className={`text-sm font-bold pb-1 transition-colors ${activeTab === "FLAGGED" ? "text-red-600 border-b-2 border-red-600" : "text-campusblue-500 hover:text-campusblue-800"}`}
            >
              Flagged Issues
              {offers.filter(o => o.status === 'FLAGGED').length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-[10px]">{offers.filter(o => o.status === 'FLAGGED').length}</span>
              )}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            {filteredOffers.length === 0 ? (
              <div className="p-12 text-center text-campusblue-500">
                No offers found in this category.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-campusblue-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Candidate Details</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Corporate Offer</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Package (CTC)</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Submission Date</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-campusblue-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredOffers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-campusblue-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-campusblue-900">{offer.student}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-campusblue-500 bg-campusblue-50 px-1.5 py-0.5 rounded">{offer.studentId}</span>
                          <span className="text-xs text-campusblue-500">{offer.branch}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-campusblue-800">{offer.company}</div>
                        <div className="text-xs text-campusblue-500 mt-1">{offer.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-black bg-campusblue-50 text-campusblue-800 border border-campusblue-50">
                          {offer.ctc}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-campusblue-500 font-medium">
                        {offer.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setViewingOffer(offer)}
                            className="text-campusblue-700 bg-campusblue-50 hover:bg-campusblue-100 px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View Document
                          </button>
                          
                          {activeTab === 'PENDING' && (
                            <>
                              <button onClick={() => handleVerify(offer.id)} className="text-campusblue-800 bg-campusblue-50 border border-campusblue-100 hover:bg-campusblue-50 px-3 py-1.5 rounded-md font-semibold transition">
                                Verify
                              </button>
                              <button onClick={() => handleFlag(offer.id)} className="text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-md font-semibold transition">
                                Flag
                              </button>
                            </>
                          )}
                          
                          {activeTab === 'FLAGGED' && (
                            <button onClick={() => alert(`Flag Reason: ${offer.flagReason}`)} className="text-campusblue-800 bg-campusblue-50 border border-campusblue-100 hover:bg-campusblue-50 px-3 py-1.5 rounded-md font-semibold transition">
                              View Reason
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Document Viewer Modal */}
      {viewingOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-campusblue-100">
            <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50 shrink-0">
              <h2 className="font-bold text-campusblue-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Document Review: {viewingOffer.student} ({viewingOffer.company})
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button className="text-xs font-bold bg-white border border-campusblue-200 px-3 py-1.5 rounded shadow-sm hover:bg-campusblue-50 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download PDF
                  </button>
                  <button className="text-xs font-bold bg-white border border-campusblue-200 px-3 py-1.5 rounded shadow-sm hover:bg-campusblue-50 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                  </button>
                </div>
                <div className="w-px h-6 bg-campusblue-200"></div>
                <button onClick={() => setViewingOffer(null)} className="w-8 h-8 flex items-center justify-center bg-campusblue-100 hover:bg-campusblue-200 rounded-full text-campusblue-700 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            {viewingOffer.flagReason && (
              <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Document Flagged for Review</h3>
                  <p className="text-xs text-red-600 mt-0.5">{viewingOffer.flagReason}</p>
                </div>
              </div>
            )}
            
            <div className="flex-1 bg-campusblue-200 p-8 flex justify-center items-start overflow-y-auto">
              {/* HTML Document Mockup */}
              <div className="bg-white max-w-3xl w-full p-12 shadow-md font-serif text-campusblue-900 leading-relaxed border border-campusblue-100">
                <div className="flex justify-between items-start border-b-2 border-campusblue-900 pb-6 mb-8">
                  <div>
                    <h1 className="text-3xl font-black uppercase text-campusblue-900 tracking-wider m-0">{viewingOffer.company}</h1>
                    <p className="text-xs text-campusblue-500 mt-1 uppercase font-sans font-bold tracking-widest">Confidential / Human Resources</p>
                  </div>
                  <div className="text-right text-sm">
                    <p><strong>Date:</strong> {viewingOffer.date}</p>
                    <p><strong>Ref:</strong> HR/OFF/{new Date().getFullYear()}/{viewingOffer.id}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="mb-2"><strong>To:</strong> {viewingOffer.student}</p>
                  <p className="mb-2"><strong>Candidate ID:</strong> {viewingOffer.studentId}</p>
                  <p><strong>Branch:</strong> {viewingOffer.branch}</p>
                </div>

                <h2 className="text-lg font-bold uppercase text-center mb-6 underline">Letter of Appointment</h2>

                <p className="mb-4">Dear {viewingOffer.student},</p>
                
                <p className="mb-4 text-justify">
                  Following your participation in our campus recruitment drive and subsequent interviews, we are delighted to offer you the position of <strong>{viewingOffer.role}</strong> at <strong>{viewingOffer.company}</strong>.
                </p>

                <p className="mb-4 text-justify">
                  Your total Cost to Company (CTC) will be <strong>{viewingOffer.ctc}</strong> per annum. A detailed breakdown of your compensation, benefits, and equity grants (if applicable) is provided in Annexure A of this document.
                </p>

                <p className="mb-6 text-justify">
                  Your scheduled date of joining will be communicated to you by our onboarding team closer to your graduation. This offer is contingent upon the successful completion of your degree with no active backlogs and standard background verification checks.
                </p>

                <p className="mb-8">
                  Please sign and return a copy of this letter to acknowledge your acceptance of this offer.
                </p>

                <div className="flex justify-between mt-16 pt-8 border-t border-campusblue-100">
                  <div className="text-center">
                    <div className="w-40 border-b border-campusblue-900 mb-2 pb-2">
                      <span className="font-sans italic text-campusblue-900 block text-xl">Eleanor Rigby</span>
                    </div>
                    <p className="text-sm font-bold">Eleanor Rigby</p>
                    <p className="text-xs text-campusblue-500">VP, Talent Acquisition</p>
                    <p className="text-xs text-campusblue-500">{viewingOffer.company}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-campusblue-900 mb-2 h-10"></div>
                    <p className="text-sm font-bold">Candidate Signature</p>
                    <p className="text-xs text-campusblue-500">Date: ____________</p>
                  </div>
                </div>

                {/* Page Break / Annexure A */}
                <div className="mt-20 pt-12 border-t-[3px] border-double border-campusblue-200">
                  <h3 className="text-lg font-bold text-center uppercase tracking-widest mb-2">Annexure A</h3>
                  <h4 className="text-md font-bold text-center mb-8">Compensation & Benefits Breakdown</h4>
                  
                  <table className="w-full text-sm border-collapse mb-6">
                    <thead>
                      <tr className="bg-campusblue-50">
                        <th className="border border-campusblue-200 p-3 text-left w-2/3">Salary Component</th>
                        <th className="border border-campusblue-200 p-3 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-campusblue-200 p-3">Basic Salary</td>
                        <td className="border border-campusblue-200 p-3 text-right">40% of Basic</td>
                      </tr>
                      <tr>
                        <td className="border border-campusblue-200 p-3">House Rent Allowance (HRA)</td>
                        <td className="border border-campusblue-200 p-3 text-right">20% of Basic</td>
                      </tr>
                      <tr>
                        <td className="border border-campusblue-200 p-3">Special Allowance</td>
                        <td className="border border-campusblue-200 p-3 text-right">Variable</td>
                      </tr>
                      <tr>
                        <td className="border border-campusblue-200 p-3">Provident Fund (Employer Contribution)</td>
                        <td className="border border-campusblue-200 p-3 text-right">12% of Basic</td>
                      </tr>
                      <tr className="font-bold bg-campusblue-50">
                        <td className="border border-campusblue-200 p-3">Total Fixed Compensation</td>
                        <td className="border border-campusblue-200 p-3 text-right">Variable</td>
                      </tr>
                      <tr>
                        <td className="border border-campusblue-200 p-3">Annual Performance Bonus (Target)</td>
                        <td className="border border-campusblue-200 p-3 text-right">10% of CTC</td>
                      </tr>
                      <tr className="font-black text-base bg-campusblue-100">
                        <td className="border border-campusblue-200 p-3">Total Cost to Company (CTC)</td>
                        <td className="border border-campusblue-200 p-3 text-right">{viewingOffer.ctc}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-campusblue-500 text-justify">
                    * The above breakdown is indicative. Exact component values will be detailed in the formal contract generated on your joining date based on the final {viewingOffer.ctc} CTC figure. Variable pay is subject to company and individual performance metrics.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}





