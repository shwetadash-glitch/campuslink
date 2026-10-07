"use client";
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function TpoPlaceholderPage() {
  return (
    <AppLayout allowedRoles={["PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader title="User Identity & Security" description="Manage authentication policies and secure access credentials." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState title="User Identity & Security Dashboard" description="We are currently building out the User Identity & Security tools right now. Check back soon!" />
      </div>
    </AppLayout>
  );
}
