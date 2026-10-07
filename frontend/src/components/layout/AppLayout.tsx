"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { StatusBadge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";

export interface AppLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, allowedRoles = [] }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    // Student links
    { href: "/dashboard/profile", label: "My Profile", roles: ["STUDENT"] },
    { href: "/dashboard/jobs", label: "Jobs & Drives", roles: ["STUDENT"] },
    { href: "/dashboard/readiness", label: "Readiness & Gaps", roles: ["STUDENT"] },
    
    // Recruiter link
    { href: "/dashboard/recruiter", label: "Recruiter Portal", roles: ["RECRUITER"] },
    
    // Admin specific existing links
    { href: "/dashboard/students", label: "Student Directory", roles: ["SUPER_ADMIN"] },
    { href: "/dashboard/companies", label: "Corporate Partners", roles: ["SUPER_ADMIN"] },
    { href: "/dashboard/admin/skills", label: "Master Skills", roles: ["SUPER_ADMIN"] },
    { href: "/dashboard/admin/users", label: "User Accounts", roles: ["SUPER_ADMIN"] },

    // Placement Officer (TPO) requested links
    { href: "/dashboard/tpo/command-center", label: "Placement Command Center", roles: ["PLACEMENT_OFFICER"] },
    { href: "/dashboard/tpo/drive-manager", label: "Drive Lifecycle Manager", roles: ["PLACEMENT_OFFICER"] },
    { href: "/dashboard/tpo/shortlisting", label: "AI Shortlisting Console", roles: ["PLACEMENT_OFFICER"] },
    { href: "/dashboard/tpo/scheduler", label: "Conflict-Free Scheduler", roles: ["PLACEMENT_OFFICER"] },
    { href: "/dashboard/tpo/offer-desk", label: "Offer Verification Desk", roles: ["PLACEMENT_OFFICER"] },
    { href: "/dashboard/tpo/at-risk", label: "Cohort & At-Risk Center", roles: ["PLACEMENT_OFFICER"] },
  ];

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-campusblue-50 flex flex-col text-campusblue-900 font-serif">
        {/* Top Navbar */}
        <header className="bg-campusblue-900 border-b border-campusblue-800 sticky top-0 z-30 shadow-lg transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Brand Logo & Nav */}
              <div className="flex items-center gap-8">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white">CAMPUS<span className="text-campusblue-100">LINK</span></span>
                </Link>

                <nav className="flex overflow-x-auto md:flex-wrap items-center gap-1 pb-2 md:pb-0 scrollbar-hide">
                  {navLinks.map((link) => {
                    if (link.roles && user && !link.roles.includes(user.role)) {
                      return null;
                    }
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                          isActive
                            ? "bg-campusblue-800 text-campusblue-100 font-bold border-campusblue-100 border-b-2 shadow-sm"
                            : "text-campusblue-700 hover:text-campusblue-900 hover:bg-campusblue-50 hover:text-campusblue-900 hover:shadow-sm"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* User profile & Logout */}
              <div className="flex items-center gap-4">
                {user && (
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-semibold text-white">{user.email}</span>
                    <div className="mt-0.5">
                      <StatusBadge status={user.role} size="sm" />
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="text-xs text-campusblue-700 hover:text-campusblue-800 hover:bg-campusblue-50 border-campusblue-100"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
};







