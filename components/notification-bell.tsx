"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchNotificationPreferences,
  fetchStaffNotifications,
  markNotificationsRead,
  subscribeUserNotifications,
  type StaffNotification,
  type StaffNotificationCablePayload,
} from "@/lib/notifications-api";
import {
  isNotificationSoundEnabled,
  playNotificationTone,
  setNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { resolveBusinessId } from "@/lib/restaurant-api";
import { notify as nativeNotify } from "@/lib/tauri";
import { toast } from "sonner";

export function NotificationBell({ businessId }: { businessId: string | null }) {
  const bid = resolveBusinessId(businessId);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!bid) return;
    try {
      const [data, p] = await Promise.all([
        fetchStaffNotifications(bid),
        fetchNotificationPreferences(bid),
      ]);
      setNotifications(data.notifications.slice(0, 8));
      setUnreadCount(data.unread_count);
      setNotificationSoundEnabled(p.sound_enabled !== false);
    } catch {
      /* silent on poll failure */
    }
  }, [bid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onNotification = (msg: StaffNotificationCablePayload) => {
      const title = msg.title;
      const body = msg.message || "";
      toast.info(title, { description: body || undefined });
      if (isNotificationSoundEnabled()) void playNotificationTone();
      void nativeNotify(title, body);
      load();
    };

    return subscribeUserNotifications(onNotification);
  }, [load]);

  const markAllRead = async () => {
    if (!bid) return;
    try {
      await markNotificationsRead(bid);
      load();
    } catch {
      toast.error("Failed to mark read");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start gap-1 p-3 cursor-default"
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.read && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
                {n.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-center justify-center text-indigo-600 cursor-pointer"
          onClick={() => markAllRead()}
        >
          Mark all read
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-center justify-center text-indigo-600">
          <Link href="/dashboard/notifications">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
