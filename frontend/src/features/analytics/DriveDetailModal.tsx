"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { analyticsApi, DriveDetailData } from "@/services/analyticsApi";

export interface DriveDetailModalProps {
  driveId: number | null;
  onClose: () => void;
}

export const DriveDetailModal: React.FC<DriveDetailModalProps> = ({ driveId, onClose }) => {
  const [data, setData] = useState<DriveDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driveId) return;

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
    });

    analyticsApi
      .getDriveDetail(driveId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load detailed drive telemetry.";
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [driveId]);

  if (!driveId) return null;

  return (
    <Modal
      isOpen={Boolean(driveId)}
      onClose={onClose}
      title={data ? `${data.drive.company_name} — ${data.drive.name}` : "Drive Telemetry Inspection"}
      subtitle={data ? `Role: ${data.drive.job_title} | Venue: ${data.drive.venue}` : "Loading..."}
      size="2xl"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading && (
        <div className="py-12 text-center text-sm text-campusblue-400 font-serif animate-pulse">
          Retrieving comprehensive drive telemetry...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6 text-serif text-campusblue-900">
          {/* Drive Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-campusblue-50 rounded-lg border border-campusblue-100">
            <div className="flex items-center gap-2">
              <span className="text-2xs uppercase tracking-wider font-bold text-campusblue-600">Drive Status:</span>
              <StatusBadge status={data.drive.status} />
            </div>
            <div className="text-2xs text-campusblue-600">
              {data.drive.start_date && (
                <span>Starts: {new Date(data.drive.start_date).toLocaleDateString()}</span>
              )}
              {data.drive.end_date && (
                <span className="ml-2">&bull; Ends: {new Date(data.drive.end_date).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Candidate Funnel in Drive */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Candidate Applications &amp; Progress
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-500 block uppercase">Total Applications</span>
                <span className="text-base font-bold text-campusblue-900">{data.candidates_summary.total_applications}</span>
              </div>
              <div className="p-2.5 bg-white border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-500 block uppercase">Active Candidates</span>
                <span className="text-base font-bold text-campusblue-900">{data.candidates_summary.active_candidates}</span>
              </div>
              <div className="p-2.5 bg-white border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-500 block uppercase">Shortlisted</span>
                <span className="text-base font-bold text-campusblue-900">{data.candidates_summary.shortlisted_candidates}</span>
              </div>
              <div className="p-2.5 bg-white border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-500 block uppercase">Interviewing</span>
                <span className="text-base font-bold text-campusblue-900">{data.candidates_summary.interviewing_candidates}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div className="p-2 bg-campusblue-50/50 border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-600 block">Offered Candidates: <strong>{data.candidates_summary.offered_candidates}</strong></span>
              </div>
              <div className="p-2 bg-campusblue-50/50 border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-600 block">Rejected Candidates: <strong>{data.candidates_summary.rejected_candidates}</strong></span>
              </div>
              <div className="p-2 bg-campusblue-50/50 border border-campusblue-100 rounded">
                <span className="text-2xs text-campusblue-600 block">Withdrawn: <strong>{data.candidates_summary.withdrawn_candidates}</strong></span>
              </div>
            </div>
          </div>

          {/* Rounds Progression Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Round Progression Telemetry
            </h4>
            <div className="overflow-x-auto border border-campusblue-100 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-campusblue-100">
                <thead className="bg-campusblue-50 text-campusblue-700 font-bold uppercase tracking-wider text-2xs">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Round Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Appeared / Progressed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-campusblue-50 bg-white">
                  {data.rounds_breakdown.map((r) => (
                    <tr key={r.round_number}>
                      <td className="px-3 py-2 font-bold text-campusblue-700">{r.round_number}</td>
                      <td className="px-3 py-2 font-medium text-campusblue-900">{r.name}</td>
                      <td className="px-3 py-2 text-campusblue-600">{r.round_type}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded text-2xs font-bold bg-campusblue-50 text-campusblue-800 border border-campusblue-100">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-campusblue-900">
                        {r.candidates_appeared_or_progressed} candidates
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Offers & Verification Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-800 mb-2">
              Offers &amp; Verification Telemetry
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* By Status */}
              <div className="border border-campusblue-100 rounded-lg p-3 bg-white">
                <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-600 block mb-2">
                  Offers by Decision Status
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(data.offers_summary.by_status).map(([st, cnt]) => (
                    <div key={st} className="flex justify-between py-0.5 border-b border-campusblue-50">
                      <span className="text-campusblue-700">{st}</span>
                      <strong className="text-campusblue-900">{cnt}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Verification Status */}
              <div className="border border-campusblue-100 rounded-lg p-3 bg-white">
                <span className="text-2xs font-bold uppercase tracking-wider text-campusblue-600 block mb-2">
                  Offers by Verification Status
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(data.offers_summary.by_verification_status).map(([st, cnt]) => (
                    <div key={st} className="flex justify-between py-0.5 border-b border-campusblue-50">
                      <span className="text-campusblue-700">{st.replace(/_/g, " ")}</span>
                      <strong className="text-campusblue-900">{cnt}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Compensation Metrics */}
          <div className="p-3 bg-campusblue-50 rounded-lg border border-campusblue-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-campusblue-900 mb-2">
              Drive Verified Compensation ({data.compensation.unit})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-2xs text-campusblue-500 block uppercase">Verified Placements</span>
                <span className="text-base font-bold text-campusblue-900">
                  {data.compensation.verified_placed_offers_count}
                </span>
              </div>
              <div>
                <span className="text-2xs text-campusblue-500 block uppercase">Average CTC</span>
                <span className="text-base font-bold text-campusblue-900">
                  {data.compensation.average_ctc !== null ? `${data.compensation.average_ctc} ${data.compensation.unit}` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-2xs text-campusblue-500 block uppercase">Median CTC</span>
                <span className="text-base font-bold text-campusblue-900">
                  {data.compensation.median_ctc !== null ? `${data.compensation.median_ctc} ${data.compensation.unit}` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-2xs text-campusblue-500 block uppercase">Highest CTC</span>
                <span className="text-base font-bold text-campusblue-900">
                  {data.compensation.highest_ctc !== null ? `${data.compensation.highest_ctc} ${data.compensation.unit}` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
