import {
  detectOs,
  otherDesktopDownloads,
  preferMacInstaller,
  primaryDesktopDownload,
} from "@/lib/desktop-download"

describe("desktop-download helpers", () => {
  const installers = {
    windows: "https://cdn.example/windows.exe",
    macos_arm: "https://cdn.example/mac-arm.dmg",
    macos_x64: "https://cdn.example/mac-intel.dmg",
    linux_deb: "https://cdn.example/linux.deb",
    linux: "https://cdn.example/linux.AppImage",
  }

  it("detects OS from user agent", () => {
    expect(detectOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows")
    expect(detectOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("macos")
    expect(detectOs("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux")
    expect(detectOs("")).toBe("unknown")
  })

  it("prefers Apple Silicon macOS installers", () => {
    expect(preferMacInstaller(installers)).toBe(installers.macos_arm)
    expect(preferMacInstaller({ macos_x64: installers.macos_x64 })).toBe(installers.macos_x64)
  })

  it("picks a primary download for the current OS", () => {
    expect(primaryDesktopDownload(installers, "windows")?.url).toBe(installers.windows)
    expect(primaryDesktopDownload(installers, "macos")?.url).toBe(installers.macos_arm)
    expect(primaryDesktopDownload(installers, "linux")?.url).toBe(installers.linux_deb)
  })

  it("lists other platforms excluding the primary URL", () => {
    const primary = primaryDesktopDownload(installers, "windows")
    const others = otherDesktopDownloads(installers, primary?.url)
    expect(others.map((link) => link.url)).not.toContain(installers.windows)
    expect(others.length).toBe(4)
  })
})
