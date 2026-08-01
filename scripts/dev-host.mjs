#!/usr/bin/env node
/**
 * Next dev server for Tauri Android/iOS.
 * - Binds 0.0.0.0:3001
 * - Uses webpack (Turbopack HMR over http://tauri.localhost leaves a blank WebView)
 * - Publishes NEXT_PUBLIC_DEV_HOST so the WebView can rewrite HMR sockets to the LAN IP
 */
import { spawn } from "node:child_process"
import os from "node:os"
import { createRequire } from "node:module"

const PORT = process.env.PORT || "3001"

function lanHosts() {
  try {
    const hosts = []
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const net of nets || []) {
        if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
          hosts.push(net.address)
        }
      }
    }
    return hosts
  } catch {
    return []
  }
}

const lan = lanHosts()
const tauriHost = (process.env.TAURI_DEV_HOST || "").trim()
const publicHost =
  (tauriHost && tauriHost !== "localhost" && tauriHost !== "127.0.0.1" && tauriHost !== "0.0.0.0"
    ? tauriHost
    : "") || lan[0] || ""

const origins = [...new Set([tauriHost, publicHost, "tauri.localhost", ...lan].filter(Boolean))]

console.log("[shettar-business] Android/iOS dev host")
console.log(`  bind:              0.0.0.0:${PORT}`)
console.log(`  bundler:           webpack (required for Tauri WebView)`)
console.log(`  TAURI_DEV_HOST:    ${tauriHost || "(unset)"}`)
console.log(`  NEXT_PUBLIC_DEV_HOST: ${publicHost || "(unset)"}`)
console.log(`  allowed origins:`)
for (const h of origins) console.log(`    - ${h}`)
if (publicHost) {
  console.log(`  direct URL:        http://${publicHost}:${PORT}`)
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next")
const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", "0.0.0.0", "-p", PORT, "--webpack"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_DEV_HOST: publicHost,
      // Ensure next.config allowedDevOrigins sees the same host
      TAURI_DEV_HOST: tauriHost || publicHost || process.env.TAURI_DEV_HOST || "",
      SHEETTAR_DEV_ORIGINS: ["tauri.localhost", ...origins].join(","),
    },
  }
)

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
