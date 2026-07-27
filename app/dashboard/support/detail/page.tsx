"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import { subscribeSupportTicket, type SupportCableEvent, type SupportTicketSubscription } from "@/lib/support-cable";
import {
  isNotificationSoundEnabled,
  playNotificationTone,
  setNotificationSoundEnabled,
  unlockNotificationAudio,
} from "@/lib/notification-sound";
import { fetchNotificationPreferences } from "@/lib/notifications-api";
import { resolveBusinessId } from "@/lib/restaurant-api";
import { notify as nativeNotify } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAppSelector } from "@/lib/store/hooks";
import { selectBusinessId } from "@/lib/store/slices/authSlice";
import { ArrowLeft } from "lucide-react";

interface SupportMessage {
  id: number;
  body: string;
  created_at: string;
  sender_type: string;
  sender_id: number;
  sender: {
    first_name?: string;
    last_name?: string;
    name?: string;
  };
}

interface SupportTicket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to?: {
    first_name: string;
    last_name: string;
  } | null;
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-orange-50 text-orange-700 border-orange-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return map[status] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return map[priority] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

function isFromSupport(msg: SupportMessage): boolean {
  return String(msg.sender_type || "").toLowerCase() !== "user";
}

function SupportTicketDetailContent() {
  const searchParams = useSearchParams();
  const ticketId = searchParams?.get("id");
  const businessId = useAppSelector(selectBusinessId);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [supportTyping, setSupportTyping] = useState(false);

  const subscriptionRef = useRef<SupportTicketSubscription | null>(null);
  const typingClearTimer = useRef<number | null>(null);
  const lastTypingSentAt = useRef(0);
  const ticketRef = useRef<SupportTicket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ticketRef.current = ticket;
  }, [ticket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, supportTyping]);

  useEffect(() => {
    unlockNotificationAudio();
    const bid = resolveBusinessId(businessId);
    if (!bid) return;
    let cancelled = false;
    fetchNotificationPreferences(bid)
      .then((p) => {
        if (!cancelled) setNotificationSoundEnabled(p.sound_enabled !== false);
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const data = await api.getBusinessData<{ ticket: SupportTicket; messages: SupportMessage[] }>(
        `/api/v1/support_tickets/${ticketId}`
      );
      setTicket(data.ticket);
      setMessages(data.messages || []);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  useEffect(() => {
    const cableTicketId = ticket?.ticket_id;
    if (!cableTicketId) return;

    const handleEvent = (event: SupportCableEvent) => {
      if (event.type === "new_message" && event.message) {
        const incoming = event.message as unknown as SupportMessage;
        const fromSupport = isFromSupport(incoming);
        if (fromSupport) {
          setSupportTyping(false);
          if (isNotificationSoundEnabled()) void playNotificationTone();
          const label = ticketRef.current?.ticket_id || "Support";
          const preview = (incoming.body || "").slice(0, 120);
          toast.info("New support reply", { description: preview || label });
          void nativeNotify("New support reply", preview || label);
        }
        setMessages((prev) =>
          prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
        );
      } else if (event.type === "status_changed" || event.type === "assigned") {
        const updated = event.ticket as unknown as Partial<SupportTicket> | undefined;
        if (updated) {
          setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
        }
      } else if (event.type === "typing" && event.sender_role === "admin") {
        setSupportTyping(true);
        if (typingClearTimer.current) window.clearTimeout(typingClearTimer.current);
        typingClearTimer.current = window.setTimeout(() => setSupportTyping(false), 3000);
      }
    };

    const subscription = subscribeSupportTicket(cableTicketId, handleEvent);
    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
      if (typingClearTimer.current) window.clearTimeout(typingClearTimer.current);
    };
  }, [ticket?.ticket_id]);

  const handleReplyChange = (value: string) => {
    unlockNotificationAudio();
    setReplyMessage(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSentAt.current > 2000) {
      lastTypingSentAt.current = now;
      subscriptionRef.current?.sendTyping();
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setIsReplying(true);
    try {
      const res = await api.postBusinessData<{ support_message: SupportMessage }>(
        `/api/v1/support_tickets/${ticketId}/messages`,
        { body: replyMessage }
      );
      if (res.support_message) {
        setMessages((prev) =>
          prev.some((m) => m.id === res.support_message.id) ? prev : [...prev, res.support_message]
        );
      }
      setReplyMessage("");
      toast.success("Reply sent");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to send reply");
    } finally {
      setIsReplying(false);
    }
  };

  const isClosedOrResolved = ticket?.status === "resolved" || ticket?.status === "closed";

  if (isLoading) {
    return (
      <DashboardLayout activeTab="support">
        <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardLayout activeTab="support">
        <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center">
          <p className="text-sm text-red-600">{error || "Ticket not found."}</p>
          <Link href="/dashboard/support" className="mt-3 text-xs text-slate-600 hover:text-slate-900">
            ← Back to tickets
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="support">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2">
          <Link
            href="/dashboard/support"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Support
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] font-medium text-slate-400">{ticket.ticket_id}</span>
                <span className={`rounded-md border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${priorityBadge(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className={`rounded-md border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${statusBadge(ticket.status)}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{ticket.subject}</h1>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ticket.description}</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
          <div className="flex min-h-0 flex-[2] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
              <h2 className="text-sm font-semibold text-slate-900">Conversation</h2>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No messages yet.</p>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender_type === "User";
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          isUser
                            ? "rounded-tr-md bg-indigo-600 text-white"
                            : "rounded-tl-md border border-slate-100 bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className={`mb-1 flex items-center gap-1.5 text-[10px] ${isUser ? "text-indigo-100" : "text-slate-400"}`}>
                          <span className="font-semibold">
                            {isUser ? "You" : (msg.sender?.first_name || "Support")}
                          </span>
                          <span>·</span>
                          <span>{formatMessageTime(msg.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}

              {supportTyping && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 animate-pulse">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
                  </span>
                  Support is typing…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-slate-100 px-3.5 py-2.5">
              {isClosedOrResolved ? (
                <p className="text-xs italic text-slate-400">
                  This ticket is {ticket.status}. Replies are disabled.
                </p>
              ) : (
                <form onSubmit={handleReplySubmit} className="space-y-2">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => handleReplyChange(e.target.value)}
                    placeholder="Type your reply…"
                    className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500/40"
                    disabled={isReplying}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isReplying || !replyMessage.trim()}
                      className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                    >
                      {isReplying ? "Sending…" : "Send reply"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:w-64 xl:w-72">
            <div className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
              <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            </div>
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-3.5 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ticket ID</p>
                <p className="mt-0.5 font-mono text-xs font-medium text-slate-800">{ticket.ticket_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                <span className={`mt-1 inline-flex rounded-md border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${statusBadge(ticket.status)}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</p>
                <span className={`mt-1 inline-flex rounded-md border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${priorityBadge(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assigned to</p>
                <p className="mt-0.5 text-xs font-medium text-slate-800">
                  {ticket.assigned_to
                    ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`
                    : "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-0.5 text-xs font-medium text-slate-800">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SupportTicketDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout activeTab="support">
          <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner size={32} />
          </div>
        </DashboardLayout>
      }
    >
      <SupportTicketDetailContent />
    </Suspense>
  );
}
