"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AiNavigator } from "@/components/AiNavigator";
import { NotificationBell } from "./NotificationBell";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";

export interface NavItem {
  href: string;
  label: string;
  roles?: string[];
}

export interface NavGroup {
  label: string;
  roles?: string[];
  items: NavItem[];
}

export interface AppLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  allowedRoles = [],
}) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navContainerRef = useRef<HTMLElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    setProfileDropdownOpen(false);
  }, [pathname]);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        setProfileDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Role-based grouped navigation hierarchy
  const navGroups: (NavItem | NavGroup)[] = [
    { href: "/dashboard", label: "Dashboard" },

    // Student Grouping
    {
      label: "Opportunities",
      roles: ["STUDENT"],
      items: [
        { href: "/dashboard/jobs", label: "Jobs & Drives" },
        { href: "/dashboard/student-journey", label: "Placement Journey" },
      ],
    },
    {
      label: "Career Tools",
      roles: ["STUDENT"],
      items: [
        { href: "/resume-builder", label: "Resume Studio (Linear Style)" },
        { href: "/dashboard/resumes", label: "AI Resume Builder" },
        { href: "/dashboard/readiness", label: "Readiness & Gaps" },
        { href: "/dashboard/communication-coach", label: "Communication Coach" },
        { href: "/dashboard/assessments", label: "Practice Assessments" },
      ],
    },
    { href: "/dashboard/profile", label: "My Profile", roles: ["STUDENT"] },

    // Recruiter Direct Link
    { href: "/dashboard/recruiter", label: "Recruiter Portal", roles: ["RECRUITER"] },

    // Placement Officer (TPO) Grouping
    {
      label: "Placement Drives",
      roles: ["PLACEMENT_OFFICER"],
      items: [
        { href: "/dashboard/tpo/drive-manager", label: "Drive Manager" },
        { href: "/dashboard/tpo/shortlisting", label: "Shortlisting Console" },
        { href: "/dashboard/tpo/rounds", label: "Rounds & Quiz" },
        { href: "/dashboard/tpo/scheduler", label: "Interview Scheduler" },
        { href: "/dashboard/tpo/offer-desk", label: "Offer Verification" },
      ],
    },
    {
      label: "Intelligence",
      roles: ["PLACEMENT_OFFICER"],
      items: [
        { href: "/dashboard/tpo/command-center", label: "Command Center" },
        { href: "/dashboard/tpo/analytics", label: "Institutional Analytics" },
        { href: "/dashboard/tpo/at-risk", label: "At-Risk Cohorts" },
      ],
    },
    { href: "/dashboard/assessments", label: "Assessments", roles: ["PLACEMENT_OFFICER"] },

    // Super Admin Grouping
    {
      label: "Administration",
      roles: ["SUPER_ADMIN"],
      items: [
        { href: "/dashboard/students", label: "Student Directory" },
        { href: "/dashboard/companies", label: "Corporate Partners" },
        { href: "/dashboard/admin/skills", label: "Master Skills" },
        { href: "/dashboard/admin/users", label: "User Accounts" },
      ],
    },
    { href: "/dashboard/tpo/analytics", label: "Analytics", roles: ["SUPER_ADMIN"] },
    { href: "/dashboard/assessments", label: "Assessments", roles: ["SUPER_ADMIN"] },
  ];

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-campusblue-50 flex flex-col font-sans text-campusblue-900">
        {/* Navigation Bar */}
        <header className="bg-campusblue-900 border-b border-campusblue-800 sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Brand Logo & Desktop Nav */}
              <div className="flex items-center gap-6">
                <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                  <span className="text-xl font-black tracking-tight text-white">
                    CAMPUS<span className="text-campusblue-200">LINK</span>
                  </span>
                </Link>

                {/* Desktop Navigation Items */}
                <nav ref={navContainerRef} className="hidden lg:flex items-center gap-1">
                  {navGroups.map((entry, idx) => {
                    if (entry.roles && user && !entry.roles.includes(user.role)) return null;
                    if (entry.roles && !user) return null;

                    // Direct Link
                    if ("href" in entry) {
                      const isActive =
                        entry.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname === entry.href || pathname.startsWith(entry.href + "/");
                      return (
                        <Link
                          key={entry.href}
                          href={entry.href}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isActive
                              ? "bg-campusblue-800 text-white shadow-sm"
                              : "text-campusblue-200 hover:text-white hover:bg-campusblue-800/60"
                          }`}
                        >
                          {entry.label}
                        </Link>
                      );
                    }

                    // Dropdown Group
                    const isGroupActive = entry.items.some(
                      (item) =>
                        pathname === item.href || pathname.startsWith(item.href + "/")
                    );
                    const isOpen = activeDropdown === entry.label;

                    return (
                      <div
                        key={idx}
                        className="relative group"
                        onMouseEnter={() => setActiveDropdown(entry.label)}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveDropdown(isOpen ? null : entry.label)}
                          aria-expanded={isOpen}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isGroupActive || isOpen
                              ? "bg-campusblue-800 text-white shadow-sm"
                              : "text-campusblue-200 hover:text-white hover:bg-campusblue-800/60"
                          }`}
                        >
                          <span>{entry.label}</span>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : "group-hover:rotate-180"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Dropdown Menu Flyout */}
                        <div
                          className={`absolute left-0 top-full pt-1.5 w-56 z-50 transition-all duration-150 ${
                            isOpen ? "block opacity-100 visible" : "hidden group-hover:block"
                          }`}
                        >
                          <div className="bg-white rounded-xl shadow-xl border border-campusblue-100 py-1.5 overflow-hidden">
                            {entry.items.map((subItem) => {
                              const isSubActive =
                                pathname === subItem.href ||
                                pathname.startsWith(subItem.href + "/");
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  onClick={() => setActiveDropdown(null)}
                                  className={`block px-4 py-2 text-xs font-medium transition ${
                                    isSubActive
                                      ? "bg-campusblue-50 text-campusblue-900 font-bold border-l-2 border-campusblue-700 pl-3.5"
                                      : "text-campusblue-800 hover:bg-campusblue-50 hover:text-campusblue-950"
                                  }`}
                                >
                                  {subItem.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Right Side: Notification Bell + Compact Profile Avatar */}
              <div className="flex items-center gap-3">
                {user && <NotificationBell />}
                {user && (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setProfileDropdownOpen((prev) => !prev)}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-campusblue-800 transition focus:outline-none focus:ring-1 focus:ring-campusblue-300"
                      aria-expanded={profileDropdownOpen}
                      aria-label="User profile menu"
                    >
                      <div className="w-8 h-8 rounded-full bg-campusblue-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                        {user.email ? user.email.charAt(0) : "U"}
                      </div>
                      <div className="hidden sm:block text-left text-xs">
                        <p className="font-semibold text-white leading-tight truncate max-w-[120px]">
                          {user.email ? user.email.split("@")[0] : "User"}
                        </p>
                        <p className="text-3xs text-campusblue-200">{user.role}</p>
                      </div>
                      <svg
                        className={`w-3.5 h-3.5 text-campusblue-300 transition-transform duration-200 ${
                          profileDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Profile Popover */}
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-campusblue-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-4 py-2 border-b border-campusblue-50">
                          <p className="text-xs font-bold text-campusblue-900 truncate">
                            {user.email}
                          </p>
                          <div className="mt-1">
                            <StatusBadge status={user.role} size="sm" />
                          </div>
                        </div>
                        <div className="py-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={logout}
                            className="w-full justify-start text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-none px-4"
                          >
                            Sign Out
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Hamburger Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="lg:hidden p-2 rounded-lg text-campusblue-200 hover:text-white hover:bg-campusblue-800 transition"
                  aria-label="Toggle navigation menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Drawer (Accordion style) */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-campusblue-950 border-t border-campusblue-800 px-4 pt-3 pb-6 space-y-2">
              {navGroups.map((entry, idx) => {
                if (entry.roles && user && !entry.roles.includes(user.role)) return null;
                if (entry.roles && !user) return null;

                if ("href" in entry) {
                  const isActive =
                    entry.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === entry.href || pathname.startsWith(entry.href + "/");
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
                        isActive
                          ? "bg-campusblue-800 text-white font-bold"
                          : "text-campusblue-200 hover:text-white hover:bg-campusblue-800"
                      }`}
                    >
                      {entry.label}
                    </Link>
                  );
                }

                return (
                  <div key={idx} className="pt-2">
                    <p className="px-3 text-2xs uppercase tracking-wider font-bold text-campusblue-400">
                      {entry.label}
                    </p>
                    <div className="mt-1 pl-2 space-y-1">
                      {entry.items.map((sub) => {
                        const isSubActive =
                          pathname === sub.href || pathname.startsWith(sub.href + "/");
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-3 py-1.5 rounded-md text-xs font-medium transition ${
                              isSubActive
                                ? "bg-campusblue-800 text-white font-bold"
                                : "text-campusblue-200 hover:text-white hover:bg-campusblue-800"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Mobile User Profile & Logout */}
              {user && (
                <div className="pt-4 mt-3 border-t border-campusblue-800">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="truncate mr-2">
                      <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                      <p className="text-2xs text-campusblue-300">{user.role}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={logout}
                      className="text-xs text-rose-300 hover:text-white hover:bg-rose-900/40 border-rose-800"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      <AiNavigator />
    </ProtectedRoute>
  );
};

export default AppLayout;
