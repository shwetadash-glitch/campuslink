"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { FormField } from "@/components/forms/FormField";
import { adminApi, MasterSkillItem } from "@/services/adminApi";
import { parseApiError } from "@/services/apiClient";

export default function MasterSkillsPage() {
  const [skills, setSkills] = useState<MasterSkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<MasterSkillItem | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Dialog
  const [deletingSkill, setDeletingSkill] = useState<MasterSkillItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getMasterSkills({
        query: searchQuery.trim() || undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
      });
      setSkills(data);
    } catch (err: any) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleOpenCreate = () => {
    setEditingSkill(null);
    setName("");
    setCategory("");
    setDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (skill: MasterSkillItem) => {
    setEditingSkill(skill);
    setName(skill.name);
    setCategory(skill.category || "");
    setDescription(skill.description || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Skill name is required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      if (editingSkill) {
        await adminApi.updateMasterSkill(editingSkill.id, {
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        });
        setToastMessage(`Skill "${name}" updated.`);
      } else {
        await adminApi.createMasterSkill({
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        });
        setToastMessage(`Skill "${name}" added to master catalog.`);
      }
      setIsModalOpen(false);
      await fetchSkills();
    } catch (err: any) {
      setFormError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSkill) return;
    setDeleting(true);
    try {
      await adminApi.deleteMasterSkill(deletingSkill.id);
      setToastMessage(`Skill "${deletingSkill.name}" removed from catalog.`);
      setDeletingSkill(null);
      await fetchSkills();
    } catch (err: any) {
      setToastMessage(parseApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  const categories = Array.from(
    new Set(skills.map((s) => s.category).filter(Boolean) as string[])
  ).sort();

  return (
    <AppLayout allowedRoles={["SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="Master Skills Catalog"
        subtitle="Maintain standardized skills taxonomy used across student self-assessments and recruiter job requirements."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ConfirmDialog
        isOpen={deletingSkill !== null}
        title="Delete Master Skill"
        message={`Are you sure you want to delete "${deletingSkill?.name}"? This action cannot be undone.`}
        onClose={() => setDeletingSkill(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingSkill ? `Edit Skill: ${editingSkill.name}` : "Register Master Skill"}
          subtitle="Define canonical skill names to avoid duplicates across college placements."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                loading={submitting}
              >
                {editingSkill ? "Update Skill" : "Create Skill"}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-campusblue-50 border border-campusblue-100 text-campusblue-800 text-xs rounded-lg">
                {formError}
              </div>
            )}
            <FormField label="Skill Name" required>
              <Input
                placeholder="e.g. Python, Docker, Machine Learning"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Category / Domain">
              <Input
                placeholder="e.g. Programming, Cloud, Data Science, Soft Skills"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </FormField>
            <FormField label="Description / Scope (Optional)">
              <Textarea
                placeholder="Provide a brief summary of what competencies this skill encompasses..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </FormField>
          </form>
        </Modal>
      )}

      {/* Action & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="text"
            placeholder="Search skills by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-campusblue-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <Button size="sm" onClick={handleOpenCreate}>
          + Add Master Skill
        </Button>
      </div>

      {/* Main Content Table */}
      {loading ? (
        <LoadingState message="Loading master skills catalog..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSkills} />
      ) : skills.length === 0 ? (
        <EmptyState
          title="No skills found"
          description="Register your college's technical and behavioral skill catalog to begin."
          actionText="Add Master Skill"
          onAction={handleOpenCreate}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-campusblue-50 border-b border-campusblue-100 text-campusblue-700 font-semibold uppercase text-2xs tracking-wider">
                  <th className="p-3.5">Skill Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Student Usage</th>
                  <th className="p-3.5">Job Usage</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {skills.map((s) => (
                  <tr key={s.id} className="hover:bg-campusblue-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-campusblue-900">
                      {s.name}
                    </td>
                    <td className="p-3.5">
                      {s.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-campusblue-50 text-campusblue-800 border border-campusblue-100">
                          {s.category}
                        </span>
                      ) : (
                        <span className="text-campusblue-300">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-campusblue-700 max-w-xs truncate">
                      {s.description || "—"}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-campusblue-900">
                        {s.student_count}
                      </span>{" "}
                      <span className="text-2xs text-campusblue-300">profiles</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-campusblue-900">
                        {s.job_count}
                      </span>{" "}
                      <span className="text-2xs text-campusblue-300">jobs</span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-2xs h-7 px-2"
                          onClick={() => handleOpenEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-2xs h-7 px-2 text-campusblue-700 hover:bg-campusblue-50 hover:text-campusblue-800"
                          onClick={() => setDeletingSkill(s)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}




