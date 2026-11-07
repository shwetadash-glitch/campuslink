"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export interface AnalyticsFilterBarProps {
  graduationYear?: number;
  branch?: string;
  availableYears?: number[];
  availableBranches?: string[];
  onFilterChange: (filters: { graduationYear?: number; branch?: string }) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const DEFAULT_YEARS = [2027, 2026, 2025, 2024, 2023];

const DEFAULT_BRANCHES = [
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics and Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical and Electronics Engineering",
];

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  graduationYear,
  branch,
  availableYears,
  availableBranches,
  onFilterChange,
  onRefresh,
  isLoading = false,
}) => {
  const hasActiveFilters = Boolean(graduationYear || branch);

  // Use dynamically discovered values from database if available, otherwise standard cohort defaults
  const yearsToDisplay = availableYears && availableYears.length > 0
    ? Array.from(new Set([...availableYears, ...(graduationYear ? [graduationYear] : [])])).sort((a, b) => b - a)
    : DEFAULT_YEARS;

  const branchesToDisplay = availableBranches && availableBranches.length > 0
    ? Array.from(new Set([...availableBranches, ...(branch ? [branch] : [])])).sort()
    : DEFAULT_BRANCHES;

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onFilterChange({ graduationYear: val, branch });
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value || undefined;
    onFilterChange({ graduationYear, branch: val });
  };

  const handleReset = () => {
    onFilterChange({ graduationYear: undefined, branch: undefined });
  };

  return (
    <div className="bg-white rounded-lg border border-campusblue-100 p-4 shadow-sm transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-campusblue-600">Filters:</span>
          </div>

          {/* Graduation Year */}
          <div className="min-w-[180px]">
            <label htmlFor="analytics-filter-grad-year" className="sr-only">
              Filter by Graduation Year
            </label>
            <select
              id="analytics-filter-grad-year"
              aria-label="Filter by Graduation Year"
              value={graduationYear ?? ""}
              onChange={handleYearChange}
              className="w-full text-sm rounded-md border border-campusblue-200 bg-white px-3 py-1.5 text-campusblue-900 focus:outline-none focus:ring-2 focus:ring-campusblue-500 font-serif"
            >
              <option value="">All Graduation Years</option>
              {yearsToDisplay.map((yr) => (
                <option key={yr} value={yr}>
                  Class of {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div className="min-w-[240px]">
            <label htmlFor="analytics-filter-department" className="sr-only">
              Filter by Academic Department
            </label>
            <select
              id="analytics-filter-department"
              aria-label="Filter by Academic Department"
              value={branch ?? ""}
              onChange={handleBranchChange}
              className="w-full text-sm rounded-md border border-campusblue-200 bg-white px-3 py-1.5 text-campusblue-900 focus:outline-none focus:ring-2 focus:ring-campusblue-500 font-serif"
            >
              <option value="">All Academic Departments</option>
              {branchesToDisplay.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-campusblue-600 hover:text-campusblue-800 underline font-medium cursor-pointer px-1 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-campusblue-100 text-campusblue-800">
              <span className="h-1.5 w-1.5 rounded-full bg-campusblue-600"></span>
              Filtered Telemetry
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh institutional telemetry data"
            className="flex items-center gap-1.5 text-xs text-campusblue-700 border-campusblue-300 hover:bg-campusblue-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isLoading ? "Syncing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
