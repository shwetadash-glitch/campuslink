"use client";

import React from "react";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeKey,
  onChange,
  className = "",
}: TabsProps<T>) {
  return (
    <div className={`border-b border-campusblue-100 ${className}`}>
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition cursor-pointer ${
                isActive
                  ? "border-campusblue-700 text-campusblue-900 font-bold font-serif"
                  : "border-transparent text-campusblue-500 hover:text-campusblue-800 hover:border-campusblue-200 font-serif"
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                    isActive ? "bg-campusblue-50 text-campusblue-900" : "bg-white 200 text-campusblue-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}




