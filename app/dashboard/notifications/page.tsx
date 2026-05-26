"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { usesRestaurantPortal } from "@/lib/portal-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-7 h-7" />
              Notifications
            </h1>
            <p className="text-muted-foreground text-sm">Alerts for your role and permissions</p>
            {unreadCount > 0 && (
              <p className="text-xs text-indigo-600 mt-1">{unreadCount} unread</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </div>

        {prefs && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prefs.sound_enabled ? (
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <Label>Sound alerts</Label>
              </div>
              <Switch checked={prefs.sound_enabled} onCheckedChange={toggleSound} />
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No notifications yet</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={cn(!n.read && "border-indigo-200 bg-indigo-50/40")}
              >
                <CardContent className="py-3">
                  <div className="flex justify-between gap-2">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    <span className="text-[10px] text-muted-foreground uppercase">{n.category}</span>
                  </div>
                  {n.message && (
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                    {!n.read && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-indigo-600 text-xs"
                        onClick={() => markOneRead(n.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="text-indigo-600 hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </LayoutShell>
  );
}
