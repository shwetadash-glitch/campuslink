"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DriveMetricsResponse } from "@/services/analyticsApi";
import { DriveDetailModal } from "./DriveDetailModal";

export interface DriveAnalyticsSectionProps {
  drivesData: DriveMetricsResponse | null;
  isLoading?: boolean;
  statusFilter?: string;
  onStatusFilterChange: (status: string | undefined) => void;
  page: number;
  onPageChange: (newPage: number) => void;
}

const DRIVE_STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export const DriveAnalyticsSection: React.FC<DriveAnalyticsSectionProps> = ({
  drivesData,
  isLoading = false,
  statusFilter = "",
  onStatusFilterChange,
  page,
  onPageChange,
}) => {
  const [selectedDriveId, setSelectedDriveId] = useState<number | null>(null);

  if (isLoading || !drivesData) {
    return (
      <Card title="Recruitment Drive Performance Telemetry" subtitle="Company-level drive progress and placement outcomes">
        <div className="h-64 flex items-center justify-center animate-pulse">
          <div className="text-sm text-campusblue-400 font-serif">Loading recruitment drive telemetry...</div>
        </div>
      </Card>
    );
  }

  const { data: drives, pagination, unit } = drivesData;

  return (
    <Card
      title="Recruitment Drive Performance Telemetry"
      subtitle="Corporate hiring drives, stage conversion, offer issuance, and verified placements"
      action={
        <div className="flex items-center gap-3">
          <label htmlFor="analytics-drive-status" className="sr-only">Drive Status Filter</label>
          <select
            id="analytics-drive-status"
            aria-label="Filter recruitment drives by status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value || undefined)}
            className="text-xs rounded border border-campusblue-200 bg-white px-2.5 py-1 text-campusblue-800 font-serif"
          >
            {DRIVE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-campusblue-600 font-medium">
            {pagination.total} Drives Total
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Table */}
        <div className="overflow-x-auto border border-campusblue-100 rounded-lg">
          <table className="w-full text-left text-xs font-serif divide-y divide-campusblue-100">
            <thead className="bg-campusblue-50 text-campusblue-800 font-bold uppercase tracking-wider text-2xs">
              <tr>
                <th className="px-4 py-3">Company &amp; Drive</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Active Candidates</th>
                <th className="px-3 py-3 text-right">Rounds</th>
                <th className="px-3 py-3 text-right">Issued Offers</th>
                <th className="px-3 py-3 text-right">Verified Placed</th>
                <th className="px-3 py-3 text-right">Avg CTC</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-campusblue-50 bg-white">
              {drives.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-campusblue-400">
                    No placement drives found matching the criteria.
                  </td>
                </tr>
              ) : (
                drives.map((d) => (
                  <tr key={d.id} className="hover:bg-campusblue-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-campusblue-900">{d.company_name}</div>
                      <div className="text-2xs text-campusblue-500">{d.name}</div>
                    </td>
                    <td className="px-3 py-3 text-campusblue-700">{d.job_title}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-3 text-right text-campusblue-900 font-medium">
                      {d.active_candidates_count}
                      {d.withdrawn_candidates_count > 0 && (
                        <span className="text-2xs text-campusblue-400 block font-normal">
                          ({d.withdrawn_candidates_count} w/d)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-campusblue-700">{d.total_rounds_count}</td>
                    <td className="px-3 py-3 text-right text-campusblue-800 font-medium">
                      {d.formally_issued_offers_count}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded font-bold bg-campusblue-100 text-campusblue-900">
                        {d.verified_placed_offers_count}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-campusblue-900">
                      {d.average_ctc !== null ? `${d.average_ctc} ${unit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDriveId(d.id)}
                        className="text-2xs px-2.5 py-1 text-campusblue-800 border-campusblue-200 hover:bg-campusblue-100"
                      >
                        Inspect Metrics
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between text-xs font-serif text-campusblue-700 pt-2">
            <div>
              Showing page <strong className="text-campusblue-900">{pagination.current_page}</strong> of{" "}
              <strong className="text-campusblue-900">{pagination.last_page}</strong> ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="text-xs px-3 py-1"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pagination.last_page}
                className="text-xs px-3 py-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      <DriveDetailModal
        driveId={selectedDriveId}
        onClose={() => setSelectedDriveId(null)}
      />
    </Card>
  );
};
