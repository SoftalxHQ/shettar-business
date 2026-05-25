"use client";

import { NotificationBell } from "@/components/notification-bell";
import { NotificationSoundToggle } from "@/components/notification-sound-toggle";

type Props = {
  businessId: string | null;
  className?: string;
};

/** Sound toggle + notification bell for staff top bars (reception, F&B, restaurant). */
export function TopBarNotifications({ businessId, className }: Props) {
  return (
    <div className={className ?? "flex items-center gap-1 shrink-0"}>
      <NotificationSoundToggle businessId={businessId} />
      <NotificationBell businessId={businessId} />
    </div>
  );
}
