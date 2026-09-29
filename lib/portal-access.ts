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

/** Permissions included in the Front Desk preset. Anything else is extra access. */
const FRONT_DESK_PERMISSIONS = new Set([
  "rooms.view",
  "bookings.view",
  "bookings.create",
  "bookings.edit",
  "bookings.checkin_checkout",
]);

export function hasAccessBeyondFrontDesk(user: User | null): boolean {
  if (!user || user.role !== "staff" || !user.permissions) return false;

  for (const [category, actions] of Object.entries(user.permissions)) {
    if (!actions || typeof actions !== "object") continue;
    for (const [action, enabled] of Object.entries(actions)) {
      if (enabled === true && !FRONT_DESK_PERMISSIONS.has(`${category}.${action}`)) {
        return true;
      }
    }
  }
  return false;
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
  if (user?.role === "admin" || user?.role === "manager") return "/dashboard/business";
  return "/dashboard";
}

/** Who may open the thermal printer setup page. */
export function canConfigurePrinter(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.permissions?.settings?.view) return true;
  const bookings = user.permissions?.bookings;
  if (bookings?.view || bookings?.checkin_checkout) return true;
  const restaurant = user.permissions?.restaurant;
  return !!(restaurant?.view || restaurant?.create_orders || restaurant?.kitchen);
}

/** Admin / settings users see cash drawer and the settings back link. */
export function usesFullPrinterSettings(user: User | null): boolean {
  if (!user) return false;
  return user.role === "admin" || !!user.permissions?.settings?.view;
}

/** Where to send someone who opened a restaurant screen they cannot use. */
export function restaurantAccessDeniedPath(user: User | null): string {
  if (user?.role === "admin" || user?.role === "manager") return "/dashboard/business";
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
