"use client";

import type React from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RestaurantDashboardLayout } from "@/components/restaurant-dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { usesRestaurantPortal } from "@/lib/portal-access";

interface RestaurantLayoutWrapperProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function RestaurantLayoutWrapper({
  children,
  activeTab = "restaurant",
}: RestaurantLayoutWrapperProps) {
  const { user } = useAuth();

  if (usesRestaurantPortal(user)) {
    return (
      <RestaurantDashboardLayout activeTab={activeTab}>
        {children}
      </RestaurantDashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab}>{children}</DashboardLayout>
  );
}
