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
      setError(err instanceof Error ? err.message : "Update check failed");
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateHandle) return;
    setInstalling(true);
    setError(null);
    let downloaded = 0;
    let total = 0;
    try {
      await updateHandle.downloadAndInstall((event) => {
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
      setError(err instanceof Error ? err.message : "Update install failed");
      setInstalling(false);
    }
  }, [updateHandle]);

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
