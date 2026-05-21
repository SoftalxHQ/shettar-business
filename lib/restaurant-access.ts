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
