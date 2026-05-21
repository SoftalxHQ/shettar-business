"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import {
  canRefundRestaurantOrder,
  canUseKitchenDisplay,
  isRestaurantModuleEnabled,
} from "@/lib/restaurant-access";
import {
  fetchKitchenQueue,
  refundOrder,
  resolveBusinessId,
  transitionOrderStatus,
  type RestaurantOrder,
} from "@/lib/restaurant-api";
import { toast } from "sonner";
import { ChefHat, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS: { key: string; label: string; next?: string; action?: string }[] = [
  { key: "pending", label: "Pending", next: "preparing", action: "Start preparing" },
  { key: "preparing", label: "Preparing", next: "ready", action: "Mark ready" },
  { key: "ready", label: "Ready", next: "served", action: "Mark served" },
];

export default function RestaurantKitchenPage() {
  const router = useRouter();
  const { user, businessId } = useAuth();
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [refundTarget, setRefundTarget] = useState<RestaurantOrder | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  const bid = resolveBusinessId(businessId);
  const canKitchen = canUseKitchenDisplay(user);
  const canRefund = canRefundRestaurantOrder(user);

  useEffect(() => {
    if (!user) return;
    if (!isRestaurantModuleEnabled(user)) {
      toast.error("Enable restaurant operations in Settings first");
      router.push("/dashboard/business/settings");
      return;
    }
    if (!canKitchen) router.push("/dashboard/business");
  }, [user, router, canKitchen]);

  const load = useCallback(async () => {
    if (!bid) return;
    try {
      const data = await fetchKitchenQueue(bid);
      setOrders(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load kitchen queue");
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

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

  const handleRefund = async () => {
    if (!bid || !refundTarget) return;
    setRefundLoading(true);
    try {
      await refundOrder(bid, refundTarget.id, {
        full: true,
        reason: refundReason.trim() || undefined,
      });
      toast.success("Refund processed");
      setRefundTarget(null);
      setRefundReason("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundLoading(false);
    }
  };

  const orderLabel = (o: RestaurantOrder) =>
    (o.order_number || `#${o.id}`).replace(/\s+/g, "");

  return (
    <RestaurantLayoutWrapper activeTab="kitchen">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-indigo-600" />
              Kitchen display
            </h1>
            <p className="text-muted-foreground text-sm">Auto-refreshes every 15 seconds</p>
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
                          <p key={item.id} className="text-sm font-medium">
                            {item.quantity}× {item.name}
                          </p>
                        ))}
                        {canRefund &&
                          order.payment_status === "paid" &&
                          order.source === "guest" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setRefundTarget(order);
                                setRefundReason("");
                              }}
                            >
                              Refund (unavailable)
                            </Button>
                          )}
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
        )}
      </div>

      <ConfirmDialog
        open={!!refundTarget}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="Refund order"
        description={
          refundTarget
            ? `Full refund for ${orderLabel(refundTarget)}? Amount credits guest wallet when applicable.`
            : undefined
        }
        confirmText="Refund"
        loading={refundLoading}
        onConfirm={handleRefund}
      >
        <div className="space-y-2 py-2">
          <Label>Reason</Label>
          <Textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="e.g. Item unavailable"
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </RestaurantLayoutWrapper>
  );
}
