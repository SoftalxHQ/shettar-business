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

/**
 * Refund visibility:
 * - unpaid / cancelled / fully refunded / nothing left to refund → hidden
 * - served → hidden (too late once food is out)
 * - pending / preparing → cancel_orders (or admin)
 * - ready → refund permission (or admin)
 */
export function canRefundRestaurantOrderForOrder(
  user: User | null | undefined,
  order: {
    status: string;
    payment_status?: string | null;
    served_at?: string | null;
    items?: Array<{
      quantity: number;
      refunded_quantity?: number;
      refundable_quantity?: number;
    }>;
  }
) {
  if (!isRestaurantModuleEnabled(user)) return false;
  const paid =
    order.payment_status === "paid" || order.payment_status === "partially_refunded";
  if (!paid || order.status === "cancelled" || order.status === "served" || order.payment_status === "refunded") {
    return false;
  }

  const hasRefundableItems = (order.items || []).some((item) => {
    const remaining =
      item.refundable_quantity ??
      Math.max(0, item.quantity - (item.refunded_quantity ?? 0));
    return remaining > 0;
  });
  if (order.items && order.items.length > 0 && !hasRefundableItems) {
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
