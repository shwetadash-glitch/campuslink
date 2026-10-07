"use client";

import React from "react";

export type BadgeVariant = "info" | "success" | "warning" | "danger" | "neutral" | "purple";

export interface StatusBadgeProps {
  status: string;
  variant?: "auto" | BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = "auto",
  size = "md",
  className = "",
}) => {
  const normalized = status ? status.toUpperCase().replace(/\s+/g, "_") : "";

  let resolvedVariant: BadgeVariant = "neutral";
  if (variant !== "auto") {
    resolvedVariant = variant;
  } else {
    switch (normalized) {
      case "PUBLISHED":
      case "REGISTRATION_OPEN":
      case "COMPLETED":
      case "VERIFIED":
      case "READY":
      case "ELIGIBLE":
      case "ACTIVE":
      case "EXPERT":
        resolvedVariant = "success";
        break;
      case "IN_PROGRESS":
      case "INTERMEDIATE":
      case "DEVELOPING":
      case "MEDIUM":
        resolvedVariant = "info";
        break;
      case "DRAFT":
      case "PENDING":
      case "BEGINNER":
      case "LOW":
      case "EXPLORING":
        resolvedVariant = "warning";
        break;
      case "CLOSED":
      case "CANCELLED":
      case "NOT_ELIGIBLE":
      case "REJECTED":
      case "HIGH":
      case "CRITICAL":
        resolvedVariant = "danger";
        break;
      case "ADVANCED":
      case "SUPER_ADMIN":
      case "PLACEMENT_OFFICER":
      case "RECRUITER":
        resolvedVariant = "purple";
        break;
      default:
        resolvedVariant = "neutral";
    }
  }

  const variantStyles: Record<BadgeVariant, string> = {
    success: "bg-campusblue-100 text-campusblue-900 border-campusblue-300",
    info: "bg-white text-campusblue-700 border-campusblue-300",
    warning: "bg-campusblue-300 text-white border-campusblue-500",
    danger: "bg-campusblue-800 text-white border-campusblue-900",
    purple: "bg-campusblue-700 text-white border-campusblue-800",
    neutral: "bg-campusblue-50 text-campusblue-800 border-campusblue-200",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
  };

  const formattedLabel = status ? status.replace(/_/g, " ") : "";

  return (
    <span
      className={`inline-flex items-center font-serif font-bold rounded-md border shadow-sm tracking-wide ${variantStyles[resolvedVariant]} ${sizeStyles[size]} ${className}`}
    >
      {formattedLabel}
    </span>
  );
};




