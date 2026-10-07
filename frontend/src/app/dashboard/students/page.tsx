"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { adminApi, OfficerStudentItem } from "@/services/adminApi";
import { parseApiError } from "@/services/apiClient";
import { ResumeModal } from "@/features/students/ResumeModal";

export default function OfficerStudentsPage() {
  const [students, setStudents] = useState<OfficerStudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [page, setPage] = useState(1);
    const limit = 100;
    const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [minCgpa, setMinCgpa] = useState<string>("");

  // Detail Modal
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getStudents({
        query: searchQuery.trim() || undefined,
        branch: branchFilter !== "ALL" ? branchFilter : undefined,
        min_cgpa: minCgpa ? parseFloat(minCgpa) : undefined,
        limit: limit, offset: (page - 1) * limit,
      });
      setStudents(res.students);
      setTotal(res.total);
    } catch (err: any) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, branchFilter, minCgpa, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenDetail = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setLoadingDetail(true);
    try {
      const detail = await adminApi.getStudentDetails(studentId);
      setStudentDetail(detail);
    } catch (err: any) {
      alert(parseApiError(err).message);
      setSelectedStudentId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const branches = Array.from(
    new Set(students.map((s) => s.branch).filter(Boolean) as string[])
  ).sort();

  return (
    <AppLayout allowedRoles={["SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="Student Placement Directory"
        subtitle="Search candidates, monitor academic credentials, and review 7-dimension employability readiness scores."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      {/* Filter Bar */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search candidate name, roll number, email..."
              value={searchQuery}
              onChange={(e) => { setPage(1); setSearchQuery(e.target.value); }}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-campusblue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={branchFilter}
              onChange={(e) => { setPage(1); setBranchFilter(e.target.value); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-campusblue-100 shadow-sm bg-white/90 font-serif focus:outline-none focus:ring-2 focus:ring-campusblue-500"
            >
              <option value="ALL">All Departments</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={minCgpa}
              onChange={(e) => { setPage(1); setMinCgpa(e.target.value); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-campusblue-100 shadow-sm bg-white/90 font-serif focus:outline-none focus:ring-2 focus:ring-campusblue-500"
            >
              <option value="">Any CGPA</option>
              <option value="6.0">CGPA ≥ 6.0</option>
              <option value="7.0">CGPA ≥ 7.0</option>
              <option value="8.0">CGPA ≥ 8.0</option>
              <option value="9.0">CGPA ≥ 9.0</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Student Directory Table */}
      {loading ? (
        <LoadingState message="Loading student candidate directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStudents} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No candidates match your search"
          description="Try relaxing your CGPA threshold or selecting all departments."
        />
      ) : (
        <Card padding="none">
          <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50/30">
            <span className="text-xs font-bold text-campusblue-800">
              Total Candidates: <span className="text-campusblue-700">{total}</span>
            </span>
            <span className="text-2xs text-campusblue-300 font-medium">
              Click &quot;Profile&quot; to inspect credentials, project portfolio, and readiness breakdown
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white 100 border-b border-campusblue-100 font-serif text-campusblue-700 font-semibold uppercase text-2xs tracking-wider">
                  <th className="p-3.5">Candidate</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Academic Standing</th>
                  <th className="p-3.5">Readiness Score</th>
                  <th className="p-3.5">Resume</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-campusblue-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-campusblue-900">
                        {s.first_name} {s.last_name}
                      </div>
                      <div className="text-2xs text-campusblue-500 font-mono">
                        {s.student_identifier} • Class of {s.graduation_year}
                      </div>
                      {s.email && <div className="text-2xs text-campusblue-300">{s.email}</div>}
                    </td>
                    <td className="p-3.5 font-medium text-campusblue-900">
                      {s.branch}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-campusblue-700">
                        CGPA: {s.cgpa} / 10.0
                      </div>
                      <div className="text-2xs text-campusblue-500 mt-0.5">
                        {s.backlogs_current > 0 ? (
                          <span className="text-campusblue-700 font-semibold">
                            {s.backlogs_current} active backlogs
                          </span>
                        ) : (
                          <span className="text-campusblue-700">0 backlogs</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {s.readiness_score !== null && s.readiness_score !== undefined ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                            s.readiness_score >= 75
                              ? "bg-campusblue-50 text-campusblue-900 font-serif"
                              : s.readiness_score >= 50
                              ? "bg-campusblue-50 text-campusblue-900 font-serif"
                              : "bg-campusblue-50 text-orange-800 font-serif"
                          }`}
                        >
                          {Math.round(s.readiness_score)}%
                        </span>
                      ) : (
                        <span className="text-2xs text-campusblue-300 font-medium">
                          Not Evaluated
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {s.resume_url ? (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${s.resume_url.replace("/api/v1", "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-2xs font-bold text-campusblue-700 hover:underline"
                        >
                          PDF &nearr;
                        </a>
                      ) : (
                        <span className="text-2xs text-campusblue-200">None</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-2xs h-7 px-2"
                        onClick={() => handleOpenDetail(s.id)}
                      >
                        Inspect Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-campusblue-100 flex items-center justify-between bg-white/90">
            <span className="text-xs text-campusblue-500">
              Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} entries
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p - 1)} 
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)} 
                disabled={page * limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Student Detail Modal */}
      <ResumeModal 
        isOpen={!!selectedStudentId} 
        onClose={() => {
          setSelectedStudentId(null);
          setStudentDetail(null);
        }} 
        studentId={selectedStudentId?.toString() || ""} 
        studentName={students.find((s) => s.id === selectedStudentId)?.first_name + ' ' + students.find((s) => s.id === selectedStudentId)?.last_name}
        readinessScore={students.find((s) => s.id === selectedStudentId)?.readiness_score}
      />
      </AppLayout>
  );
}






