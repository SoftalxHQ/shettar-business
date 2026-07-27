"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { useAuth } from "@/lib/auth-context";
import {
  canCreateRestaurantOrders,
  canManageRestaurantMenu,
  canUseKitchenDisplay,
  canViewRestaurant,
  isRestaurantModuleEnabled,
} from "@/lib/restaurant-access";
import { usesRestaurantPortal } from "@/lib/portal-access";
import {
  fetchKitchenQueue,
  fetchOrders,
  resolveBusinessId,
} from "@/lib/restaurant-api";
import { ArrowRight, ChefHat, ClipboardList, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RestaurantHubPage() {
  const router = useRouter();
  const { user, businessId } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [kitchenCount, setKitchenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const bid = resolveBusinessId(businessId);
  const canView = canViewRestaurant(user);

  useEffect(() => {
    if (!user) return;
    if (!isRestaurantModuleEnabled(user)) {
      toast.error("Enable restaurant operations in Settings first");
      router.push("/dashboard/business/settings");
      return;
    }
    if (!canView && !canUseKitchenDisplay(user) && !canCreateRestaurantOrders(user)) {
      router.push("/dashboard");
    }
  }, [user, router, canView]);

  const load = useCallback(async () => {
    if (!bid) return;
    setLoading(true);
    try {
      const [orders, kitchen] = await Promise.all([
        fetchOrders(bid, { today: true, status: "pending" }),
        canUseKitchenDisplay(user)
          ? fetchKitchenQueue(bid)
          : Promise.resolve([]),
      ]);
      setPendingCount(orders.length);
      setKitchenCount(kitchen.length);
    } catch {
      setPendingCount(0);
      setKitchenCount(0);
    } finally {
      setLoading(false);
    }
  }, [bid, user]);

  useEffect(() => {
    load();
  }, [load]);

  const actions = [
    (canCreateRestaurantOrders(user) || canViewRestaurant(user)) && {
      href: "/dashboard/restaurant/orders",
      title: "Orders",
      description: "Search, filter, and place orders",
      icon: ClipboardList,
      accent: "bg-indigo-50 text-indigo-600",
    },
    canUseKitchenDisplay(user) && {
      href: "/dashboard/restaurant/kitchen",
      title: "Kitchen",
      description: "Live prep board and 86 list",
      icon: ChefHat,
      accent: "bg-amber-50 text-amber-700",
    },
    (canManageRestaurantMenu(user) || canViewRestaurant(user)) && {
      href: "/dashboard/restaurant/menu",
      title: "Menu",
      description: "Categories, items, availability",
      icon: UtensilsCrossed,
      accent: "bg-emerald-50 text-emerald-700",
    },
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    description: string;
    icon: typeof ClipboardList;
    accent: string;
  }>;

  return (
    <RestaurantLayoutWrapper activeTab="restaurant">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Restaurant</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {usesRestaurantPortal(user)
              ? "Orders, kitchen, and menu"
              : "Quick access to restaurant operations"}
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            <div className={cn("shrink-0 grid gap-3", canUseKitchenDisplay(user) ? "grid-cols-2" : "grid-cols-1")}>
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Pending today
                </p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 mt-1 leading-none">
                  {pendingCount}
                </p>
              </div>
              {canUseKitchenDisplay(user) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Kitchen queue
                  </p>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 mt-1 leading-none">
                    {kitchenCount}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
              <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Operations</p>
                <p className="text-[11px] text-slate-500">Jump into the workstation you need</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className={cn("p-2 rounded-lg shrink-0", action.accent)}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{action.title}</p>
                      <p className="text-[11px] text-slate-500">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </RestaurantLayoutWrapper>
  );
}
