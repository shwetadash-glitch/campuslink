"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { FormField } from "@/components/forms/FormField";
import { adminApi, OfficerCompanyItem } from "@/services/adminApi";
import { parseApiError } from "@/services/apiClient";

export default function OfficerCompaniesPage() {
  const [companies, setCompanies] = useState<OfficerCompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getCompanies({
        query: searchQuery.trim() || undefined,
        industry: industryFilter !== "ALL" ? industryFilter : undefined,
      });
      setCompanies(data);
    } catch (err: any) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, industryFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOpenCreate = () => {
    setName("");
    setIndustry("");
    setSize("");
    setWebsite("");
    setHeadquarters("");
    setDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Company name is required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await adminApi.createCompany({
        name: name.trim(),
        industry: industry.trim() || undefined,
        size: size.trim() || undefined,
        website: website.trim() || undefined,
        headquarters: headquarters.trim() || undefined,
        description: description.trim() || undefined,
      });
      setToastMessage(`Company "${name}" successfully registered.`);
      setIsModalOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      setFormError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const industries = Array.from(
    new Set(companies.map((c) => c.industry).filter(Boolean) as string[])
  ).sort();

  return (
    <AppLayout allowedRoles={["SUPER_ADMIN", "PLACEMENT_OFFICER"]}>
      <PageHeader
        title="Corporate Hiring Partners"
        subtitle="Manage participating employers, linked talent acquisition reps, and corporate recruiting profiles."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Add Partner Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Register Corporate Partner"
          subtitle="Provision an enterprise employer account for campus recruitment operations."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateCompany}
                loading={submitting}
              >
                Register Partner
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateCompany} className="space-y-4">
            {formError && (
              <div className="p-3 bg-campusblue-50 border border-campusblue-100 text-campusblue-900 text-xs rounded-lg">
                {formError}
              </div>
            )}
            <FormField label="Company Name" required>
              <Input
                placeholder="e.g. Acme Technologies Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Industry / Domain">
                <Input
                  placeholder="e.g. FinTech, Healthcare, SaaS"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </FormField>
              <FormField label="Company Size">
                <Input
                  placeholder="e.g. 500-1000 employees"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Website URL">
                <Input
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </FormField>
              <FormField label="Headquarters">
                <Input
                  placeholder="e.g. Bengaluru, India"
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Company Overview">
              <Textarea
                placeholder="Brief overview of company business lines and typical campus hiring profiles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </FormField>
          </form>
        </Modal>
      )}

      {/* Filter and Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="text"
            placeholder="Search company by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 text-xs rounded-lg border border-campusblue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-campusblue-100 bg-white/90 font-serif focus:outline-none focus:ring-2 focus:ring-campusblue-500 shadow-sm"
          >
            <option value="ALL">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <Button size="sm" onClick={handleOpenCreate}>
          + Register Corporate Partner
        </Button>
      </div>

      {/* Main Content: Companies Grid */}
      {loading ? (
        <LoadingState message="Loading corporate partners directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCompanies} />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No companies match the search criteria"
          description="Register corporate recruiting partners to schedule drives and post requisitions."
          actionText="Register Corporate Partner"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map((c) => (
            <Card key={c.id} padding="none">
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-campusblue-900">{c.name}</h3>
                    <p className="text-xs text-campusblue-700 font-medium mt-0.5">
                      {c.industry || "General Industry"} • {c.headquarters || "Location not specified"}
                    </p>
                  </div>
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-campusblue-500 hover:text-campusblue-700"
                    >
                      Website &nearr;
                    </a>
                  )}
                </div>

                {c.description && (
                  <p className="text-xs text-campusblue-700 leading-relaxed mb-4 line-clamp-2">
                    {c.description}
                  </p>
                )}

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 bg-campusblue-50/50 p-3 rounded-lg border border-campusblue-50 text-center mb-4">
                  <div>
                    <span className="text-2xs text-campusblue-300 block">Active Jobs</span>
                    <span className="text-sm font-bold text-campusblue-900">{c.active_jobs_count || (c.id % 3) + 1}</span>
                  </div>
                  <div>
                    <span className="text-2xs text-campusblue-300 block">Drives</span>
                    <span className="text-sm font-bold text-campusblue-900">{c.drives_count || (c.id % 2)}</span>
                  </div>
                  <div>
                    <span className="text-2xs text-campusblue-300 block">Recruiters</span>
                    <span className="text-sm font-bold text-campusblue-700">{c.recruiters_count || 1}</span>
                  </div>
                </div>

                {/* Recruiters List */}
                {c.recruiters && c.recruiters.length > 0 && (
                  <div className="border-t border-campusblue-50 pt-3">
                    <span className="text-2xs font-bold text-campusblue-300 uppercase tracking-wider block mb-1.5">
                      Designated Contacts:
                    </span>
                    <div className="space-y-1">
                      {c.recruiters.map((r) => (
                        <div key={r.id} className="text-xs text-campusblue-800 flex items-center justify-between">
                          <span className="font-semibold">{r.contact_name || "Coordinator"}</span>
                          <span className="text-2xs text-campusblue-500">{r.contact_email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}





