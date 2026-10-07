"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CommandCenterPage() {
  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        


        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Registered Cohort</h3>
              <svg className="w-4 h-4 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mb-1">1,420</div>
            <div className="text-[11px] text-campusblue-300">Final Year Students (demo)</div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Job-Ready Students</h3>
              <svg className="w-4 h-4 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div className="text-2xl font-black text-campusblue-800 mb-1">1,180</div>
            <div className="text-[11px] text-campusblue-500 font-medium">83% AI Readiness Pass (demo)</div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Total Offers Secured</h3>
              <svg className="w-4 h-4 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="text-2xl font-black text-campusblue-700 mb-1">980</div>
            <div className="text-[11px] text-campusblue-700 font-medium">69% Conversion Rate</div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Highest CTC Package</h3>
              <span className="text-campusblue-500 font-bold">$</span>
            </div>
            <div className="text-2xl font-black text-campusblue-700 mb-1">44.5 LPA</div>
            <div className="text-[11px] text-campusblue-300">Median: 14.8 LPA</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Heatmap */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-campusblue-100 shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-base font-bold text-campusblue-900 mb-1">Departmental Placement Conversion Heatmap</h2>
                <p className="text-xs text-campusblue-500">Hiring velocity, student placement conversion rates, and branch average packages.</p>
              </div>
              <div className="bg-campusblue-50 border border-campusblue-50 px-3 py-1.5 rounded text-xs font-medium text-campusblue-800 text-right">
                <div>Campus Average: 14.8 LPA</div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Row 1 */}
              <div>
                <div className="flex justify-between items-end mb-2 text-sm">
                  <span className="font-bold text-campusblue-900">Computer Science & Engineering</span>
                  <div className="flex gap-4 font-semibold text-xs text-campusblue-700">
                    <span>Avg: 19.4 LPA</span>
                    <span>320/340</span>
                    <span className="text-campusblue-700 font-bold">94%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-campusblue-50 rounded-full overflow-hidden">
                  <div className="h-full bg-campusblue-500 rounded-full" style={{ width: "94%" }}></div>
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <div className="flex justify-between items-end mb-2 text-sm">
                  <span className="font-bold text-campusblue-900">Information Technology</span>
                  <div className="flex gap-4 font-semibold text-xs text-campusblue-700">
                    <span>Avg: 16.8 LPA</span>
                    <span>210/230</span>
                    <span className="text-campusblue-700 font-bold">91%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-campusblue-50 rounded-full overflow-hidden">
                  <div className="h-full bg-campusblue-500 rounded-full" style={{ width: "91%" }}></div>
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <div className="flex justify-between items-end mb-2 text-sm">
                  <span className="font-bold text-campusblue-900">Electronics & Communication</span>
                  <div className="flex gap-4 font-semibold text-xs text-campusblue-700">
                    <span>Avg: 13.2 LPA</span>
                    <span>185/240</span>
                    <span className="text-campusblue-700 font-bold">77%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-campusblue-50 rounded-full overflow-hidden">
                  <div className="h-full bg-campusblue-700 rounded-full" style={{ width: "77%" }}></div>
                </div>
              </div>

              {/* Row 4 */}
              <div>
                <div className="flex justify-between items-end mb-2 text-sm">
                  <span className="font-bold text-campusblue-900">Mechanical Engineering</span>
                  <div className="flex gap-4 font-semibold text-xs text-campusblue-700">
                    <span>Avg: 9.8 LPA</span>
                    <span>140/210</span>
                    <span className="text-campusblue-700 font-bold">66%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-campusblue-50 rounded-full overflow-hidden">
                  <div className="h-full bg-campusblue-500 rounded-full" style={{ width: "66%" }}></div>
                </div>
              </div>

              {/* Row 5 */}
              <div>
                <div className="flex justify-between items-end mb-2 text-sm">
                  <span className="font-bold text-campusblue-900">Civil Engineering</span>
                  <div className="flex gap-4 font-semibold text-xs text-campusblue-700">
                    <span>Avg: 8.4 LPA</span>
                    <span>125/200</span>
                    <span className="text-campusblue-700 font-bold">62%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-campusblue-50 rounded-full overflow-hidden">
                  <div className="h-full bg-campusblue-500 rounded-full" style={{ width: "62%" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Drive Pipeline */}
          <div className="bg-white rounded-xl border border-campusblue-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 border-b border-campusblue-50 pb-4">
              <h2 className="text-sm font-bold text-campusblue-900">Active Drive Pipeline Ticker</h2>
              <span className="text-xs font-bold text-campusblue-700">0 Active</span>
            </div>
            
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-campusblue-50 rounded-full flex items-center justify-center mb-4 border border-campusblue-50">
                <svg className="w-6 h-6 text-campusblue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-sm font-semibold text-campusblue-800">No active drives</p>
              <p className="text-xs text-campusblue-300 mt-1 max-w-[200px]">There are currently no placement drives ongoing.</p>
              <button className="mt-6 text-xs font-bold text-campusblue-700 bg-campusblue-50 hover:bg-campusblue-50 px-4 py-2 rounded-lg transition">
                Create New Drive
              </button>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}





