"use client";

import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", hasError = false, disabled = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm text-campusblue-900 bg-white border rounded-md transition focus:outline-none focus:ring-2 font-serif shadow-sm disabled:bg-campusblue-50 disabled:text-campusblue-500 disabled:cursor-not-allowed ${
          hasError
            ? "border-campusblue-500 focus:ring-campusblue-500 focus:border-campusblue-500 text-campusblue-900 bg-campusblue-50/20"
            : "border-campusblue-100 focus:ring-campusblue-200 focus:border-campusblue-300"
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";






