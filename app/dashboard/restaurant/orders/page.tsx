"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  canCreateRestaurantOrders,
  canMarkRestaurantOrderPaid,
  canRefundRestaurantOrder,
  canViewRestaurant,
  isRestaurantModuleEnabled,
} from "@/lib/restaurant-access";
import {
  createOrder,
  fetchMenuCategories,
  fetchOrders,
  fetchRoomServiceTargets,
  markOrderPaid,
  refundOrder,
  resolveBusinessId,
  type MenuCategory,
  type MenuItem,
  type RestaurantOrder,
  type RoomServiceTarget,
} from "@/lib/restaurant-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Grid3X3,
  LayoutGrid,
  LayoutList,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
} from "lucide-react";

type CartLine = { menu_item_id: number; name: string; price: number; quantity: number };
type OrderMode = "table" | "room";
type OrdersView = "list" | "grid";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partial refund",
};

function formatOrderNumber(order: RestaurantOrder) {
  return (order.order_number || `#${order.id}`).replace(/\s+/g, "");
}

function orderLocationLabel(order: RestaurantOrder) {
  if (order.table_label) return `Table ${order.table_label}`;
  const room = order.room_number || order.room_label;
  if (room) {
    const guest = order.guest_name ? ` · ${order.guest_name}` : "";
    return `Room ${room}${guest}`;
  }
  return null;
}

function paymentBadgeVariant(status?: string) {
  if (status === "paid") return "default";
  if (status === "unpaid") return "secondary";
  return "outline";
}

function OrderCardContent({
  order,
  canMark,
  canRefundOrder,
  onMarkPaid,
  onRefund,
}: {
  order: RestaurantOrder;
  canMark: boolean;
  canRefundOrder: boolean;
  onMarkPaid: () => void;
  onRefund: () => void;
}) {
  const loc = orderLocationLabel(order);
  return (
    <>
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <CardTitle className="text-base font-mono tracking-wide">
          {formatOrderNumber(order)}
        </CardTitle>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant={paymentBadgeVariant(order.payment_status)} className="text-xs">
            {PAYMENT_LABELS[order.payment_status || "unpaid"] || order.payment_status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {new Date(order.created_at).toLocaleString()}
        {loc && ` · ${loc}`}
        {order.booking_id && ` · ${order.booking_id}`}
        {order.source === "guest" && " · Guest"}
      </p>
      <div className="text-sm space-y-1 mt-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-2">
            <span className="truncate">
              {item.quantity}× {item.name}
            </span>
            <span className="shrink-0">₦{item.line_total.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>Total</span>
          <span>₦{order.subtotal.toLocaleString()}</span>
        </div>
      </div>
      {(canMark || canRefundOrder) && (
        <div className="flex flex-wrap gap-2 pt-3">
          {canMark && (
            <Button size="sm" variant="outline" onClick={onMarkPaid}>
              Mark paid
            </Button>
          )}
          {canRefundOrder && (
            <Button size="sm" variant="outline" onClick={onRefund}>
              Refund
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export default function RestaurantOrdersPage() {
  const router = useRouter();
  const { user, businessId } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [roomTargets, setRoomTargets] = useState<RoomServiceTarget[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderMode, setOrderMode] = useState<OrderMode>("table");
  const [tableLabel, setTableLabel] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [todayOnly, setTodayOnly] = useState(true);
  const [ordersView, setOrdersView] = useState<OrdersView>("list");
  const [menuSearch, setMenuSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [menuView, setMenuView] = useState<"grid" | "list">("grid");
  const [markPaidOrder, setMarkPaidOrder] = useState<RestaurantOrder | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState("cash");
  const [refundOrderTarget, setRefundOrderTarget] = useState<RestaurantOrder | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const bid = resolveBusinessId(businessId);
  const canView = canViewRestaurant(user);
  const canCreate = canCreateRestaurantOrders(user);
  const canMarkPaid = canMarkRestaurantOrderPaid(user);
  const canRefund = canRefundRestaurantOrder(user);

  useEffect(() => {
    if (!user) return;
    if (!isRestaurantModuleEnabled(user)) {
      toast.error("Enable restaurant operations in Settings first");
      router.push("/dashboard/business/settings");
      return;
    }
    if (!canView) router.push("/dashboard/business");
  }, [user, router, canView]);

  const loadOrders = useCallback(async () => {
    if (!bid) return;
    setOrdersLoading(true);
    try {
      const orderList = await fetchOrders(bid, {
        today: todayOnly,
        status: statusFilter !== "all" ? statusFilter : undefined,
        payment_status: paymentFilter !== "all" ? paymentFilter : undefined,
        q: searchApplied.trim() || undefined,
      });
      setOrders(orderList);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [bid, todayOnly, statusFilter, paymentFilter, searchApplied]);

  const loadMenuData = useCallback(async () => {
    if (!bid) return;
    setMenuLoading(true);
    try {
      const [categories, targets] = await Promise.all([
        fetchMenuCategories(bid),
        fetchRoomServiceTargets(bid).catch(() => []),
      ]);
      setMenu(categories);
      setRoomTargets(targets);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setMenuLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (activeTab === "new-order" && menu.length === 0) {
      loadMenuData();
    }
  }, [activeTab, menu.length, loadMenuData]);

  const applySearch = () => setSearchApplied(searchDraft.trim());

  const availableItems: MenuItem[] = menu.flatMap((c) =>
    (c.items || []).filter((i) => i.available)
  );

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return availableItems.filter((item) => {
      const cat = menu.find((c) => c.id === item.restaurant_menu_category_id);
      if (categoryFilter !== "all" && String(item.restaurant_menu_category_id) !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (cat?.name || "").toLowerCase().includes(q)
      );
    });
  }, [availableItems, menuSearch, categoryFilter, menu]);

  const selectedTarget = roomTargets.find(
    (t) => String(t.reservation_id) === selectedTargetId
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.menu_item_id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menu_item_id === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 },
      ];
    });
  };

  const adjustQty = (menuItemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.menu_item_id === menuItemId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const submitOrder = async () => {
    if (!bid || cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (orderMode === "room" && !selectedTarget) {
      toast.error("Select a checked-in room");
      return;
    }
    if (orderMode === "table" && !tableLabel.trim()) {
      toast.error("Enter a table number");
      return;
    }

    setSaving(true);
    try {
      await createOrder(bid, {
        table_label: orderMode === "table" ? tableLabel.trim() : undefined,
        reservation_id:
          orderMode === "room" ? selectedTarget!.reservation_id : undefined,
        room_id: orderMode === "room" ? selectedTarget!.room_id : undefined,
        notes: notes.trim() || undefined,
        items: cart.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
      });
      toast.success("Order placed");
      setCart([]);
      setTableLabel("");
      setSelectedTargetId("");
      setNotes("");
      setOrderMode("table");
      setMenuSearch("");
      setActiveTab("orders");
      loadOrders();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!bid || !markPaidOrder) return;
    setActionLoading(true);
    try {
      await markOrderPaid(bid, markPaidOrder.id, markPaidMethod);
      toast.success("Payment recorded");
      setMarkPaidOrder(null);
      loadOrders();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark paid");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!bid || !refundOrderTarget) return;
    setActionLoading(true);
    try {
      await refundOrder(bid, refundOrderTarget.id, {
        full: true,
        reason: refundReason.trim() || undefined,
      });
      toast.success("Refund processed");
      setRefundOrderTarget(null);
      setRefundReason("");
      loadOrders();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setActionLoading(false);
    }
  };

  const ordersToolbar = (
    <Card className="border-2 border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, guest, room, booking…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                className="pl-9 bg-background"
              />
            </div>
            <Button type="button" variant="secondary" onClick={applySearch}>
              Search
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={todayOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setTodayOnly((v) => !v)}
            >
              {todayOnly ? "Today" : "All dates"}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap border-t pt-3">
          <p className="text-sm text-muted-foreground">
            {ordersLoading ? "Loading…" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
            {searchApplied && (
              <span className="ml-1">
                · matching &quot;{searchApplied}&quot;
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">View</span>
            <Button
              type="button"
              size="sm"
              variant={ordersView === "list" ? "default" : "outline"}
              className="h-8 gap-1"
              onClick={() => setOrdersView("list")}
            >
              <LayoutList className="w-4 h-4" />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={ordersView === "grid" ? "default" : "outline"}
              className="h-8 gap-1"
              onClick={() => setOrdersView("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 ml-1"
              onClick={() => loadOrders()}
              disabled={ordersLoading}
            >
              <RefreshCw className={cn("w-4 h-4", ordersLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <RestaurantLayoutWrapper activeTab="orders">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-indigo-600" />
              Restaurant orders
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Search and filter orders, or build a new order with menu grid/list
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-10">
            <TabsTrigger value="orders" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Orders
            </TabsTrigger>
            {canCreate && (
              <TabsTrigger value="new-order" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                New order
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="orders" className="mt-4 space-y-4">
            {ordersToolbar}

            {ordersLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No orders match your filters. Try &quot;All dates&quot; or clear search.
                </CardContent>
              </Card>
            ) : ordersView === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {orders.map((order) => {
                  const canMark =
                    canMarkPaid &&
                    order.payment_status === "unpaid" &&
                    order.status !== "cancelled";
                  const canRefundOrder =
                    canRefund &&
                    (order.payment_status === "paid" ||
                      order.payment_status === "partially_refunded") &&
                    order.source === "guest";
                  return (
                    <Card key={order.id} className="h-full">
                      <CardContent className="pt-4">
                        <OrderCardContent
                          order={order}
                          canMark={canMark}
                          canRefundOrder={canRefundOrder}
                          onMarkPaid={() => {
                            setMarkPaidOrder(order);
                            setMarkPaidMethod("cash");
                          }}
                          onRefund={() => {
                            setRefundOrderTarget(order);
                            setRefundReason("");
                          }}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const canMark =
                    canMarkPaid &&
                    order.payment_status === "unpaid" &&
                    order.status !== "cancelled";
                  const canRefundOrder =
                    canRefund &&
                    (order.payment_status === "paid" ||
                      order.payment_status === "partially_refunded") &&
                    order.source === "guest";
                  return (
                    <Card key={order.id}>
                      <CardContent className="pt-4">
                        <OrderCardContent
                          order={order}
                          canMark={canMark}
                          canRefundOrder={canRefundOrder}
                          onMarkPaid={() => {
                            setMarkPaidOrder(order);
                            setMarkPaidMethod("cash");
                          }}
                          onRefund={() => {
                            setRefundOrderTarget(order);
                            setRefundReason("");
                          }}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {canCreate && (
            <TabsContent value="new-order" className="mt-4 space-y-4">
              {menuLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : availableItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No menu items available. Add items in Menu first.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base">Menu</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={menuView === "grid" ? "default" : "outline"}
                            className="h-8 gap-1"
                            onClick={() => setMenuView("grid")}
                          >
                            <Grid3X3 className="w-4 h-4" />
                            Grid
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={menuView === "list" ? "default" : "outline"}
                            className="h-8 gap-1"
                            onClick={() => setMenuView("list")}
                          >
                            <LayoutList className="w-4 h-4" />
                            List
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Search menu by name or description…"
                          value={menuSearch}
                          onChange={(e) => setMenuSearch(e.target.value)}
                        />
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="sm:w-[180px]">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {menu.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div
                        className={
                          menuView === "grid"
                            ? "grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[min(60vh,520px)] overflow-y-auto border rounded-lg p-2"
                            : "max-h-[min(60vh,520px)] overflow-y-auto space-y-1 border rounded-lg p-2"
                        }
                      >
                        {filteredMenuItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-full p-4 text-center">
                            No items match your search.
                          </p>
                        ) : (
                          filteredMenuItems.map((item) =>
                            menuView === "grid" ? (
                              <button
                                key={item.id}
                                type="button"
                                className="text-left rounded-lg border p-2 hover:bg-muted hover:border-indigo-300 transition-colors"
                                onClick={() => addToCart(item)}
                              >
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt=""
                                    className="w-full h-20 object-cover rounded mb-1"
                                  />
                                ) : (
                                  <div className="w-full h-20 bg-muted rounded mb-1 flex items-center justify-center text-xs text-muted-foreground">
                                    No image
                                  </div>
                                )}
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  ₦{Number(item.price).toLocaleString()}
                                </p>
                              </button>
                            ) : (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-3 border border-transparent hover:border-indigo-200"
                                onClick={() => addToCart(item)}
                              >
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt=""
                                    className="w-12 h-12 rounded object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-muted shrink-0" />
                                )}
                                <span className="flex-1 font-medium text-sm">{item.name}</span>
                                <span className="text-sm font-semibold text-indigo-600">
                                  ₦{Number(item.price).toLocaleString()}
                                </span>
                              </button>
                            )
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-1 h-fit sticky top-4">
                    <CardHeader>
                      <CardTitle className="text-base">Order details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={orderMode === "table" ? "default" : "outline"}
                          className="flex-1"
                          size="sm"
                          onClick={() => setOrderMode("table")}
                        >
                          Table
                        </Button>
                        <Button
                          type="button"
                          variant={orderMode === "room" ? "default" : "outline"}
                          className="flex-1"
                          size="sm"
                          onClick={() => setOrderMode("room")}
                        >
                          Room
                        </Button>
                      </div>
                      {orderMode === "table" ? (
                        <div className="space-y-2">
                          <Label>Table number</Label>
                          <Input
                            value={tableLabel}
                            onChange={(e) => setTableLabel(e.target.value)}
                            placeholder="e.g. 12"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Checked-in room</Label>
                          {roomTargets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No checked-in guests.
                            </p>
                          ) : (
                            <Select
                              value={selectedTargetId}
                              onValueChange={setSelectedTargetId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select room" />
                              </SelectTrigger>
                              <SelectContent>
                                {roomTargets.map((t) => (
                                  <SelectItem
                                    key={t.reservation_id}
                                    value={String(t.reservation_id)}
                                  >
                                    Room {t.room_number} — {t.guest_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                      {cart.length > 0 && (
                        <div className="space-y-2 border-t pt-3">
                          <Label>Cart ({cart.length})</Label>
                          {cart.map((line) => (
                            <div
                              key={line.menu_item_id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="flex-1 truncate">{line.name}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => adjustQty(line.menu_item_id, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-5 text-center">{line.quantity}</span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => adjustQty(line.menu_item_id, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <p className="font-bold text-right text-lg">
                            ₦{cartTotal.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={submitOrder}
                        disabled={saving || cart.length === 0}
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Place order"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!markPaidOrder}
        onOpenChange={(open) => !open && setMarkPaidOrder(null)}
        title="Mark payment received"
        description={
          markPaidOrder
            ? `Record payment for ${formatOrderNumber(markPaidOrder)} (₦${markPaidOrder.subtotal.toLocaleString()})`
            : undefined
        }
        confirmText="Confirm payment"
        isDestructive={false}
        loading={actionLoading}
        onConfirm={handleMarkPaid}
      >
        <div className="space-y-2 py-2">
          <Label>Payment method</Label>
          <Select value={markPaidMethod} onValueChange={setMarkPaidMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!refundOrderTarget}
        onOpenChange={(open) => !open && setRefundOrderTarget(null)}
        title="Refund order"
        description={
          refundOrderTarget
            ? `Refund ${formatOrderNumber(refundOrderTarget)}?`
            : undefined
        }
        confirmText="Process refund"
        loading={actionLoading}
        onConfirm={handleRefund}
      >
        <div className="space-y-3 py-2">
          <Label>Reason (optional)</Label>
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
