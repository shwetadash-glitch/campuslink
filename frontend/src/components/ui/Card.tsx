"use client";

import React from "react";

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  children,
  className = "",
  padding = "md",
}) => {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const hasHeader = title || subtitle || action;

  return (
    <div className={`bg-white rounded-lg border border-campusblue-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-shadow duration-300 overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="px-6 py-5 border-b border-campusblue-100 bg-white flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && <h3 className="text-xl font-bold text-campusblue-900 font-serif">{title}</h3>}
            {subtitle && <p className="text-xs text-campusblue-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={paddingStyles[padding]}>{children}</div>

      {footer && (
        <div className="px-6 py-3 bg-campusblue-50 border-t border-campusblue-100 text-sm">
          {footer}
        </div>
      )}
    </div>
  );
};





