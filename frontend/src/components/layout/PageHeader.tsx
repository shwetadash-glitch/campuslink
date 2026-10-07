"use client";

import React from "react";
import Link from "next/link";
import { Button } from "../ui/Button";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  actions,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-campusblue-100 mb-6 ${className}`}>
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center text-xs font-semibold text-campusblue-700 hover:text-campusblue-900 mb-2 gap-1 group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span>
            <span>{backLabel}</span>
          </Link>
        )}
        <h1 className="text-3xl font-bold text-campusblue-900 tracking-tight font-serif">{title}</h1>
        {subtitle && <p className="text-sm text-campusblue-500 mt-1 font-serif italic">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};





