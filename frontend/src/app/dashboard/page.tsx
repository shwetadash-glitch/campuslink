"use client";

import React from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <PageHeader
        title="Command Center"
        subtitle="Access student profiles, employability intelligence, and corporate hiring workflows."
      />

      <div className="space-y-6">
        {/* Welcome card */}
        <Card className="bg-gradient-to-r from-campusblue-50 to-campusblue-50 text-campusblue-900 border border-campusblue-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-campusblue-700">
                Connected Session
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1">
                Welcome back, {user?.email}
              </h2>
              <p className="text-xs text-campusblue-900 mt-1 max-w-xl">
                CAMPUSLINK placement platform provides deterministic student readiness analytics, recruiter job management, and verified candidate tracking.
              </p>
            </div>
            <div className="shrink-0 bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-campusblue-100/50 shadow-sm text-right">
              <span className="text-2xs text-campusblue-700 uppercase font-semibold block">Active Role</span>
              <div className="mt-1">
                <StatusBadge status={user?.role || "STUDENT"} size="md" variant="purple" />
              </div>
            </div>
          </div>
        </Card>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* STUDENT CARDS */}
          {user?.role === "STUDENT" && (
            <>
              <Link href="/dashboard/profile" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-200 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">🎓</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">My Profile</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Comprehensive profile management for academic records, skills, capstone projects, certifications, and live profile completeness.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Profile</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/jobs" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Jobs & Placement Drives</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Browse published placement openings, check your real-time deterministic eligibility, and register for campus interview drives.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Browse Opportunities</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/messages" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-600 group-hover:bg-campusblue-600 group-hover:text-white transition">
                    <span className="text-2xl">ðŸ’¬</span>
                  </div>
                  <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-600 transition mb-1">TPO Connect</h3>
                  <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Direct messaging channel to reach out to Placement Officers for guidance, interview tips, or offer queries.</p>
                  <span className="text-xs font-semibold text-campusblue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Message TPO</span><span>&rarr;</span></span>
                </Link>
                <Link href="/dashboard/ai-interview" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-600 group-hover:bg-campusblue-600 group-hover:text-white transition">
                    <span className="text-2xl">ðŸ¤–</span>
                  </div>
                  <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-600 transition mb-1">AI Mock Interview</h3>
                  <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Practice technical questions with our AI Helper. Get instant feedback and study references.</p>
                  <span className="text-xs font-semibold text-campusblue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Start Practice</span><span>&rarr;</span></span>
                </Link>
                <Link href="/dashboard/readiness" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-300 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Readiness & Skill Gaps</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Deterministic 7-dimension employability evaluation, dynamic weight normalization, identified strengths, and job-specific gap analysis.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Explore Readiness</span><span>&rarr;</span></span>
              </Link>
            </>
          )}

          {/* RECRUITER CARDS */}
          {user?.role === "RECRUITER" && (
            <Link href="/dashboard/recruiter" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-200 hover:shadow-md hover:-translate-y-1 transition duration-200 md:col-span-2">
              <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Recruiter Portal & Operations</h3>
              <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Corporate profile management, job requisitions, skill requirements with weighted criteria, placement drives, candidate management, and bulk eligibility evaluation.</p>
              <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Recruiter Portal</span><span>&rarr;</span></span>
            </Link>
          )}

          {/* PLACEMENT OFFICER CARDS */}
          {user?.role === "PLACEMENT_OFFICER" && (
            <>
              <Link href="/dashboard/tpo/command-center" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-200 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Placement Command Center</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Centralized dashboard for tracking placement metrics, active drives, and overall placement success rates.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Dashboard</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/drive-manager" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Drive Lifecycle Manager</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">End-to-end management of placement drives from initial scheduling to final candidate selection and feedback.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Drives</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/shortlisting" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-300 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">AI Shortlisting Console</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Identify optimal candidates through predictive algorithms, dynamic threshold modeling, and automated readiness evaluations.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Run Shortlisting</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/scheduler" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Conflict-Free Scheduler</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Manage placement drives, detect time collisions dynamically, and coordinate optimal interview slots across recruiters.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Schedule</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/tpo/offer-desk" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-600 group-hover:bg-campusblue-600 group-hover:text-white transition">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-600 transition mb-1">Offer Verification Desk</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Digitally authenticate corporate offer letters, track compliance, and manage final placements via secure document viewer.</p>
                <span className="text-xs font-semibold text-campusblue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Verify Offers</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/messages" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-600 group-hover:bg-campusblue-600 group-hover:text-white transition">
                    <span className="text-2xl">ðŸ’¬</span>
                  </div>
                  <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-600 transition mb-1">Student Queries</h3>
                  <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Direct messaging channel to respond to student questions, provide guidance, and coordinate placement support.</p>
                  <span className="text-xs font-semibold text-campusblue-600 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>View Messages</span><span>&rarr;</span></span>
                </Link>
                <Link href="/dashboard/tpo/at-risk" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-300 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Cohort & At-Risk Center</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Track student retention, identify at-risk candidates via predictive metrics, and schedule targeted intervention counseling.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Monitor Risk</span><span>&rarr;</span></span>
              </Link>
            </>
          )}

          {/* SUPER ADMIN CARDS */}
          {user?.role === "SUPER_ADMIN" && (
            <>
              <Link href="/dashboard/students" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-200 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition"><span className="text-2xl">🎓</span></div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Student Directory</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Search students, filter by CGPA/department, inspect profiles, and review 7-dimension employability readiness scores.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Browse Students</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/companies" className="group block p-6 bg-white border border-campusblue-100 rounded-xl hover:border-campusblue-500 hover:shadow-lg transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition"><span className="text-2xl">🏢</span></div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Corporate Partners</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Manage registered employers, company profiles, designated talent acquisition contacts, and active requisitions.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>View Partners</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/recruiter" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-200 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition"><span className="text-2xl">💼</span></div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Placement Operations</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Supervise campus hiring events, schedule placement drives, inspect job requirements, and run eligibility sandboxes.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Open Operations</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/admin/skills" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-300 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition"><span className="text-2xl">🗂️</span></div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">Master Skills Catalog</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Standardized canonical skills taxonomy ensuring clean match data across students and job requisitions.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Catalog</span><span>&rarr;</span></span>
              </Link>
              <Link href="/dashboard/admin/users" className="group block p-6 bg-white border border-campusblue-100 rounded-lg hover:border-campusblue-300 hover:shadow-md hover:-translate-y-1 transition duration-200">
                <div className="w-12 h-12 mb-4 rounded-xl bg-campusblue-50 flex items-center justify-center text-campusblue-700 group-hover:bg-campusblue-700 group-hover:text-white transition"><span className="text-2xl">🛡️</span></div>
                <h3 className="text-base font-bold text-campusblue-900 group-hover:text-campusblue-700 transition mb-1">User Accounts & RBAC</h3>
                <p className="text-xs text-campusblue-500 leading-relaxed mb-4">Inspect registered user accounts, assign system roles, and activate or deactivate platform access.</p>
                <span className="text-xs font-semibold text-campusblue-700 group-hover:translate-x-1 inline-flex items-center gap-1 transition-transform"><span>Manage Users</span><span>&rarr;</span></span>
              </Link>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}






