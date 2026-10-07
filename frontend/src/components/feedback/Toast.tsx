"use client";

import React, { useEffect } from "react";

export interface ToastProps {
  message?: string | null;
  type?: "success" | "error" | "info";
  duration?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 4000,
  onDismiss,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const typeStyles = {
    success: "bg-campusblue-700 text-white shadow-campusblue-500/20",
    error: "bg-campusblue-700 text-white shadow-campusblue-500/20",
    info: "bg-campusblue-700 text-white shadow-blue-500/20",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${typeStyles[type]}`}
        role="status"
      >
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-black/10 transition cursor-pointer"
          aria-label="Dismiss toast"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};



