"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { adminApi, AdminUserItem } from "@/services/adminApi";
import { useAuth } from "@/context/AuthContext";
import { parseApiError } from "@/services/apiClient";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDownloadResume = async (url: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + url;
      const token = localStorage.getItem('token');
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Could not download resume');
    }
  };

  // Filters
  const [page, setPage] = useState(1);
    const limit = 100;
    const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // View User Modal
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Status toggle loading state
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getUsers({
        query: searchQuery.trim() || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
        limit: limit, offset: (page - 1) * limit,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (userItem: AdminUserItem) => {
    setTogglingId(userItem.id);
    try {
      const newStatus = !userItem.is_active;
      await adminApi.updateUserStatus(userItem.id, newStatus);
      setToastMessage(`Account for ${userItem.email} has been ${newStatus ? "activated" : "deactivated"}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userItem.id ? { ...u, is_active: newStatus } : u))
      );
    } catch (err: any) {
      setToastMessage(parseApiError(err).message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewDetails = async (userId: number) => {
    setViewLoading(true);
    try {
      const details = await adminApi.getUser(userId);
      setViewingUser(details);
    } catch (err: any) {
      setToastMessage(parseApiError(err).message);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <AppLayout allowedRoles={["SUPER_ADMIN"]}>
      <PageHeader
        title="User Accounts & Access Control"
        subtitle="Authorize system access, inspect role distribution, and manage account activation."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* User Details View Modal */}
      {viewingUser && (
        <Modal
          isOpen={true}
          onClose={() => setViewingUser(null)}
          title="Account Details"
          subtitle={`UID #${viewingUser.id}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-campusblue-50 p-4 rounded-lg border border-campusblue-100">
              <div>
                <span className="block text-xs font-semibold text-campusblue-500 mb-1">Email Address</span>
                <span className="font-medium text-campusblue-900">{viewingUser.email}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-campusblue-500 mb-1">System Role</span>
                <StatusBadge status={viewingUser.role} size="sm" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-campusblue-500 mb-1">Account Status</span>
                {viewingUser.is_active ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-campusblue-50 text-campusblue-900">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-campusblue-50 text-campusblue-900">
                    Deactivated
                  </span>
                )}
              </div>
              <div>
                <span className="block text-xs font-semibold text-campusblue-500 mb-1">Created At</span>
                <span className="text-campusblue-900">
                  {viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString() : "â€”"}
                </span>
              </div>
            </div>

            {viewingUser.student_profile && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-campusblue-900 border-b pb-2">Student Profile Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500">Name</span>
                    <span className="text-campusblue-900">{viewingUser.student_profile.first_name} {viewingUser.student_profile.last_name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500">Identifier</span>
                    <span className="text-campusblue-900">{viewingUser.student_profile.student_identifier}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500">Branch</span>
                    <span className="text-campusblue-900">{viewingUser.student_profile.branch}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500">CGPA</span>
                    <span className="text-campusblue-900">{viewingUser.student_profile.cgpa}</span>
                  </div>
                </div>

                {viewingUser.student_profile.skills && viewingUser.student_profile.skills.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Skills</span>
                    <div className="flex flex-wrap gap-2">
                      {viewingUser.student_profile.skills.map((s: any) => (
                        <span key={s.id} className="px-2 py-1 text-2xs bg-campusblue-50 text-campusblue-800 rounded border border-campusblue-50">
                          {s.skill?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                

                {viewingUser.student_profile.academic_history && viewingUser.student_profile.academic_history.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Academic History ({viewingUser.student_profile.academic_history.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.academic_history.map((a: any) => (
                        <li key={a.id}>{a.degree} from {a.institution} ({a.percentage}%)</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {viewingUser.student_profile.certifications && viewingUser.student_profile.certifications.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Certifications ({viewingUser.student_profile.certifications.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.certifications.map((c: any) => (
                        <li key={c.id}>{c.name} by {c.issuing_organization}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewingUser.student_profile.resume_url && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Resume Metadata</span>
                    <button onClick={() => handleDownloadResume(viewingUser.student_profile.resume_url)} className="text-xs text-campusblue-700 underline cursor-pointer">View Resume Document</button>
                  </div>
                )}

                {viewingUser.student_profile.applications && viewingUser.student_profile.applications.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Job Applications ({viewingUser.student_profile.applications.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.applications.map((app: any) => (
                        <li key={app.id}>Application #{app.id} - Status: {app.status}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {viewingUser.student_profile.scores && viewingUser.student_profile.scores.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Readiness Scores ({viewingUser.student_profile.scores.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.scores.map((s: any) => (
                        <li key={s.id}>{s.dimension}: {s.score}/100</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewingUser.student_profile.assessments && viewingUser.student_profile.assessments.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Assessments ({viewingUser.student_profile.assessments.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.assessments.map((a: any) => (
                        <li key={a.id}>{a.test_name} - Score: {a.score}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewingUser.student_profile.offers && viewingUser.student_profile.offers.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Job Offers ({viewingUser.student_profile.offers.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.offers.map((o: any) => (
                        <li key={o.id}>Offer #{o.id} - Salary: {o.salary_offered}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewingUser.student_profile.projects && viewingUser.student_profile.projects.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500 mb-1">Projects ({viewingUser.student_profile.projects.length})</span>
                    <ul className="text-xs text-campusblue-800 list-disc list-inside">
                      {viewingUser.student_profile.projects.map((p: any) => (
                        <li key={p.id}>{p.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {viewingUser.recruiter_profile && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-campusblue-900 border-b pb-2">Recruiter & Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500">Contact Name</span>
                    <span className="text-campusblue-900">{viewingUser.recruiter_profile.contact_name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-campusblue-500">Contact Phone</span>
                    <span className="text-campusblue-900">{viewingUser.recruiter_profile.contact_phone || "â€”"}</span>
                  </div>
                </div>

                {viewingUser.recruiter_profile.company && (
                  <div className="mt-4 bg-campusblue-50 p-3 rounded border border-campusblue-100">
                    <span className="block text-xs font-bold text-campusblue-800 mb-2">Company Details</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="font-semibold">Name:</span> {viewingUser.recruiter_profile.company.name}</div>
                      <div><span className="font-semibold">Industry:</span> {viewingUser.recruiter_profile.company.industry || "â€”"}</div>
                      <div><span className="font-semibold">Size:</span> {viewingUser.recruiter_profile.company.size || "â€”"}</div>
                      <div><span className="font-semibold">HQ:</span> {viewingUser.recruiter_profile.company.headquarters || "â€”"}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Filters Bar */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => { setPage(1); setSearchQuery(e.target.value); }}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-campusblue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-campusblue-500">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-campusblue-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="RECRUITER">Recruiters</option>
              <option value="PLACEMENT_OFFICER">Placement Officers</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content Table */}
      {loading ? (
        <LoadingState message="Loading registered users..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users match the search criteria"
          description="Try broadening your search term or selecting a different role filter."
        />
      ) : (
        <Card padding="none">
          <div className="p-4 border-b border-campusblue-100 flex justify-between items-center bg-campusblue-50/50">
            <span className="text-xs font-bold text-campusblue-800">
              Total Accounts: <span className="text-campusblue-700">{total}</span>
            </span>
            <span className="text-2xs text-campusblue-300 font-medium">
              Role permissions strictly enforced via backend JWT RBAC
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-campusblue-50 border-b border-campusblue-100 text-campusblue-700 font-semibold uppercase text-2xs tracking-wider">
                  <th className="p-3.5">User / Account</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Linked Profile</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-campusblue-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-campusblue-900">{u.email}</div>
                      <div className="text-2xs text-campusblue-300 font-mono">UID #{u.id}</div>
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={u.role} size="sm" />
                    </td>
                    <td className="p-3.5">
                      {u.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-campusblue-50 text-campusblue-900">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-campusblue-50 text-campusblue-900">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {u.student_profile ? (
                        <div>
                          <span className="font-semibold text-campusblue-900">
                            {u.student_profile.first_name} {u.student_profile.last_name}
                          </span>
                          <span className="text-2xs text-campusblue-700 block">
                            {u.student_profile.student_identifier} &bull; {u.student_profile.branch}
                          </span>
                        </div>
                      ) : u.recruiter_profile ? (
                        <div>
                          <span className="font-semibold text-campusblue-900">
                            {u.recruiter_profile.company_name || "Company Assigned"}
                          </span>
                          <span className="text-2xs text-campusblue-700 block">
                            Recruiter Profile #{u.recruiter_profile.id}
                          </span>
                        </div>
                      ) : (
                        <span className="text-campusblue-300">&mdash;</span>
                      )}
                    </td>
                    <td className="p-3.5 text-campusblue-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "&mdash;"}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-2xs h-7 px-2"
                          onClick={() => handleViewDetails(u.id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`text-2xs h-7 px-2 ${
                            u.is_active
                              ? "text-campusblue-700 hover:text-campusblue-800 hover:bg-campusblue-50 border-campusblue-100"
                              : "text-campusblue-700 hover:text-campusblue-800 hover:bg-campusblue-50 border-campusblue-100"
                          }`}
                          loading={togglingId === u.id}
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser?.id}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-campusblue-100 flex items-center justify-between bg-white">
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
    </AppLayout>
  );
}




