"use client";

import { useCallback, useEffect, useState } from "react";
import { isTauri, openExternalUrl } from "@/lib/tauri";

export type UpdateInstallVia = "desktop" | "play_store" | "apk" | "app_store";

export type UpdaterState = {
  available: boolean;
  version: string | null;
  notes: string | null;
  progress: number;
  installing: boolean;
  error: string | null;
  /** How "Update now" will apply the update (desktop plugin vs open store/APK). */
  installVia: UpdateInstallVia | null;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
};

type UpdateHandle = {
  version: string;
  body?: string | null;
  downloadAndInstall: (
    onEvent?: (event: {
      event: string;
      data?: { contentLength?: number; chunkLength?: number };
    }) => void
  ) => Promise<void>;
};

const RECHECK_INTERVAL_MS = 30 * 60 * 1000;
const ANDROID_PACKAGE_ID = "com.shettar.business";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) return record.message;
    if (typeof record.error === "string" && record.error) return record.error;
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

function isPluginMissingError(err: unknown): boolean {
  const msg = errorMessage(err, "").toLowerCase();
  return (
    msg.includes("plugin not found") ||
    msg.includes("not allowed") ||
    msg.includes("updater.check")
  );
}

function releaseChannel(): "staging" | "production" {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || "").toLowerCase();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").toLowerCase();
  if (appEnv === "staging" || /(?:^|\.)stg\.|staging/i.test(apiUrl)) {
    return "staging";
  }
  return "production";
}

/** Compare dotted semver (ignores leading v / -staging). Positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .replace(/-(staging|production)$/i, "")
      .split(/[.+-]/)
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function getOsType(): Promise<string> {
  try {
    const { type } = await import("@tauri-apps/plugin-os");
    return type();
  } catch {
    return "unknown";
  }
}

type MobileReleaseInstallers = {
  android_apk?: string | null;
  android_store?: string | null;
  ios_store?: string | null;
};

type MobileUpdate = {
  version: string;
  notes: string | null;
  url: string;
  via: Exclude<UpdateInstallVia, "desktop">;
};

function resolveAndroidUpdateUrl(installers: MobileReleaseInstallers): {
  url: string;
  via: "play_store" | "apk";
} | null {
  const store =
    installers.android_store?.trim() ||
    process.env.NEXT_PUBLIC_ANDROID_PLAY_URL?.trim() ||
    "";
  const apk = installers.android_apk?.trim() || "";

  // Prefer Play when explicitly configured; otherwise direct APK (sideload / enterprise).
  if (store) return { url: store, via: "play_store" };
  if (apk) return { url: apk, via: "apk" };
  return null;
}

async function checkMobileReleaseUpdate(os: "android" | "ios"): Promise<MobileUpdate | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const channel = releaseChannel();
  const res = await fetch(`${apiBase}/api/v1/desktop_releases/latest?channel=${channel}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    release?: {
      version?: string;
      notes?: string | null;
      installers?: MobileReleaseInstallers;
    };
  };
  const release = data.release;
  if (!release?.version) return null;

  const { getVersion } = await import("@tauri-apps/api/app");
  const current = await getVersion();
  if (compareSemver(release.version, current) <= 0) return null;

  const installers = release.installers || {};
  if (os === "android") {
    const resolved = resolveAndroidUpdateUrl(installers);
    if (!resolved) return null;
    return {
      version: release.version,
      notes: release.notes ?? null,
      url: resolved.url,
      via: resolved.via,
    };
  }

  const iosStore = installers.ios_store?.trim();
  if (!iosStore) return null;
  return {
    version: release.version,
    notes: release.notes ?? null,
    url: iosStore,
    via: "app_store",
  };
}

export function useUpdater(): UpdaterState {
  const [available, setAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installVia, setInstallVia] = useState<UpdateInstallVia | null>(null);
  const [updateHandle, setUpdateHandle] = useState<UpdateHandle | null>(null);
  const [mobileUpdateUrl, setMobileUpdateUrl] = useState<string | null>(null);

  const clearAvailable = useCallback(() => {
    setAvailable(false);
    setUpdateHandle(null);
    setMobileUpdateUrl(null);
    setInstallVia(null);
    setVersion(null);
    setNotes(null);
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const os = await getOsType();

      if (os === "android" || os === "ios") {
        const mobile = await checkMobileReleaseUpdate(os);
        if (!mobile) {
          clearAvailable();
          setError(null);
          return;
        }
        setUpdateHandle(null);
        setMobileUpdateUrl(mobile.url);
        setInstallVia(mobile.via);
        setVersion(mobile.version);
        setNotes(mobile.notes);
        setAvailable(true);
        setError(null);
        return;
      }

      // Desktop: official Tauri updater plugin
      const { check } = await import("@tauri-apps/plugin-updater");
      const result = await check();
      if (!result) {
        clearAvailable();
        setError(null);
        return;
      }
      setMobileUpdateUrl(null);
      setUpdateHandle(result as unknown as UpdateHandle);
      setInstallVia("desktop");
      setVersion(result.version);
      setNotes(result.body ?? null);
      setAvailable(true);
      setError(null);
    } catch (err) {
      if (isPluginMissingError(err)) {
        // Mobile/dev shells without the desktop plugin — ignore noise.
        clearAvailable();
        setError(null);
        return;
      }
      console.error("[updater] check failed", err);
      setError(errorMessage(err, "Update check failed"));
    }
  }, [clearAvailable]);

  const installUpdate = useCallback(async () => {
    if (!isTauri()) return;
    setInstalling(true);
    setError(null);

    try {
      if (mobileUpdateUrl) {
        let url = mobileUpdateUrl;
        // market:// opens the Play app when available; https is the fallback.
        if (
          installVia === "play_store" &&
          /play\.google\.com\/store\/apps\/details/i.test(url) &&
          !url.includes("id=")
        ) {
          url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;
        }
        await openExternalUrl(url);
        setInstalling(false);
        return;
      }

      let downloaded = 0;
      let total = 0;
      // Re-check so signed S3 URLs from the updates API are fresh.
      const { check } = await import("@tauri-apps/plugin-updater");
      const fresh = await check();
      if (!fresh) {
        clearAvailable();
        throw new Error("No update available to install");
      }
      const handle = fresh as unknown as UpdateHandle;
      setUpdateHandle(handle);
      setInstallVia("desktop");
      setVersion(fresh.version);
      setNotes(fresh.body ?? null);
      setAvailable(true);

      await handle.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data?.contentLength ?? 0;
          downloaded = 0;
          setProgress(0);
        } else if (event.event === "Progress") {
          downloaded += event.data?.chunkLength ?? 0;
          if (total > 0) {
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.error("[updater] install failed", err);
      setError(errorMessage(err, "Update install failed"));
      setInstalling(false);
    }
  }, [clearAvailable, installVia, mobileUpdateUrl]);

  useEffect(() => {
    void checkForUpdate();
    const id = window.setInterval(() => {
      void checkForUpdate();
    }, RECHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [checkForUpdate]);

  return {
    available,
    version,
    notes,
    progress,
    installing,
    error,
    installVia,
    checkForUpdate,
    installUpdate,
  };
}
