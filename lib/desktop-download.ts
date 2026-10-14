export type DesktopInstallers = {
  windows?: string | null
  macos_x64?: string | null
  macos_arm?: string | null
  linux?: string | null
  linux_deb?: string | null
}

export type LatestDesktopRelease = {
  version: string
  channel: string
  notes?: string | null
  published_at?: string | null
  installers: DesktopInstallers
}

export type DetectedOs = "windows" | "macos" | "linux" | "unknown"

export type DesktopDownloadLink = {
  label: string
  url: string
  platform: "windows" | "macos" | "linux"
}

export function desktopReleaseChannel(): "staging" | "production" {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || "").toLowerCase()
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").toLowerCase()
  if (appEnv === "staging" || /(?:^|\.)stg\.|staging/i.test(apiUrl)) {
    return "staging"
  }
  return "production"
}

export function detectOs(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): DetectedOs {
  if (/Windows/i.test(userAgent)) return "windows"
  if (/Mac/i.test(userAgent)) return "macos"
  if (/Linux|X11/i.test(userAgent)) return "linux"
  return "unknown"
}

export function preferMacInstaller(installers: DesktopInstallers): string | null {
  if (installers.macos_arm) return installers.macos_arm
  if (installers.macos_x64) return installers.macos_x64
  return null
}

export function primaryDesktopDownload(
  installers: DesktopInstallers,
  os: DetectedOs
): DesktopDownloadLink | null {
  if (os === "windows" && installers.windows) {
    return { label: "Download for Windows", url: installers.windows, platform: "windows" }
  }
  if (os === "macos") {
    const url = preferMacInstaller(installers)
    if (url) return { label: "Download for macOS", url, platform: "macos" }
  }
  if (os === "linux") {
    const linuxUrl = installers.linux_deb || installers.linux
    if (linuxUrl) {
      return {
        label: installers.linux_deb ? "Download for Linux (.deb)" : "Download for Linux (.AppImage)",
        url: linuxUrl,
        platform: "linux",
      }
    }
  }
  if (installers.windows) {
    return { label: "Download for Windows", url: installers.windows, platform: "windows" }
  }
  const mac = preferMacInstaller(installers)
  if (mac) return { label: "Download for macOS", url: mac, platform: "macos" }
  if (installers.linux_deb) {
    return { label: "Download for Linux (.deb)", url: installers.linux_deb, platform: "linux" }
  }
  if (installers.linux) {
    return { label: "Download for Linux (.AppImage)", url: installers.linux, platform: "linux" }
  }
  return null
}

export function otherDesktopDownloads(
  installers: DesktopInstallers,
  primaryUrl?: string | null
): DesktopDownloadLink[] {
  const links: DesktopDownloadLink[] = []
  if (installers.windows) {
    links.push({ label: "Windows (.exe)", url: installers.windows, platform: "windows" })
  }
  if (installers.macos_arm) {
    links.push({
      label: "macOS Apple Silicon (.dmg)",
      url: installers.macos_arm,
      platform: "macos",
    })
  }
  if (installers.macos_x64) {
    links.push({ label: "macOS Intel (.dmg)", url: installers.macos_x64, platform: "macos" })
  }
  if (installers.linux_deb) {
    links.push({ label: "Linux (.deb)", url: installers.linux_deb, platform: "linux" })
  }
  if (installers.linux) {
    links.push({ label: "Linux (.AppImage)", url: installers.linux, platform: "linux" })
  }
  return links.filter((link) => link.url !== primaryUrl)
}

export async function fetchLatestDesktopRelease(): Promise<LatestDesktopRelease> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")
  const channel = desktopReleaseChannel()
  const res = await fetch(`${apiBase}/api/v1/desktop_releases/latest?channel=${channel}`, {
    credentials: "include",
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || "No desktop release available yet")
  }
  const data = (await res.json()) as { release: LatestDesktopRelease }
  return data.release
}
