"use client";

import { useUpdater } from "@/lib/hooks/useUpdater";
import { desktopChangelogUrl, isTauri, openExternalUrl } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

/** In-app banner when a newer Shettar Business desktop build is available. */
export function UpdateBanner() {
  const { available, version, progress, installing, error, installUpdate } = useUpdater();

  if (!isTauri() || !available) return null;

  const changelogUrl = desktopChangelogUrl(version);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">
            Version {version} is available
          </p>
          <button
            type="button"
            onClick={() => void openExternalUrl(changelogUrl)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 underline-offset-2 hover:underline"
          >
            View changelog
            <ExternalLink className="h-3 w-3" />
          </button>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
          className="shrink-0 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700"
          disabled={installing}
          onClick={() => void installUpdate()}
        >
          {installing ? `Updating… ${progress}%` : "Update now"}
        </Button>
      </div>
    </div>
  );
}
