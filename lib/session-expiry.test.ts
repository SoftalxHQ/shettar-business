import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}))

import { toast } from "sonner"
import {
  SESSION_EXPIRED_TOAST_ID,
  isSessionExpiryHandled,
  notifySessionExpired,
  resetSessionExpiryGuard,
} from "@/lib/session-expiry"

describe("notifySessionExpired", () => {
  beforeEach(() => {
    resetSessionExpiryGuard()
    vi.mocked(toast.error).mockClear()
  })

  it("toasts once across concurrent 401s", () => {
    expect(notifySessionExpired()).toBe(true)
    expect(notifySessionExpired()).toBe(false)
    expect(notifySessionExpired()).toBe(false)
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith("Session expired. Please login again.", {
      id: SESSION_EXPIRED_TOAST_ID,
    })
    expect(isSessionExpiryHandled()).toBe(true)
  })

  it("allows another toast after login resets the guard", () => {
    notifySessionExpired()
    resetSessionExpiryGuard()
    expect(notifySessionExpired()).toBe(true)
    expect(toast.error).toHaveBeenCalledTimes(2)
  })
})
