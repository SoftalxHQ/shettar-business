"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
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

    void printRestaurantOrderReceipt({
      order,
      business: businessReceiptContext(businessName, details),
    });
  };

  return (
    <RestaurantLayoutWrapper activeTab="kitchen">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-indigo-600" />
              Kitchen display
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
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
          <Button variant="outline" size="sm" onClick={() => load()} className="h-9 rounded-xl gap-2 shrink-0">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            <div className="shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Menu availability (86)</p>
                <p className="text-[11px] text-slate-500">Deactivate items that are out of stock</p>
              </div>
              <div className="p-3 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {menuItems.length === 0 ? (
                  <p className="text-sm text-slate-500">No menu items</p>
                ) : (
                  menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-sm",
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
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3 overflow-hidden">
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className="min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <div className="shrink-0 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
                    <h2 className="font-semibold text-xs uppercase tracking-wide text-slate-500">
                      {col.label}{" "}
                      <span className="tabular-nums text-slate-900">
                        ({ordersByStatus(col.key).length})
                      </span>
                    </h2>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                    {ordersByStatus(col.key).map((order) => {
                      const colDef = COLUMNS.find((c) => c.key === order.status);
                      return (
                        <div
                          key={order.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 shadow-sm"
                        >
                          <div className="flex justify-between items-center gap-2">
                            <p className="text-sm font-semibold font-mono text-slate-900">
                              {orderLabel(order)}
                            </p>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {order.table_label
                                ? `T${order.table_label}`
                                : order.room_number || order.room_label
                                  ? `R${order.room_number || order.room_label}`
                                  : "—"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {new Date(order.created_at).toLocaleTimeString()}
                            {order.payment_status && ` · ${order.payment_status}`}
                          </p>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <RestaurantOrderItemLine
                                key={item.id}
                                item={item}
                                className="text-sm"
                              />
                            ))}
                          </div>
                          <RestaurantOrderNotes order={order} />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 gap-1.5"
                            onClick={() => void handlePrintOrder(order)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print receipt
                          </Button>
                          {colDef?.next && (
                            <Button
                              className={cn(
                                "w-full h-8",
                                col.key === "ready" && "bg-green-600 hover:bg-green-700"
                              )}
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
                        </div>
                      );
                    })}
                    {ordersByStatus(col.key).length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No orders</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RestaurantLayoutWrapper>
  );
}
