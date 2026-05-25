"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications-api";
import {
  isNotificationSoundEnabled,
  playNotificationTone,
  setNotificationSoundEnabled,
  subscribeNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { resolveBusinessId } from "@/lib/restaurant-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  businessId: string | null;
  className?: string;
};

export function NotificationSoundToggle({ businessId, className }: Props) {
  const bid = resolveBusinessId(businessId);
  const [enabled, setEnabled] = useState(isNotificationSoundEnabled);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeNotificationSoundEnabled(() => setEnabled(isNotificationSoundEnabled())), []);

  const loadPrefs = useCallback(async () => {
    if (!bid) return;
    try {
      const p = await fetchNotificationPreferences(bid);
      setPrefs(p);
      const on = p.sound_enabled !== false;
      setNotificationSoundEnabled(on);
      setEnabled(on);
    } catch {
      /* keep last known state */
    }
  }, [bid]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const toggle = async () => {
    if (!bid) return;
    const next = !enabled;
    setEnabled(next);
    setNotificationSoundEnabled(next);

    const base = prefs ?? { sound_enabled: true, categories: {} };
    const updated = { ...base, sound_enabled: next };
    setPrefs(updated);
    setSaving(true);
    try {
      await updateNotificationPreferences(bid, updated);
      if (next) await playNotificationTone();
    } catch {
      setEnabled(!next);
      setNotificationSoundEnabled(!next);
      toast.error("Failed to save sound preference");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={() => void toggle()}
      disabled={!bid || saving}
      title={enabled ? "Notification sound on" : "Notification sound muted"}
      aria-label={enabled ? "Mute notification sound" : "Enable notification sound"}
      aria-pressed={enabled}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5 text-indigo-600" />
      ) : (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      )}
    </Button>
  );
}
