"use client";

import { useEffect, useState } from "react";
import { useUpdater } from "@/lib/hooks/useUpdater";
import { desktopChangelogUrl, isTauri, openExternalUrl } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";

const dismissKey = (version: string) => `shettar-update-dismissed:${version}`;

function ctaLabel(installVia: ReturnType<typeof useUpdater>["installVia"], installing: boolean) {
  if (installing) {
    if (installVia === "desktop") return "Updating…";
    return "Opening…";
  }
  if (installVia === "play_store") return "Open Play Store";
  if (installVia === "apk") return "Download update";
  if (installVia === "app_store") return "Open App Store";
  return "Update now";
}

/** Fixed top-right card when a newer Shettar Business build is available. */
export function UpdateBanner() {
  const {
    available,
    version,
    progress,
    installing,
    error,
    installVia,
    installUpdate,
  } = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!version || typeof window === "undefined") {
      setDismissed(false);
      return;
    }
    setDismissed(sessionStorage.getItem(dismissKey(version)) === "1");
  }, [version]);

  useEffect(() => {
    if (installing && version && typeof window !== "undefined") {
      sessionStorage.removeItem(dismissKey(version));
      setDismissed(false);
    }
  }, [installing, version]);

  if (!isTauri()) return null;
  // Only show when there is a real update (or an in-progress install). Never for check failures.
  if (!available && !installing) return null;
  if (dismissed && !installing) return null;

  const changelogUrl = desktopChangelogUrl(version);
  const title = version
    ? `Version ${version} is available`
    : "Update available";

  const dismiss = () => {
    if (version && typeof window !== "undefined") {
      sessionStorage.setItem(dismissKey(version), "1");
    }
    setDismissed(true);
  };

  const showDesktopProgress = installing && installVia === "desktop";

  return (
    <div
      className="fixed top-4 right-4 z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-tight">{title}</p>
        {!installing ? (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss update"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {version ? (
        <button
          type="button"
          onClick={() => void openExternalUrl(changelogUrl)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 underline-offset-2 hover:underline"
        >
          View changelog
          <ExternalLink className="h-3 w-3" />
        </button>
      ) : null}

      {installVia === "apk" ? (
        <p className="mt-1.5 text-xs text-slate-500">
          Downloads the APK — allow installs from this source if prompted.
        </p>
      ) : null}
      {installVia === "play_store" ? (
        <p className="mt-1.5 text-xs text-slate-500">Opens Google Play to install the update.</p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {showDesktopProgress ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">Downloading… {progress}%</p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-2">
        {!installing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg px-2.5 text-slate-600"
            onClick={dismiss}
          >
            Later
          </Button>
        ) : null}
        {available || installing ? (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700"
            disabled={installing || !available}
            onClick={() => void installUpdate()}
          >
            {ctaLabel(installVia, installing)}
            {showDesktopProgress ? ` ${progress}%` : ""}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
