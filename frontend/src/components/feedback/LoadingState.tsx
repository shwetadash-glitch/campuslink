"use client";

import React from "react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className = "py-16 text-center",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="w-8 h-8 border-3 border-campusblue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-campusblue-700 font-serif italic">{message}</p>
    </div>
  );
};


