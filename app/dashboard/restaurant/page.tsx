"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Restaurant</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {usesRestaurantPortal(user)
              ? "Orders, kitchen, and menu"
              : "Quick access to restaurant operations"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">
                  Pending today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </CardContent>
            </Card>
            {canUseKitchenDisplay(user) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-muted-foreground">
                    Kitchen queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{kitchenCount}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {(canCreateRestaurantOrders(user) || canViewRestaurant(user)) && (
            <Button asChild>
              <Link href="/dashboard/restaurant/orders">
                <ClipboardList className="w-4 h-4 mr-2" />
                Orders
              </Link>
            </Button>
          )}
          {canUseKitchenDisplay(user) && (
            <Button asChild variant="secondary">
              <Link href="/dashboard/restaurant/kitchen">
                <ChefHat className="w-4 h-4 mr-2" />
                Kitchen
              </Link>
            </Button>
          )}
          {(canManageRestaurantMenu(user) || canViewRestaurant(user)) && (
            <Button asChild variant="outline">
              <Link href="/dashboard/restaurant/menu">
                <UtensilsCrossed className="w-4 h-4 mr-2" />
                Menu
              </Link>
            </Button>
          )}
        </div>
      </div>
    </RestaurantLayoutWrapper>
  );
}
