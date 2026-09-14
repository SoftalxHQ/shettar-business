import type React from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { UpdateCardHost } from "@/components/update-card-host";
import { NativeSafeArea } from "@/components/native-safe-area";
import { ReduxProvider } from "@/lib/store/provider";
import { tauriHmrBridgeInlineScript } from "@/lib/tauri-hmr-bridge-script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shettar Business | Hotel Management",
  description: "Professional hotel business management platform",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shettar Business",
  },
};

export const viewport: Viewport = {
  // viewport-fit=cover is required for env(safe-area-inset-*) on iOS/Android.
  // Do not lock scale here — that would hurt desktop browser accessibility.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const devHost = (process.env.NEXT_PUBLIC_DEV_HOST || "").trim();
  const hmrBridge =
    process.env.NODE_ENV === "development" && devHost
      ? tauriHmrBridgeInlineScript(devHost)
      : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased text-slate-800 bg-slate-50`}>
        {/* Must be first: patch WebSocket before Next HMR client loads (Tauri Android blank screen). */}
        {hmrBridge ? (
          <script dangerouslySetInnerHTML={{ __html: hmrBridge }} />
        ) : null}
        <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
        <ReduxProvider>
          <NativeSafeArea />
          {children}
          <UpdateCardHost />
          <Toaster position="top-center" richColors />
        </ReduxProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
