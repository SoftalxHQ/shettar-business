import type { MenuItem } from "@/lib/restaurant-api";

export type MenuAvailabilityUpdate = {
  item?: MenuItem;
  available?: boolean;
  item_name?: string;
};

const listeners = new Set<(update: MenuAvailabilityUpdate) => void>();

/** Notify all mounted restaurant pages (orders, menu, kitchen) of a menu availability change. */
export function notifyMenuAvailabilityChange(update: MenuAvailabilityUpdate) {
  listeners.forEach((fn) => {
    try {
      fn(update);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeMenuAvailabilityChange(
  handler: (update: MenuAvailabilityUpdate) => void
) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function resolveAvailability(update: MenuAvailabilityUpdate): boolean | undefined {
  if (typeof update.available === "boolean") return update.available;
  if (typeof update.item?.available === "boolean") return update.item.available;
  return undefined;
}
