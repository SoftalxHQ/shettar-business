"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SupportTicket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
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

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("low");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const data = await api.getBusinessData<{ tickets: SupportTicket[] }>(`/api/v1/support_tickets?${params.toString()}`);
      setTickets(data.tickets || []);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Failed to load support tickets");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;
    setIsSubmitting(true);
    try {
      await api.postBusinessData("/api/v1/support_tickets", {
        support_ticket: { subject: newSubject, description: newDescription, priority: newPriority },
      });
      toast.success("Support ticket created successfully");
      setShowCreateModal(false);
      setNewSubject("");
      setNewDescription("");
      setNewPriority("low");
      fetchTickets();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout activeTab="support">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Support</h1>
            <p className="text-muted-foreground mt-1">Get help and contact Shettar support</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-primary text-primary-foreground font-semibold">
            + New Ticket
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card glass p-6 rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent text-sm outline-none focus:ring-2 focus:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <select
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent text-sm outline-none focus:ring-2 focus:ring-ring"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl w-full max-w-lg shadow-xl my-auto animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold mb-4">Create Support Ticket</h2>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-input text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Briefly describe the issue..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                    placeholder="Provide details about your problem..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-input text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {isLoading ? (
          <div className="text-center py-12 glass p-6 rounded-3xl">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Loading your tickets...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive glass p-6 rounded-3xl">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="glass p-12 rounded-3xl text-center">
            <svg className="w-16 h-16 mx-auto text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-muted-foreground mt-4">No support tickets found.</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>Create your first ticket</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/support/detail?id=${ticket.id}`}
                className="block glass p-6 rounded-3xl hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-mono font-bold text-muted-foreground">{ticket.ticket_id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityBadge(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(ticket.status)}`}>
                        {ticket.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
