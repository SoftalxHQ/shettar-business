import os from "os"

/**
 * Origins allowed to load /_next/* in `next dev` (Next.js 16 blocks others with 403).
 * Tauri physical Android sets TAURI_DEV_HOST to your Mac LAN IP before beforeDevCommand.
 * We also include every non-internal IPv4 so IP changes / multi-homing still work.
 */
function lanDevOrigins() {
  const hosts = new Set()

  // Tauri Android WebView origin when using the mobile dev proxy
  hosts.add("tauri.localhost")

  const tauriHost = (process.env.TAURI_DEV_HOST || "").trim()
  if (tauriHost && tauriHost !== "0.0.0.0") {
    hosts.add(tauriHost)
  }

  const publicHost = (process.env.NEXT_PUBLIC_DEV_HOST || "").trim()
  if (publicHost) hosts.add(publicHost)

  for (const extra of (process.env.SHEETTAR_DEV_ORIGINS || "").split(",")) {
    const h = extra.trim()
    if (h) hosts.add(h)
  }

  try {
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const net of nets || []) {
        if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
          hosts.add(net.address)
        }
      }
    }
  } catch {
    /* ignore — sandbox / restricted environments */
  }

  return [...hosts]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: lanDevOrigins(),
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@softalxhq/location-selector"],
  // Tauri embeds static `out/`; Docker/Kamal needs Next standalone (`DOCKER_BUILD=1`).
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "https",
        hostname: "abri-dreams.s3.eu-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "s3.*.amazonaws.com",
      },
    ],
  },
}

export default nextConfig
