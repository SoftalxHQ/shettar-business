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
  if (isTauri()) {
    let container = document.getElementById('shettar-print-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'shettar-print-container';
      document.body.appendChild(container);
    }

    // Parse HTML to extract style and body separately
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const styles = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const bodyContent = doc.body.innerHTML;

    container.innerHTML = `<style>${styles}</style><div class="receipt-content">${bodyContent}</div>`;

    // Wait for images to load to avoid blank prints
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    // 4. LOCK the layout to prevent squeezing
    // We force the body to keep its current width during the print call
    const originalWidth = document.body.style.width;
    const originalPosition = document.body.style.position;
    const currentWidth = document.body.clientWidth;

    document.body.style.width = `${currentWidth}px`;
    document.body.style.position = 'relative';

    setTimeout(() => {
      window.print();

      // Cleanup after the system has captured the print content
      setTimeout(() => {
        document.body.style.width = originalWidth;
        document.body.style.position = originalPosition;
        if (container) container.innerHTML = '';
      }, 1000);
    }, 200);
  } else {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      };
    }
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
