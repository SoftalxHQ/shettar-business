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
