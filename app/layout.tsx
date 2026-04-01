import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { ReduxProvider } from "@/lib/store/provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hotel Management System",
  description: "Professional hotel business management platform",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-slate-800 bg-slate-50`}>
        <ReduxProvider>{children}</ReduxProvider>
        <Toaster position="top-center" richColors />
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
