const ACTION_CABLE_PROTOCOLS = ["actioncable-v1-json", "actioncable-unsupported"]

/** Prefix so ActionCable can still select actioncable-v1-json during the handshake. */
export const CABLE_JWT_PROTOCOL_PREFIX = "jwt."

export function isUsableJwt(token?: string | null): token is string {
  return typeof token === "string" && token.includes(".")
}

export function cableUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")
  return `${base.replace(/^http/, "ws")}/cable`
}

export function cableProtocols(token?: string | null): string[] {
  if (!isUsableJwt(token)) return ACTION_CABLE_PROTOCOLS
  return [...ACTION_CABLE_PROTOCOLS, `${CABLE_JWT_PROTOCOL_PREFIX}${token}`]
}

/** WebSocket cannot set Authorization; send the staff JWT as an extra subprotocol. */
export function openCableWebSocket(token?: string | null): WebSocket {
  return new WebSocket(cableUrl(), cableProtocols(token))
}
