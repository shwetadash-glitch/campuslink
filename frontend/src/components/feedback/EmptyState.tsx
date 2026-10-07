"use client";

import React from "react";
import { Button } from "../ui/Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = "py-12 px-4 text-center",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center border-2 border-dashed border-campusblue-100 rounded-lg bg-campusblue-50/20 font-serif ${className}`}>
      {icon ? (
        <div className="mb-3 text-campusblue-300">{icon}</div>
      ) : (
        <div className="w-12 h-12 mb-3 rounded-full bg-campusblue-50 flex items-center justify-center text-campusblue-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h4 className="text-sm font-semibold text-campusblue-900 font-bold">{title}</h4>
      {description && <p className="text-xs text-campusblue-800 italic max-w-sm mt-1">{description}</p>}
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-4">
          {actionText}
        </Button>
      )}
    </div>
  );
};




