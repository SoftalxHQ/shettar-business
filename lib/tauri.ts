import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { scan } from '@tauri-apps/plugin-barcode-scanner';

declare global {
  interface Window {
    __TAURI_INTERNALS__: any;
  }
}

export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
};

export type DeviceLocationFailureReason =
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

export type DeviceLocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: DeviceLocationFailureReason };

const browserGeolocationErrorReason = (code?: number): DeviceLocationFailureReason => {
  if (code === 1) return 'denied';
  if (code === 2) return 'unavailable';
  if (code === 3) return 'timeout';
  return 'unknown';
};

const getBrowserLocation = (): Promise<DeviceLocationResult> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        resolve({ ok: false, reason: browserGeolocationErrorReason(error.code) });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
};

const getTauriMobileLocation = async (): Promise<DeviceLocationResult> => {
  try {
    const {
      checkPermissions: checkGeolocationPermissions,
      getCurrentPosition: getTauriCurrentPosition,
      requestPermissions: requestGeolocationPermissions,
    } = await import('@tauri-apps/plugin-geolocation');

    let permissions = await checkGeolocationPermissions();
    if (
      permissions.location === 'prompt' ||
      permissions.location === 'prompt-with-rationale'
    ) {
      permissions = await requestGeolocationPermissions(['location']);
    }

    if (permissions.location !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    const position = await getTauriCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return {
      ok: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.error('Tauri geolocation failed', error);
    return { ok: false, reason: 'unknown' };
  }
};

export const getDeviceLocation = async (): Promise<DeviceLocationResult> => {
  if (isTauri()) {
    const { type } = await import('@tauri-apps/plugin-os');
    const osType = type();

    // Official geolocation plugin is iOS/Android only.
    if (osType === 'ios' || osType === 'android') {
      return getTauriMobileLocation();
    }

    // Desktop: native OS location via Rust (Core Location / Windows / GeoClue).
    return getTauriDesktopLocation();
  }

  return getBrowserLocation();
};

const getTauriDesktopLocation = async (): Promise<DeviceLocationResult> => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const position = await invoke<{ latitude: number; longitude: number }>(
      'get_desktop_location',
    );
    return {
      ok: true,
      latitude: position.latitude,
      longitude: position.longitude,
    };
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String((error as { message: unknown }).message)
            : '';

    const reason = message.trim().toLowerCase();

    // User explicitly denied — don't mask with a browser prompt.
    if (reason === 'denied') {
      return { ok: false, reason: 'denied' };
    }

    // Native path unavailable (common in `tauri dev` without an .app Info.plist),
    // timed out waiting for Core Location, or OS services unavailable — try WebView.
    if (
      reason === 'unavailable' ||
      reason === 'timeout' ||
      reason === 'unsupported' ||
      reason === 'unknown' ||
      reason.length > 0
    ) {
      console.warn('Native desktop location failed, falling back to browser', reason || error);
      return getBrowserLocation();
    }

    console.error('Desktop geolocation failed', error);
    return getBrowserLocation();
  }
};

export const setupNativeWindow = async () => {
  if (!isTauri()) return;

  try {
    // Only Android/iOS need edge-to-edge safe-area floors — never pad desktop Tauri.
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
    const isMobileOs = /Android|iPhone|iPad|iPod/i.test(ua)
    if (!isMobileOs) {
      document.documentElement.classList.remove("native-edge")
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window")
        await getCurrentWindow().setTheme("light")
      } catch {
        // Window theme permission/platform — title stays on the system default.
      }
      return
    }
    document.documentElement.classList.add("native-edge")
  } catch (err) {
    console.warn("[tauri] setupNativeWindow failed", err);
  }
};

export const notify = async (title: string, body: string) => {
  if (isTauri()) {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title, body });
    }
  } else {
    // Fallback to browser notifications or toast
    console.log('Notification:', title, body);
  }
};

export const nativeScan = async () => {
  if (isTauri()) {
    try {
      const result = await scan();
      return result.content;
    } catch (error) {
      console.error('Scan failed', error);
      return null;
    }
  }
  return null;
};

export const printHtml = async (html: string) => {
  // Use window.print() on a scoped #shettar-print-root. Tauri/macOS silently
  // no-ops iframe.contentWindow.print(); window.print() works with allow-print.
  // Receipt styles must target .shettar-receipt-sheet (not html/body) so the
  // live app layout is never forced to 58mm.
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const existing = document.getElementById("shettar-print-root");
  if (existing) existing.remove();

  const root = document.createElement("div");
  root.id = "shettar-print-root";
  root.setAttribute("aria-hidden", "true");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const styles = Array.from(doc.querySelectorAll("style"))
    .map((el) => el.outerHTML)
    .join("");
  const bodyHtml = doc.body?.innerHTML ?? html;
  const hasSheet = /class=["'][^"']*shettar-receipt-sheet/.test(bodyHtml);
  root.innerHTML = hasSheet
    ? `${styles}${bodyHtml}`
    : `${styles}<div class="shettar-receipt-sheet">${bodyHtml}</div>`;

  document.body.appendChild(root);
  document.body.classList.add("shettar-printing");

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  let cleaned = false;
  let afterPrintTimer: ReturnType<typeof setTimeout> | null = null;
  const printMql =
    typeof window.matchMedia === "function" ? window.matchMedia("print") : null;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (afterPrintTimer != null) {
      clearTimeout(afterPrintTimer);
      afterPrintTimer = null;
    }
    window.removeEventListener("afterprint", onAfterPrint);
    if (printMql) {
      if (typeof printMql.removeEventListener === "function") {
        printMql.removeEventListener("change", onPrintMqlChange);
      } else if (typeof printMql.removeListener === "function") {
        printMql.removeListener(onPrintMqlChange);
      }
    }

    document.body.classList.remove("shettar-printing");
    if (document.body.contains(root)) {
      document.body.removeChild(root);
    }
  };

  /** WebView2 often fires afterprint as the dialog opens — debounce so isolation stays up. */
  const onAfterPrint = () => {
    if (afterPrintTimer != null) clearTimeout(afterPrintTimer);
    afterPrintTimer = setTimeout(() => {
      // Still in print media → dialog/preview still active; wait for matchMedia.
      if (printMql?.matches) return;
      cleanup();
    }, 400);
  };

  const onPrintMqlChange = () => {
    if (printMql && !printMql.matches) cleanup();
  };

  window.addEventListener("afterprint", onAfterPrint);
  if (printMql) {
    if (typeof printMql.addEventListener === "function") {
      printMql.addEventListener("change", onPrintMqlChange);
    } else if (typeof printMql.addListener === "function") {
      printMql.addListener(onPrintMqlChange);
    }
  }
  window.setTimeout(cleanup, 60_000);

  const waitTwoFrames = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  try {
    await waitTwoFrames();
    window.focus();
    window.print();
  } catch (error) {
    console.error("Print failed", error);
    cleanup();
  }
};

export const openExternalUrl = async (url: string): Promise<void> => {
  if (!url) return;

  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return;
    } catch (error) {
      console.error("Failed to open URL via Tauri shell:", error);
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

/** Public shettar-web changelog for the current desktop channel. */
export function desktopChangelogUrl(version: string | null | undefined): string {
  const webBase = resolveWebAppBaseUrl().replace(/\/$/, "");
  const path = `${webBase}/changelog`;
  if (!version) return path;

  const bare = version.replace(/^v/i, "").replace(/-staging$/i, "");
  return `${path}?v=${encodeURIComponent(bare)}`;
}

const STAGING_WEB_URL = "https://stg-web.shettar.com";
const PRODUCTION_WEB_URL = "https://shettar.com";

/** Coerce mistaken API/marketing hosts to the guest web app origin. */
function normalizeWebAppBaseUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (
      host === "stg.shettar.com" ||
      host === "api.stg.shettar.com" ||
      host === "www.stg.shettar.com"
    ) {
      return STAGING_WEB_URL;
    }
    if (host === "api-v1.shettar.com" || host === "api.shettar.com") {
      return PRODUCTION_WEB_URL;
    }
  } catch {
    // keep trimmed
  }
  return trimmed;
}

function resolveWebAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (explicit) return normalizeWebAppBaseUrl(explicit);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").toLowerCase();
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || "").toLowerCase();
  const isStaging =
    appEnv === "staging" ||
    /(?:^|\.)stg\.|\/\/api\.stg\.|staging/i.test(apiUrl);

  if (isStaging) return STAGING_WEB_URL;
  return PRODUCTION_WEB_URL;
}
