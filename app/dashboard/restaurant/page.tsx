"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { Button } from "@/components/ui/button";
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
import { ChefHat, ClipboardList, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

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
            <div className="shrink-0 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Pending today
                </p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
                  {pendingCount}
                </p>
              </div>
              {canUseKitchenDisplay(user) && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Kitchen queue
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
                    {kitchenCount}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap content-start gap-2">
              {(canCreateRestaurantOrders(user) || canViewRestaurant(user)) && (
                <Button asChild className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  <Link href="/dashboard/restaurant/orders">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Orders
                  </Link>
                </Button>
              )}
              {canUseKitchenDisplay(user) && (
                <Button asChild variant="secondary" className="h-10 rounded-xl">
                  <Link href="/dashboard/restaurant/kitchen">
                    <ChefHat className="w-4 h-4 mr-2" />
                    Kitchen
                  </Link>
                </Button>
              )}
              {(canManageRestaurantMenu(user) || canViewRestaurant(user)) && (
                <Button asChild variant="outline" className="h-10 rounded-xl">
                  <Link href="/dashboard/restaurant/menu">
                    <UtensilsCrossed className="w-4 h-4 mr-2" />
                    Menu
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </RestaurantLayoutWrapper>
  );
}
