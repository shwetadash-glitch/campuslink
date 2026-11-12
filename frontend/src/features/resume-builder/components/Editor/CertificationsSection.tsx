"use client";

import React from 'react';
import { CertificationItem } from '../../types';
import { Plus, Trash2, Award } from '../Icons';

interface CertificationsSectionProps {
  certifications: CertificationItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<CertificationItem>) => void;
  onDelete: (id: string) => void;
}

export const CertificationsSection: React.FC<CertificationsSectionProps> = ({
  certifications,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Certifications & Licenses ({certifications.length})
          </h4>
          <p className="text-3xs text-slate-500">
            Industry accreditations (AWS, Google Cloud, CNCF CKA, PMP, CFA, etc.).
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Certification</span>
        </button>
      </div>

      {certifications.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <Award className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">No certifications added</p>
          <p className="text-2xs text-slate-500 mb-2">Include vendor or professional credentials.</p>
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            + Add Credential
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => onUpdate(cert.id, { name: e.target.value })}
                  placeholder="Certificate Name (e.g. AWS Certified Solutions Architect)"
                  className="text-xs font-bold text-slate-900 flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => onDelete(cert.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                    Issuer
                  </label>
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => onUpdate(cert.id, { issuer: e.target.value })}
                    placeholder="Amazon Web Services"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                    Issue Date
                  </label>
                  <input
                    type="text"
                    value={cert.issueDate}
                    onChange={(e) => onUpdate(cert.id, { issueDate: e.target.value })}
                    placeholder="2023-04"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-slate-600 uppercase mb-1">
                    Credential URL / ID
                  </label>
                  <input
                    type="text"
                    value={cert.url || ''}
                    onChange={(e) => onUpdate(cert.id, { url: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
