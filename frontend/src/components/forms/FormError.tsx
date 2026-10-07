"use client";

import React from "react";

export interface FormErrorProps {
  error?: string | null;
  className?: string;
  onDismiss?: () => void;
}

export const FormError: React.FC<FormErrorProps> = ({ error, className = "", onDismiss }) => {
  if (!error) return null;

  return (
    <div
      className={`p-3 bg-campusblue-50 border border-campusblue-100 text-campusblue-800 text-xs rounded-lg flex items-start justify-between gap-2 animate-in fade-in duration-100 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-campusblue-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">{error}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-campusblue-300 hover:text-campusblue-700 p-0.5 rounded cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};


