"use client";

import React from "react";
import { Button } from "../ui/Button";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "An error occurred while loading this section.",
  onRetry,
  className = "py-12 px-4 text-center",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center bg-campusblue-50/50 border border-campusblue-100 rounded-lg font-serif ${className}`}>
      <div className="w-12 h-12 mb-3 rounded-full bg-campusblue-50 flex items-center justify-center text-campusblue-700">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h4 className="text-sm font-semibold text-campusblue-900">Failed to Load</h4>
      <p className="text-xs text-campusblue-700 max-w-sm mt-1">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="mt-4">
          Retry
        </Button>
      )}
    </div>
  );
};



