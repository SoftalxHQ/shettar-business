import { getAuthToken } from "@/lib/storage";

export type SupportCableEvent = {
  type: "new_message" | "status_changed" | "assigned" | "typing" | "ticket_created" | "ticket_updated" | "stats_changed" | string;
  message?: Record<string, unknown>;
  ticket?: Record<string, unknown>;
  status?: string;
  sender_role?: "admin" | "business";
  sender_name?: string;
  ticket_id?: string;
  support_ticket_id?: number;
};

type EventHandler = (event: SupportCableEvent) => void;

export interface SupportTicketSubscription {
  /** Broadcasts an ephemeral typing event to everyone else in the ticket room. */
  sendTyping: () => void;
  unsubscribe: () => void;
}

export interface SupportUserFeedSubscription {
  unsubscribe: () => void;
}

function cableUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base.replace(/^http/, "ws")}/cable`;
}

function openSupportChannel(
  identifierPayload: Record<string, unknown>,
  onEvent: EventHandler
): SupportTicketSubscription {
  const token = getAuthToken();
  const identifier = JSON.stringify(identifierPayload);

  let ws: WebSocket | null = null;
  let closed = false;
  let subscribed = false;
  let reconnectTimer: number | null = null;

  const connect = () => {
    if (closed || !token) return;

    ws = new WebSocket(`${cableUrl()}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      ws?.send(JSON.stringify({ command: "subscribe", identifier }));
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.type === "ping") return;
        if (data.type === "confirm_subscription") {
          subscribed = true;
          return;
        }
        if (data.type === "reject_subscription") {
          subscribed = false;
          return;
        }
        if (data.message && typeof data.message === "object") {
          onEvent(data.message as SupportCableEvent);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = () => {
      subscribed = false;
      if (closed) return;
      reconnectTimer = window.setTimeout(connect, 3000);
    };
  };

  connect();

  return {
    sendTyping: () => {
      if (!ws || ws.readyState !== WebSocket.OPEN || !subscribed) return;
      ws.send(
        JSON.stringify({
          command: "message",
          identifier,
          data: JSON.stringify({ action: "typing" }),
        })
      );
    },
    unsubscribe: () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.send(JSON.stringify({ command: "unsubscribe", identifier }));
        } catch {
          /* socket may already be closed */
        }
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      ws = null;
    },
  };
}

/**
 * Subscribes to the SupportChannel room for a single ticket. `ticketId` must
 * be the string ticket id (e.g. "SP..."), not the numeric database id.
 */
export function subscribeSupportTicket(
  ticketId: string,
  onEvent: EventHandler
): SupportTicketSubscription {
  return openSupportChannel({ channel: "SupportChannel", ticket_id: ticketId }, onEvent);
}

/** Dashboard-wide feed for the signed-in business user (badge / list stats). */
export function subscribeSupportUserFeed(onEvent: EventHandler): SupportUserFeedSubscription {
  const { unsubscribe } = openSupportChannel({ channel: "SupportChannel" }, onEvent);
  return { unsubscribe };
}

const STATS_REFRESH_TYPES = new Set([
  "new_message",
  "ticket_created",
  "ticket_updated",
  "status_changed",
  "assigned",
  "stats_changed",
]);

export function shouldRefreshSupportStats(event: SupportCableEvent): boolean {
  return STATS_REFRESH_TYPES.has(event.type);
}
