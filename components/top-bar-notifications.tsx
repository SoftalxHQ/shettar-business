"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationSoundToggle } from "@/components/notification-sound-toggle";
import { useAuth } from "@/lib/auth-context";
import { canConfigurePrinter } from "@/lib/portal-access";
import { cn } from "@/lib/utils";

type Props = {
  businessId: string | null;
  className?: string;
  collapsed?: boolean;
};

/** Sound toggle + printer shortcut + notification bell for staff top bars. */
export function TopBarNotifications({ businessId, className, collapsed = false }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const showPrinter = canConfigurePrinter(user);
  const printerActive = pathname?.startsWith("/dashboard/business/settings/printer");

  return (
    <div className={cn("flex shrink-0 items-center gap-1", collapsed && "flex-col gap-0", className)}>
      <NotificationSoundToggle businessId={businessId} className={collapsed ? "h-8 w-8" : undefined} />
      {showPrinter && (
        <Button variant="ghost" size="icon" asChild className={cn("relative", collapsed && "h-8 w-8")}>
          <Link
            href="/dashboard/business/settings/printer"
            title="Printer"
            aria-label="Printer"
          >
            <Printer
              className={cn(
                "w-5 h-5",
                printerActive ? "text-indigo-600" : "text-muted-foreground"
              )}
            />
          </Link>
        </Button>
      )}
      <NotificationBell businessId={businessId} className={collapsed ? "h-8 w-8" : undefined} />
    </div>
  );
}
