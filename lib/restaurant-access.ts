import type { User } from "@/lib/mock-auth";

export function isRestaurantModuleEnabled(user: User | null | undefined) {
  return !!user?.restaurantEnabled;
}

export function canViewRestaurant(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.view;
}

export function canManageRestaurantMenu(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.manage_menu;
}

export function canCreateRestaurantOrders(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.create_orders;
}

export function canUseKitchenDisplay(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.kitchen;
}

export function canMarkRestaurantOrderPaid(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.mark_paid;
}

export function canRefundRestaurantOrder(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.refund;
}

export function canCancelRestaurantOrder(user: User | null | undefined) {
  if (!isRestaurantModuleEnabled(user)) return false;
  return user?.role === "admin" || !!user?.permissions?.restaurant?.cancel_orders;
}

const REFUND_EARLY_STATUSES = ["pending", "preparing"] as const;

/** Paid orders in pending/preparing need cancel_orders (or admin); later statuses need refund permission. */
export function canRefundRestaurantOrderForOrder(
  user: User | null | undefined,
  order: { status: string; payment_status?: string | null }
) {
  if (!isRestaurantModuleEnabled(user)) return false;
  const paid =
    order.payment_status === "paid" || order.payment_status === "partially_refunded";
  if (!paid || order.status === "cancelled" || order.payment_status === "refunded") {
    return false;
  }
  if (REFUND_EARLY_STATUSES.includes(order.status as (typeof REFUND_EARLY_STATUSES)[number])) {
    return canCancelRestaurantOrder(user);
  }
  return canRefundRestaurantOrder(user);
}

export function canCancelRestaurantOrderStatus(order: { status: string }) {
  return order.status === "pending" || order.status === "preparing" || order.status === "ready";
}
