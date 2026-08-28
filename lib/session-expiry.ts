import { toast } from "sonner"

export const SESSION_EXPIRED_TOAST_ID = "session-expired"

let handled = false

/** First caller shows the toast; later 401s in the same expiry are no-ops. */
export function notifySessionExpired(): boolean {
  if (handled) return false
  handled = true
  toast.error("Session expired. Please login again.", { id: SESSION_EXPIRED_TOAST_ID })
  return true
}

export function resetSessionExpiryGuard() {
  handled = false
}

export function isSessionExpiryHandled() {
  return handled
}
