import type { RestaurantOrder, RestaurantOrderItem } from "@/lib/restaurant-api";
import { cn } from "@/lib/utils";

export function RestaurantOrderItemLine({
  item,
  showPrice = false,
  className,
}: {
  item: RestaurantOrderItem;
  showPrice?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className={showPrice ? "flex justify-between gap-2" : undefined}>
        <span className={showPrice ? "truncate font-medium" : "font-medium"}>
          {item.quantity}× {item.name}
        </span>
        {showPrice && (
          <span className="shrink-0">₦{item.line_total.toLocaleString()}</span>
        )}
      </div>
      {item.notes?.trim() && (
        <p className="text-xs italic text-muted-foreground pl-1">↳ {item.notes.trim()}</p>
      )}
    </div>
  );
}

export function RestaurantOrderNotes({
  order,
  className,
}: {
  order: Pick<RestaurantOrder, "notes">;
  className?: string;
}) {
  const note = order.notes?.trim();
  if (!note) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950",
        className
      )}
    >
      <span className="font-medium">Note:</span> {note}
    </div>
  );
}
