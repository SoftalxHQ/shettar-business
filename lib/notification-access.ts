import type { User } from "@/lib/mock-auth";

export const NOTIFICATION_CATEGORY_RESTAURANT = "restaurant_orders";
export const NOTIFICATION_CATEGORY_BOOKINGS = "bookings";

export function canReceiveRestaurantNotifications(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  const r = user.permissions?.restaurant;
  return !!(r?.view || r?.create_orders || r?.kitchen);
}

export function canReceiveBookingNotifications(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  const b = user.permissions?.bookings;
  return !!(b?.view || b?.create || b?.checkin_checkout);
}

export function canReceiveNotificationCategory(
  user: User | null,
  category: string | undefined
): boolean {
  if (!category) return true;
  // Backend already filters at delivery; don't block while auth/permissions hydrate.
  if (!user?.permissions) return true;
  if (category === NOTIFICATION_CATEGORY_RESTAURANT) {
    return canReceiveRestaurantNotifications(user);
  }
  if (category === NOTIFICATION_CATEGORY_BOOKINGS) {
    return canReceiveBookingNotifications(user);
  }
  return false;
}

export function filterNotificationsForUser<T extends { category: string }>(
  user: User | null,
  notifications: T[]
): T[] {
  return notifications.filter((n) => canReceiveNotificationCategory(user, n.category));
}

export function countUnreadForUser<T extends { category: string; read: boolean }>(
  user: User | null,
  notifications: T[]
): number {
  return filterNotificationsForUser(user, notifications).filter((n) => !n.read).length;
}
