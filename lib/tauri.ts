import { getCurrentWindow } from '@tauri-apps/api/window';
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

    // The geolocation plugin is only implemented on iOS/Android.
    // Desktop Tauri uses the WebView geolocation API instead.
    if (osType === 'ios' || osType === 'android') {
      return getTauriMobileLocation();
    }
  }

  return getBrowserLocation();
};

export const setupNativeWindow = async () => {
  if (isTauri()) {
    const appWindow = getCurrentWindow();
    // Example: make window visible only after it's ready to avoid flicker
    // await appWindow.show();
    console.log('Running in Tauri');
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
  // Always print from an isolated iframe so receipt CSS (58mm html/body rules)
  // never touches the live app layout. This avoids the Tauri desktop "squash".
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const images = Array.from(doc.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  const cleanup = () => {
    win.removeEventListener("afterprint", cleanup);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  win.addEventListener("afterprint", cleanup);

  // Fallback cleanup if afterprint does not fire (some WebViews).
  window.setTimeout(cleanup, 60_000);

  try {
    win.focus();
    win.print();
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

function resolveWebAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").toLowerCase();
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || "").toLowerCase();
  const isStaging =
    appEnv === "staging" ||
    /(?:^|\.)stg\.|\/\/api\.stg\.|staging/i.test(apiUrl);

  if (isStaging) return "https://stg-web.shettar.com";
  return "https://shettar.com";
}
