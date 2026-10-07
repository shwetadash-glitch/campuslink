"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobData } from "./types";
import { recruitersApi } from "@/services/recruitersApi";
import { parseApiError } from "@/services/apiClient";

export interface EligibilitySandboxCardProps {
  jobs: JobData[];
}

export const EligibilitySandboxCard: React.FC<EligibilitySandboxCardProps> = ({ jobs }) => {
  const [selectedJobId, setSelectedJobId] = useState<number>(jobs[0]?.id || 0);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !studentId.trim()) {
      setError("Please select a job and enter a valid student ID.");
      return;
    }

    const numericStudentId = parseInt(studentId);
    if (isNaN(numericStudentId) || numericStudentId <= 0) {
      setError("Student ID must be a positive number.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await recruitersApi.checkEligibility(selectedJobId, numericStudentId);
      setResult(data);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Eligibility Engine Sandbox"
      subtitle="Preview real-time deterministic eligibility checks for any student against your job criteria."
      className="border-campusblue-50 bg-gradient-to-br from-white to-campusblue-50/20"
    >
      <form onSubmit={handleCheck} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Target Job Posting">
              <Select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(parseInt(e.target.value) || 0);
                  setResult(null);
                }}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.status})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Student ID">
            <Input
              type="number"
              min={1}
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setResult(null);
              }}
              placeholder="e.g. 1"
            />
          </FormField>
        </div>

        <FormError error={error} onDismiss={() => setError("")} />

        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={loading} disabled={jobs.length === 0}>
            Run Eligibility Check
          </Button>
        </div>
      </form>

      {/* Result Display */}
      {result && (
        <div className="mt-6 pt-6 border-t border-campusblue-50 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-campusblue-700">Overall Result:</span>
              <StatusBadge
                status={result.is_eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"}
                size="md"
              />
            </div>
            {result.student_name && (
              <span className="text-xs font-semibold text-campusblue-800">
                Candidate: {result.student_name}
              </span>
            )}
          </div>

          {result.failure_reasons && result.failure_reasons.length > 0 && (
            <div className="p-3 mb-4 bg-campusblue-50 border border-campusblue-100 rounded-lg text-xs text-campusblue-800">
              <span className="font-bold block mb-1">Eligibility Criteria Violations:</span>
              <ul className="list-disc pl-5 space-y-0.5">
                {result.failure_reasons.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.rule_evaluations && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {Object.entries(result.rule_evaluations).map(([rule, val]: [string, any]) => (
                <div key={rule} className="p-3 bg-white border border-campusblue-100 rounded-lg">
                  <span className="text-campusblue-500 font-medium block capitalize">
                    {rule.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`font-bold mt-1 inline-block ${
                      val?.passed || val === true ? "text-campusblue-700" : "text-campusblue-700"
                    }`}
                  >
                    {val?.passed || val === true ? "Passed" : "Failed"}
                  </span>
                  {val?.value !== undefined && (
                    <span className="text-campusblue-300 text-2xs block mt-0.5">
                      Actual: {String(val.value)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};




