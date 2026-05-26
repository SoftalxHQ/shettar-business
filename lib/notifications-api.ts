import { getAuthToken } from "@/lib/storage";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");

function headers(businessId?: string) {
  const token = getAuthToken();
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (businessId) h["X-Business-Id"] = businessId;
  return h;
}

export type StaffNotification = {
  id: number;
  category: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type NotificationPreferences = {
  sound_enabled: boolean;
  categories: Record<string, boolean>;
};

export type StaffNotificationCablePayload = {
  id: number;
  category?: string;
  title: string;
  message?: string;
  read?: boolean;
  created_at?: string;
  metadata?: Record<string, unknown>;
  sound?: boolean;
};

export async function fetchStaffNotifications(businessId: string) {
  const res = await fetch(
    `${API_URL}/api/v1/staff_notifications?business_id=${encodeURIComponent(businessId)}`,
    { headers: headers(businessId) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load notifications");
  return data as { notifications: StaffNotification[]; unread_count: number };
}

export async function fetchUnreadCount(businessId: string) {
  const res = await fetch(
    `${API_URL}/api/v1/staff_notifications/unread_count?business_id=${encodeURIComponent(businessId)}`,
    { headers: headers(businessId) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data.unread_count as number;
}

export async function markNotificationsRead(businessId: string, ids?: number[]) {
  const res = await fetch(`${API_URL}/api/v1/staff_notifications/mark_as_read`, {
    method: "POST",
    headers: headers(businessId),
    body: JSON.stringify({ ids, business_id: businessId }),
  });
  if (!res.ok) throw new Error("Failed to mark read");
}

export async function markNotificationRead(businessId: string, id: number) {
  return markNotificationsRead(businessId, [id]);
}

export async function fetchNotificationPreferences(businessId: string) {
  const res = await fetch(
    `${API_URL}/api/v1/staff_notifications/preferences?business_id=${encodeURIComponent(businessId)}`,
    { headers: headers(businessId) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data.preferences as NotificationPreferences;
}

export async function updateNotificationPreferences(
  businessId: string,
  preferences: NotificationPreferences
) {
  const res = await fetch(`${API_URL}/api/v1/staff_notifications/preferences`, {
    method: "PATCH",
    headers: headers(businessId),
    body: JSON.stringify({ business_id: businessId, preferences }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data.preferences as NotificationPreferences;
}

function cableUrl() {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/cable`;
}

/** ActionCable ping frames use `message` as a number — must not treat as staff notifications. */
export function parseStaffNotificationCableFrame(
  raw: unknown
): StaffNotificationCablePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const frame = raw as Record<string, unknown>;
  const frameType = frame.type;
  if (
    frameType === "ping" ||
    frameType === "welcome" ||
    frameType === "confirm_subscription" ||
    frameType === "disconnect"
  ) {
    return null;
  }

  const message = frame.message;
  if (!message || typeof message !== "object" || Array.isArray(message)) return null;

  const payload = message as Record<string, unknown>;
  const title = payload.title;
  const id = payload.id;
  if (typeof title !== "string" || !title.trim()) return null;
  if (id !== undefined && typeof id !== "number") return null;

  return payload as StaffNotificationCablePayload;
}

type NotificationHandler = (payload: StaffNotificationCablePayload) => void;

let sharedSocket: WebSocket | null = null;
let socketToken: string | null = null;
const subscribers = new Set<NotificationHandler>();
const seenIds = new Set<number>();
const SEEN_CAP = 200;

function rememberId(id: number) {
  seenIds.add(id);
  if (seenIds.size > SEEN_CAP) {
    const first = seenIds.values().next().value;
    if (first !== undefined) seenIds.delete(first);
  }
}

function shouldDeliver(payload: StaffNotificationCablePayload): boolean {
  if (typeof payload.id !== "number") return true;
  if (seenIds.has(payload.id)) return false;
  rememberId(payload.id);
  return true;
}

function notifySubscribers(payload: StaffNotificationCablePayload) {
  if (!shouldDeliver(payload)) return;
  subscribers.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      /* ignore subscriber errors */
    }
  });
}

function teardownSocket() {
  if (!sharedSocket) return;
  const ws = sharedSocket;
  sharedSocket = null;
  socketToken = null;
  try {
    const identifier = JSON.stringify({ channel: "UserNotificationsChannel" });
    ws.send(JSON.stringify({ command: "unsubscribe", identifier }));
  } catch {
    /* */
  }
  try {
    ws.close();
  } catch {
    /* */
  }
}

function ensureSocket() {
  const token = getAuthToken();
  if (!token) return;

  if (sharedSocket && socketToken === token) {
    const state = sharedSocket.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
  }

  teardownSocket();
  socketToken = token;

  const ws = new WebSocket(`${cableUrl()}?token=${encodeURIComponent(token)}`);
  sharedSocket = ws;
  const identifier = JSON.stringify({ channel: "UserNotificationsChannel" });

  ws.onopen = () => {
    ws.send(JSON.stringify({ command: "subscribe", identifier }));
  };

  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data as string);
      const payload = parseStaffNotificationCableFrame(data);
      if (payload) notifySubscribers(payload);
    } catch {
      /* ignore malformed frames */
    }
  };

  ws.onclose = () => {
    if (sharedSocket !== ws) return;
    sharedSocket = null;
    if (subscribers.size > 0 && getAuthToken() === socketToken) {
      window.setTimeout(() => {
        if (subscribers.size > 0) ensureSocket();
      }, 3000);
    }
  };
}

/** One shared ActionCable connection; ignores ping/welcome frames. */
export function subscribeUserNotifications(handler: NotificationHandler) {
  subscribers.add(handler);
  ensureSocket();
  return () => {
    subscribers.delete(handler);
    if (subscribers.size === 0) teardownSocket();
  };
}
