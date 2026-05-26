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
  markNotificationRead,
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
import { useAuth } from "@/lib/auth-context";
import {
  canReceiveNotificationCategory,
  filterNotificationsForUser,
} from "@/lib/notification-access";
import { cn } from "@/lib/utils";

export function NotificationBell({ businessId }: { businessId: string | null }) {
  const { user } = useAuth();
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
      setNotifications(filterNotificationsForUser(user, data.notifications).slice(0, 8));
      setUnreadCount(data.unread_count);
      setNotificationSoundEnabled(p.sound_enabled !== false);
    } catch {
      /* silent on poll failure */
    }
  }, [bid, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onNotification = (msg: StaffNotificationCablePayload) => {
      if (user?.permissions && !canReceiveNotificationCategory(user, msg.category)) return;

      const actorId = msg.metadata?.actor_user_id;
      const isSelfAction =
        actorId != null && user?.id != null && Number(actorId) === Number(user.id);

      const title = msg.title;
      const body = msg.message || "";
      if (!isSelfAction) {
        toast.info(title, { description: body || undefined });
      }
      if (isNotificationSoundEnabled()) void playNotificationTone();
      if (!isSelfAction) void nativeNotify(title, body);
      load();
    };

    return subscribeUserNotifications(onNotification);
  }, [load, user]);

  const markAllRead = async () => {
    if (!bid) return;
    try {
      await markNotificationsRead(bid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed to mark read");
      load();
    }
  };

  const markOneRead = async (id: number) => {
    if (!bid) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await markNotificationRead(bid, id);
    } catch {
      toast.error("Failed to mark read");
      load();
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
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onSelect={() => {
                  if (!n.read) void markOneRead(n.id);
                }}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                  {!n.read && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
                {n.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                )}
                <div className="flex items-center justify-between w-full gap-2">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                  {!n.read && (
                    <span className="text-[10px] text-indigo-600 font-medium">Mark read</span>
                  )}
                </div>
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
