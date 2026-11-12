"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { AdminAssessmentsView } from "@/features/assessments/AdminAssessmentsView";
import { TpoAssessmentsView } from "@/features/assessments/TpoAssessmentsView";
import { StudentAssessmentsView } from "@/features/assessments/StudentAssessmentsView";

export default function AssessmentsPage() {
  const { user, loading } = useAuth();
  const [adminSimulatedRole, setAdminSimulatedRole] = useState<string | null>(null);

  if (loading) {
    return (
      <AppLayout allowedRoles={["STUDENT", "PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-campusblue-500 font-serif animate-pulse">
          Authenticating assessment credentials...
        </div>
      </AppLayout>
    );
  }

  const effectiveRole = adminSimulatedRole || user?.role || "STUDENT";

  return (
    <AppLayout allowedRoles={["STUDENT", "PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workflow Perspective Switcher for Super Admin */}
        {user?.role === "SUPER_ADMIN" && (
          <div className="bg-campusblue-900 text-white rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold">Workflow Stage Inspector (Super Admin):</span>
              <span className="text-campusblue-200 text-2xs">
                Switch perspective to audit the 3-stage lifecycle in real-time:
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAdminSimulatedRole(null)}
                className={`px-3 py-1 rounded text-2xs font-bold transition cursor-pointer ${
                  effectiveRole === "SUPER_ADMIN"
                    ? "bg-white text-campusblue-900 shadow-xs"
                    : "bg-campusblue-800 text-campusblue-200 hover:text-white"
                }`}
              >
                1. Admin Creator
              </button>

              <button
                type="button"
                onClick={() => setAdminSimulatedRole("PLACEMENT_OFFICER")}
                className={`px-3 py-1 rounded text-2xs font-bold transition cursor-pointer ${
                  effectiveRole === "PLACEMENT_OFFICER"
                    ? "bg-amber-400 text-amber-950 shadow-xs font-black"
                    : "bg-campusblue-800 text-campusblue-200 hover:text-white"
                }`}
              >
                2. TPO Verification Desk
              </button>

              <button
                type="button"
                onClick={() => setAdminSimulatedRole("STUDENT")}
                className={`px-3 py-1 rounded text-2xs font-bold transition cursor-pointer ${
                  effectiveRole === "STUDENT"
                    ? "bg-emerald-400 text-emerald-950 shadow-xs font-black"
                    : "bg-campusblue-800 text-campusblue-200 hover:text-white"
                }`}
              >
                3. Student Portal
              </button>
            </div>
          </div>
        )}

        {/* Stage 1: Super Admin Creator View */}
        {effectiveRole === "SUPER_ADMIN" && <AdminAssessmentsView />}

        {/* Stage 2: TPO Verification Desk View */}
        {effectiveRole === "PLACEMENT_OFFICER" && <TpoAssessmentsView />}

        {/* Stage 3: Student Verified-Only Portal View */}
        {effectiveRole === "STUDENT" && <StudentAssessmentsView />}
      </div>
    </AppLayout>
  );
}
