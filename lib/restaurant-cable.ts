import { getAuthToken } from "@/lib/storage";
import {
  notifyMenuAvailabilityChange,
  type MenuAvailabilityUpdate,
} from "@/lib/restaurant-menu-sync";

export type RestaurantCableEvent = {
  event: string;
  business_id: string;
  payload: Record<string, unknown>;
  at?: string;
};

type Handler = (event: RestaurantCableEvent) => void;
type ConnectionListener = (connected: boolean) => void;

function cableUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/cable`;
}

export function orderStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "text-amber-700 bg-amber-100 border-amber-200";
    case "preparing":
      return "text-blue-700 bg-blue-100 border-blue-200";
    case "ready":
      return "text-violet-700 bg-violet-100 border-violet-200";
    case "served":
      return "text-emerald-700 bg-emerald-100 border-emerald-200";
    case "cancelled":
      return "text-red-700 bg-red-100 border-red-200";
    default:
      return "text-slate-700 bg-slate-100 border-slate-200";
  }
}

let sharedSocket: WebSocket | null = null;
let sharedBusinessId: string | null = null;
let sharedToken: string | null = null;
const eventHandlers = new Set<Handler>();
const connectionListeners = new Set<ConnectionListener>();

function notifyConnection(connected: boolean) {
  connectionListeners.forEach((fn) => {
    try {
      fn(connected);
    } catch {
      /* ignore */
    }
  });
}

function notifyHandlers(event: RestaurantCableEvent) {
  if (event.event === "menu_item_availability_changed") {
    notifyMenuAvailabilityChange(event.payload as MenuAvailabilityUpdate);
  }
  eventHandlers.forEach((handler) => {
    try {
      handler(event);
    } catch {
      /* ignore */
    }
  });
}

function teardownSocket() {
  if (!sharedSocket) return;
  const ws = sharedSocket;
  const businessId = sharedBusinessId;
  sharedSocket = null;
  sharedBusinessId = null;
  notifyConnection(false);
  if (businessId) {
    try {
      const identifier = JSON.stringify({
        channel: "RestaurantChannel",
        business_id: businessId,
      });
      ws.send(JSON.stringify({ command: "unsubscribe", identifier }));
    } catch {
      /* */
    }
  }
  try {
    ws.close();
  } catch {
    /* */
  }
}

function ensureSocket(businessId: string) {
  const token = getAuthToken();
  if (!token || !businessId) return;

  if (
    sharedSocket &&
    sharedBusinessId === businessId &&
    sharedToken === token &&
    (sharedSocket.readyState === WebSocket.OPEN ||
      sharedSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  teardownSocket();
  sharedBusinessId = businessId;
  sharedToken = token;

  const identifier = JSON.stringify({
    channel: "RestaurantChannel",
    business_id: businessId,
  });

  const ws = new WebSocket(`${cableUrl()}?token=${encodeURIComponent(token)}`);
  sharedSocket = ws;

  ws.onopen = () => {
    notifyConnection(true);
    ws.send(JSON.stringify({ command: "subscribe", identifier }));
  };

  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data as string);
      if (data.type === "ping") return;
      if (data.type === "confirm_subscription") {
        notifyConnection(true);
        return;
      }
      if (data.message && typeof data.message === "object") {
        notifyHandlers(data.message as RestaurantCableEvent);
      }
    } catch {
      /* ignore malformed frames */
    }
  };

  ws.onclose = () => {
    if (sharedSocket !== ws) return;
    sharedSocket = null;
    notifyConnection(false);
    if (eventHandlers.size > 0 && getAuthToken() === sharedToken && sharedBusinessId) {
      window.setTimeout(() => {
        if (eventHandlers.size > 0 && sharedBusinessId) ensureSocket(sharedBusinessId);
      }, 3000);
    }
  };
}

/** One shared restaurant channel per business; ignores ping frames. */
export function subscribeRestaurantChannel(
  businessId: string,
  handlers: Handler | { onEvent: Handler; onConnection?: ConnectionListener }
) {
  const onEvent = typeof handlers === "function" ? handlers : handlers.onEvent;
  const onConnection =
    typeof handlers === "function" ? undefined : handlers.onConnection;

  eventHandlers.add(onEvent);
  if (onConnection) {
    connectionListeners.add(onConnection);
    onConnection(!!sharedSocket && sharedSocket.readyState === WebSocket.OPEN);
  }

  ensureSocket(businessId);

  return () => {
    eventHandlers.delete(onEvent);
    if (onConnection) connectionListeners.delete(onConnection);
    if (eventHandlers.size === 0 && connectionListeners.size === 0) {
      teardownSocket();
    }
  };
}
