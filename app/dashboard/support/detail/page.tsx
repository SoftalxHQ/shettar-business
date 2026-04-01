"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open:        "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    in_progress: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    resolved:    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    closed:      "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    high:   "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    low:    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  };
  return map[priority] ?? "bg-slate-100 text-slate-500";
}

function SupportTicketDetailContent() {
  const searchParams = useSearchParams();
  const ticketId = searchParams?.get("id");

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);

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

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setIsReplying(true);
    try {
      await api.postBusinessData(`/api/v1/support_tickets/${ticketId}/messages`, { body: replyMessage });
      setReplyMessage("");
      toast.success("Reply sent");
      fetchTicket();
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading ticket details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardLayout activeTab="support">
        <div className="p-8">
          <p className="text-destructive">{error || "Ticket not found."}</p>
          <Link href="/dashboard/support" className="text-primary hover:underline mt-4 inline-block">
            &larr; Back to Tickets
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="support">
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/dashboard/support"
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Support Tickets
        </Link>

        {/* Ticket Header */}
        <div className="glass p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm font-mono font-bold text-muted-foreground">{ticket.ticket_id}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityBadge(ticket.priority)}`}>
              {ticket.priority.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(ticket.status)}`}>
              {ticket.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-muted-foreground mt-2">{ticket.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation */}
          <div className="lg:col-span-2">
            <div className="glass p-6 rounded-3xl space-y-6">
              <h3 className="text-lg font-bold">Conversation</h3>

              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm">No messages yet.</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 pb-4">
                  {messages.map((msg) => {
                    const isUser = msg.sender_type === "User";
                    return (
                      <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${isUser ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-muted-foreground rounded-tl-none"}`}>
                          <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">
                            <span className="font-bold">
                              {isUser ? "You" : (msg.sender?.first_name || "Support Team")}
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reply form */}
              <div className="border-t border-border pt-6">
                {isClosedOrResolved ? (
                  <p className="text-sm text-muted-foreground italic">
                    This ticket is {ticket.status}. Replies are disabled.
                  </p>
                ) : (
                  <form onSubmit={handleReplySubmit} className="space-y-3">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply to the support team..."
                      className="w-full bg-background border border-border resize-y h-24 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isReplying}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isReplying || !replyMessage.trim()} className="font-semibold">
                        {isReplying ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-3xl space-y-4">
              <h3 className="text-lg font-bold">Details</h3>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ticket ID</p>
                <p className="font-mono font-semibold text-sm">{ticket.ticket_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(ticket.status)}`}>
                  {ticket.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityBadge(ticket.priority)}`}>
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                <p className="font-semibold text-sm">
                  {ticket.assigned_to
                    ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`
                    : "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="font-semibold text-sm">{new Date(ticket.created_at).toLocaleString()}</p>
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={32} /></div>}>
      <SupportTicketDetailContent />
    </Suspense>
  );
}
