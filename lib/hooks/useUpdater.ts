"use client";

import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@/lib/tauri";

export type UpdaterState = {
  available: boolean;
  version: string | null;
  notes: string | null;
  progress: number;
  installing: boolean;
  error: string | null;
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

export function useUpdater(): UpdaterState {
  const [available, setAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateHandle, setUpdateHandle] = useState<UpdateHandle | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const result = await check();
      if (!result) {
        setAvailable(false);
        setUpdateHandle(null);
        return;
      }
      setUpdateHandle(result as unknown as UpdateHandle);
      setVersion(result.version);
      setNotes(result.body ?? null);
      setAvailable(true);
      setError(null);
    } catch (err) {
      console.error("[updater] check failed", err);
      setError(errorMessage(err, "Update check failed"));
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!isTauri()) return;
    setInstalling(true);
    setError(null);
    let downloaded = 0;
    let total = 0;
    try {
      // Re-check so signed S3 URLs from the updates API are fresh.
      const { check } = await import("@tauri-apps/plugin-updater");
      const fresh = await check();
      if (!fresh) {
        setAvailable(false);
        setUpdateHandle(null);
        throw new Error("No update available to install");
      }
      const handle = fresh as unknown as UpdateHandle;
      setUpdateHandle(handle);
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
  }, []);

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
    checkForUpdate,
    installUpdate,
  };
}
