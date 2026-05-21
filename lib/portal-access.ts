import type { User } from "@/lib/mock-auth";
import { isRestaurantModuleEnabled } from "@/lib/restaurant-access";
import {
  canCreateRestaurantOrders,
  canManageRestaurantMenu,
  canUseKitchenDisplay,
  canViewRestaurant,
} from "@/lib/restaurant-access";

function hasRestaurantAccess(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const r = user.permissions?.restaurant;
  return !!(
    r?.view ||
    r?.manage_menu ||
    r?.create_orders ||
    r?.kitchen
  );
}

function hasFrontDeskAccess(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  const b = user.permissions?.bookings;
  return !!(b?.view || b?.checkin_checkout);
}

export function usesRestaurantPortal(user: User | null): boolean {
  if (!user || !isRestaurantModuleEnabled(user)) return false;
  if (user.role === "admin" || user.role === "manager") return false;
  if (!hasRestaurantAccess(user)) return false;
  return !hasFrontDeskAccess(user);
}

export function getDefaultDashboardPath(user: User | null): string {
  if (usesRestaurantPortal(user)) return "/dashboard/restaurant";
  return "/dashboard";
}

export function getRestaurantNavItems(user: User | null) {
  const items: { name: string; href: string; tab: string }[] = [];
  if (canCreateRestaurantOrders(user) || canViewRestaurant(user)) {
    items.push({ name: "Orders", href: "/dashboard/restaurant/orders", tab: "orders" });
  }
  if (canUseKitchenDisplay(user)) {
    items.push({ name: "Kitchen", href: "/dashboard/restaurant/kitchen", tab: "kitchen" });
  }
  if (canManageRestaurantMenu(user) || canViewRestaurant(user)) {
    items.push({ name: "Menu", href: "/dashboard/restaurant/menu", tab: "menu" });
  }
  return items;
}
