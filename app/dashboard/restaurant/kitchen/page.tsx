"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  canUseKitchenDisplay,
  isRestaurantModuleEnabled,
} from "@/lib/restaurant-access";
import {
  fetchKitchenQueue,
  fetchMenuItems,
  resolveBusinessId,
  toggleMenuItemAvailability,
  transitionOrderStatus,
  type MenuItem,
  type RestaurantOrder,
} from "@/lib/restaurant-api";
import { RestaurantOrderItemLine, RestaurantOrderNotes } from "@/components/restaurant-order-notes";
import { subscribeRestaurantChannel } from "@/lib/restaurant-cable";
import { printRestaurantOrderReceipt } from "@/lib/restaurant-order-receipt";
import {
  type BookingReceiptBusiness,
  businessReceiptContext,
  fetchBusinessReceiptDetails,
} from "@/lib/booking-receipt";
import {
  resolveAvailability,
  subscribeMenuAvailabilityChange,
  type MenuAvailabilityUpdate,
} from "@/lib/restaurant-menu-sync";
import { toast } from "sonner";
import { ChefHat, Loader2, Printer, RefreshCw, Wifi } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const COLUMNS: { key: string; label: string; next?: string; action?: string }[] = [
  { key: "pending", label: "Pending", next: "preparing", action: "Start preparing" },
  { key: "preparing", label: "Preparing", next: "ready", action: "Mark ready" },
  { key: "ready", label: "Ready", next: "served", action: "Mark served" },
];

export default function RestaurantKitchenPage() {
  const router = useRouter();
  const { user, businessId, businessName } = useAuth();
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [live, setLive] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);
  const [businessDetails, setBusinessDetails] = useState<BookingReceiptBusiness | null>(null);

  const bid = resolveBusinessId(businessId);
  const canKitchen = canUseKitchenDisplay(user);

  useEffect(() => {
    if (!user) return;
    if (!isRestaurantModuleEnabled(user)) {
      toast.error("Enable restaurant operations in Settings first");
      router.push("/dashboard/business/settings");
      return;
    }
    if (!canKitchen) router.push("/dashboard/business");
  }, [user, router, canKitchen]);

  useEffect(() => {
    if (!bid) return;
    void fetchBusinessReceiptDetails(bid).then(setBusinessDetails);
  }, [bid]);

  const load = useCallback(async () => {
    if (!bid) return;
    try {
      const [queue, items] = await Promise.all([
        fetchKitchenQueue(bid),
        fetchMenuItems(bid).catch(() => []),
      ]);
      setOrders(queue);
      setMenuItems(items);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load kitchen queue");
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    load();
  }, [load]);

  const applyMenuAvailabilityUpdate = useCallback(
    (update: MenuAvailabilityUpdate) => {
      const item = update.item;
      const itemId = item?.id;
      const available = resolveAvailability(update);
      const name = update.item_name || item?.name || "Item";

      const currentUserId = user?.id ? Number(user.id) : null;
      const actorId = update.actor_user_id;
      const isRemote =
        available !== undefined &&
        actorId != null &&
        currentUserId != null &&
        actorId !== currentUserId;
      if (isRemote) {
        toast.info(`${name} ${available ? "activated" : "deactivated"}`);
      }

      if (itemId == null || available === undefined) {
        load();
        return;
      }

      setMenuItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, ...item, available } : i))
      );
    },
    [load, user?.id]
  );

  useEffect(() => {
    return subscribeMenuAvailabilityChange(applyMenuAvailabilityUpdate);
  }, [applyMenuAvailabilityUpdate]);

  useEffect(() => {
    if (!bid) return;
    const unsub = subscribeRestaurantChannel(bid, (msg) => {
      if (msg.event === "order_created") {
        toast.info("New order received");
        load();
      } else if (msg.event === "order_status_changed" || msg.event === "order_paid") {
        load();
      }
    });
    setLive(true);
    return () => {
      unsub();
      setLive(false);
    };
  }, [bid, load]);

  const toggleMenuItem = async (item: MenuItem) => {
    if (!bid) return;
    setTogglingItemId(item.id);
    try {
      const updated = await toggleMenuItemAvailability(bid, item.id);
      setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success(`${updated.name} ${updated.available ? "activated" : "deactivated"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update item");
    } finally {
      setTogglingItemId(null);
    }
  };

  const advance = async (orderId: number, status: string) => {
    if (!bid) return;
    setUpdatingId(orderId);
    try {
      await transitionOrderStatus(bid, orderId, status);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const ordersByStatus = (status: string) => orders.filter((o) => o.status === status);

  const orderLabel = (o: RestaurantOrder) =>
    (o.order_number || `#${o.id}`).replace(/\s+/g, "");

  const handlePrintOrder = async (order: RestaurantOrder) => {
    let details = businessDetails;
    if (!details && bid) {
      details = await fetchBusinessReceiptDetails(bid);
      if (details) setBusinessDetails(details);
    }

    printRestaurantOrderReceipt({
      order,
      business: businessReceiptContext(businessName, details),
    });
  };

  return (
    <RestaurantLayoutWrapper activeTab="kitchen">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-indigo-600" />
              Kitchen display
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              {live ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-green-600" />
                  Live updates
                </>
              ) : (
                "Connecting…"
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Menu availability (86)</CardTitle>
              <p className="text-xs text-muted-foreground">Deactivate items that are out of stock</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {menuItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No menu items</p>
              ) : (
                menuItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 border rounded-lg px-3 py-2 text-sm",
                      !item.available && "bg-red-50 border-red-200 opacity-80"
                    )}
                  >
                    <span className="font-medium">{item.name}</span>
                    <Switch
                      checked={item.available}
                      disabled={togglingItemId === item.id}
                      onCheckedChange={() => toggleMenuItem(item)}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="space-y-3">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  {col.label} ({ordersByStatus(col.key).length})
                </h2>
                {ordersByStatus(col.key).map((order) => {
                  const colDef = COLUMNS.find((c) => c.key === order.status);
                  return (
                    <Card key={order.id} className="border-2 shadow-sm">
                      <CardHeader className="pb-2 py-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base font-mono">{orderLabel(order)}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {order.table_label
                              ? `T${order.table_label}`
                              : order.room_number || order.room_label
                                ? `R${order.room_number || order.room_label}`
                                : "—"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString()}
                          {order.payment_status && ` · ${order.payment_status}`}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3">
                        {order.items.map((item) => (
                          <RestaurantOrderItemLine key={item.id} item={item} className="text-sm" />
                        ))}
                        <RestaurantOrderNotes order={order} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => void handlePrintOrder(order)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print receipt
                        </Button>
                        {colDef?.next && (
                          <Button
                            className={cn("w-full mt-2", col.key === "ready" && "bg-green-600 hover:bg-green-700")}
                            size="sm"
                            disabled={updatingId === order.id}
                            onClick={() => advance(order.id, colDef.next!)}
                          >
                            {updatingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              colDef.action
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

    </RestaurantLayoutWrapper>
  );
}
