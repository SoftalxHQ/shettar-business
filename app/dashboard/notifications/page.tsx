"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { usesRestaurantPortal } from "@/lib/portal-access";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { resolveBusinessId } from "@/lib/restaurant-api";
import {
  fetchNotificationPreferences,
  fetchStaffNotifications,
  markNotificationRead,
  markNotificationsRead,
  subscribeUserNotifications,
  updateNotificationPreferences,
  type NotificationPreferences,
  type StaffNotification,
} from "@/lib/notifications-api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  playNotificationTone,
  setNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { filterNotificationsForUser } from "@/lib/notification-access";

export default function NotificationsPage() {
  const { user, businessId } = useAuth();
  const restaurantPortal = usesRestaurantPortal(user);
  const LayoutShell = restaurantPortal ? RestaurantLayoutWrapper : DashboardLayout;
  const layoutTab = restaurantPortal ? "restaurant" : "notifications";
  const bid = resolveBusinessId(businessId);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!bid) return;
    setLoading(true);
    try {
      const [data, p] = await Promise.all([
        fetchStaffNotifications(bid),
        fetchNotificationPreferences(bid),
      ]);
      setNotifications(filterNotificationsForUser(user, data.notifications));
      setUnreadCount(data.unread_count);
      setPrefs(p);
      setNotificationSoundEnabled(p.sound_enabled !== false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [bid, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeUserNotifications(() => {
      load();
    });
  }, [load]);

  const toggleSound = async (enabled: boolean) => {
    if (!bid || !prefs) return;
    const next = { ...prefs, sound_enabled: enabled };
    setPrefs(next);
    setNotificationSoundEnabled(enabled);
    try {
      await updateNotificationPreferences(bid, next);
      if (enabled) await playNotificationTone();
    } catch {
      setNotificationSoundEnabled(!enabled);
      toast.error("Failed to save preferences");
    }
  };

  const markAllRead = async () => {
    if (!bid) return;
    try {
      await markNotificationsRead(bid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed");
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
    <LayoutShell activeTab={layoutTab}>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-500">
              Alerts for your role and permissions
              {unreadCount > 0 && (
                <span className="ml-1.5 text-slate-700">· {unreadCount} unread</span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="h-8 rounded-lg border-slate-200 text-xs"
          >
            Mark all read
          </Button>
        </div>

        {prefs && (
          <div className="flex shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              {prefs.sound_enabled ? (
                <Volume2 className="h-3.5 w-3.5 text-slate-500" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
              )}
              <Label className="text-xs text-slate-700">Sound alerts</Label>
            </div>
            <Switch checked={prefs.sound_enabled} onCheckedChange={toggleSound} />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner size={28} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                <Bell className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No notifications yet</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-slate-100 px-3.5 py-2.5 last:border-b-0",
                      !n.read && "border-l-2 border-l-indigo-500 bg-slate-50/60",
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <p className={cn("text-xs text-slate-900", !n.read && "font-semibold")}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                        {n.category}
                      </span>
                    </div>
                    {n.message && (
                      <p className="mt-1 text-xs text-slate-500">{n.message}</p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                          onClick={() => markOneRead(n.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
