"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { adminApi } from "@/services/adminApi";
import { LoadingState } from "@/components/feedback/LoadingState";

export default function CommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      setData(res);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
        <LoadingState message="Loading Command Center Data..." />
      </AppLayout>
    );
  }

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
            <div className="text-2xl font-black text-campusblue-900 mb-1">{data?.total_students?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-campusblue-300">Final Year Students</div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Job-Ready Students</h3>
              <svg className="w-4 h-4 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div className="text-2xl font-black text-campusblue-800 mb-1">{data?.job_ready_students?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-campusblue-500 font-medium">AI Readiness Pass (70%+)</div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Total Offers Secured</h3>
              <svg className="w-4 h-4 text-campusblue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="text-2xl font-black text-campusblue-700 mb-1">{data?.total_offers?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-campusblue-700 font-medium">{data?.total_students ? Math.round((data.total_offers / data.total_students) * 100) : 0}% Conversion Rate</div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-campusblue-500 text-xs font-semibold">Highest CTC Package</h3>
              <span className="text-campusblue-500 font-bold">$</span>
            </div>
            <div className="text-2xl font-black text-campusblue-900 mb-1">{data?.highest_ctc ? data.highest_ctc.toFixed(1) + " LPA" : "N/A"}</div>
            <div className="text-[11px] text-campusblue-300">Campus Record</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-campusblue-100 p-6 shadow-sm">
            <div className="flex justify-between items-end mb-6 border-b border-campusblue-50 pb-4">
              <div>
                <h3 className="text-sm font-bold text-campusblue-900 mb-1">Departmental Placement Conversion Heatmap</h3>
                <p className="text-2xs text-campusblue-400">Hiring velocity, student placement conversion rates, and branch average packages.</p>
              </div>
            </div>

            <div className="space-y-6">
              {data?.heatmap?.map((dept: any, index: number) => {
                const percent = dept.total > 0 ? Math.round((dept.placed / dept.total) * 100) : 0;
                return (
                  <div key={index}>
                    <div className="flex justify-between text-xs mb-1 font-semibold text-campusblue-900">
                      <span>{dept.name}</span>
                      <div className="flex items-center gap-4 text-3xs">
                        <span className="text-campusblue-500">Avg: {dept.avg_package?.toFixed(1)} LPA</span>
                        <span className="text-campusblue-700">{dept.placed}/{dept.total}</span>
                        <span className="font-bold w-6 text-right">{percent}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-campusblue-50 rounded-full h-2">
                      <div className="bg-campusblue-600 h-2 rounded-full" style={{ width: percent + "%" }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-campusblue-100 p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-campusblue-50 pb-4">
              <h3 className="text-sm font-bold text-campusblue-900">Active Drive Pipeline Ticker</h3>
              <span className="text-3xs font-bold text-campusblue-600 bg-campusblue-50 px-2 py-0.5 rounded-full">{data?.active_drives?.length || 0} Active</span>
            </div>
            
            <div className="flex-1 flex flex-col">
              {data?.active_drives && data.active_drives.length > 0 ? (
                <div className="space-y-4">
                  {data.active_drives.map((drive: any) => (
                    <div key={drive.id} className="p-3 border border-campusblue-100 rounded-lg hover:bg-campusblue-50 transition">
                      <div className="font-bold text-xs text-campusblue-900 mb-1">{drive.name}</div>
                      <div className="text-2xs text-campusblue-600 flex justify-between">
                        <span>{drive.company_name} &bull; {drive.role}</span>
                        <span className="font-mono text-campusblue-400">{drive.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-campusblue-50 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-campusblue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h4 className="text-xs font-bold text-campusblue-900 mb-1">No active drives</h4>
                  <p className="text-2xs text-campusblue-400 max-w-[200px] mx-auto mb-4">There are currently no placement drives ongoing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

