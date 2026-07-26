"use client";

import { useUpdater } from "@/lib/hooks/useUpdater";
import { isTauri } from "@/lib/tauri";
import { Button } from "@/components/ui/button";

/** In-app banner when a newer Shettar Business desktop build is available. */
export function UpdateBanner() {
  const { available, version, notes, progress, installing, error, installUpdate } = useUpdater();

  if (!isTauri() || !available) return null;

  return (
    <div className="mx-4 mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">
            Version {version} is available
          </p>
          {notes ? (
            <p className="mt-0.5 text-indigo-800/80 line-clamp-2 whitespace-pre-wrap">{notes}</p>
          ) : null}
          {error ? <p className="mt-1 text-red-600">{error}</p> : null}
          {installing ? (
            <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
          disabled={installing}
          onClick={() => void installUpdate()}
        >
          {installing ? `Updating… ${progress}%` : "Update now"}
        </Button>
      </div>
    </div>
  );
}
