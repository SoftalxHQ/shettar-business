"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import {
  shouldRefreshSupportStats,
  subscribeSupportUserFeed,
  type SupportCableEvent,
} from "@/lib/support-cable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, Search as SearchIcon, MessageSquare, Clock, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface SupportTicket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  unread?: boolean;
}

function MetricTile({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-slate-900">
        {loading ? "—" : value}
      </p>
    </div>
  )
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const statsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("low");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await api.getBusinessData<any>("/api/v1/support_tickets/stats");
      setStats(data);
    } catch { } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (search) params.set("search", search);
      const data = await api.getBusinessData<{ tickets: SupportTicket[] }>(`/api/v1/support_tickets?${params.toString()}`);
      setTickets(data.tickets || []);
      setError(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Failed to load support tickets");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const fetchTicketsRef = useRef(fetchTickets);
  const fetchStatsRef = useRef(fetchStats);
  useEffect(() => {
    fetchTicketsRef.current = fetchTickets;
    fetchStatsRef.current = fetchStats;
  }, [fetchTickets, fetchStats]);

  useEffect(() => {
    void fetchStatsRef.current();

    const scheduleStats = () => {
      if (statsDebounceRef.current) clearTimeout(statsDebounceRef.current);
      statsDebounceRef.current = setTimeout(() => {
        void fetchStatsRef.current();
      }, 300);
    };

    const subscription = subscribeSupportUserFeed((event: SupportCableEvent) => {
      if (shouldRefreshSupportStats(event)) {
        scheduleStats();
        // Refresh the list when tickets change so unread/status stay current.
        if (event.type !== "stats_changed") {
          void fetchTicketsRef.current();
        }
      }
    });

    return () => {
      if (statsDebounceRef.current) clearTimeout(statsDebounceRef.current);
      subscription.unsubscribe();
    };
  }, []);

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
      fetchStats();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="rounded-md border-orange-200 bg-orange-50 px-1.5 py-0 text-[10px] uppercase tracking-wide text-orange-700">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] uppercase tracking-wide text-blue-700">In Progress</Badge>;
      case "resolved": return <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] uppercase tracking-wide text-emerald-700">Resolved</Badge>;
      case "closed": return <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] uppercase tracking-wide text-slate-600">Closed</Badge>;
      default: return <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] uppercase tracking-wide">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge variant="destructive" className="rounded-md px-1.5 py-0 text-[10px] uppercase tracking-wide">High</Badge>;
      case "medium": return <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] uppercase tracking-wide text-amber-700">Medium</Badge>;
      case "low": return <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] uppercase tracking-wide text-slate-600">Low</Badge>;
      default: return null;
    }
  };

  const hasFilters = search || statusFilter !== "all" || priorityFilter !== "all";

  return (
    <DashboardLayout activeTab="support">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Support</h1>
            <p className="text-xs text-slate-500">Tickets and help from the Shettar team</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Ticket
          </Button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
          <MetricTile title="Open" value={stats?.open ?? 0} icon={MessageSquare} loading={statsLoading} />
          <MetricTile title="In progress" value={stats?.in_progress ?? 0} icon={Clock} loading={statsLoading} />
          <MetricTile title="Resolved" value={stats?.resolved ?? 0} icon={CheckCircle2} loading={statsLoading} />
          <MetricTile title="High priority" value={stats?.high_priority ?? 0} icon={AlertTriangle} loading={statsLoading} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-3 py-2.5 sm:flex-row sm:items-center">
            <div className="relative min-w-[180px] flex-1 sm:max-w-sm">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search ticket ID or subject…"
                className="h-8 rounded-lg border-slate-200 pl-8 text-xs"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner size={28} />
              </div>
            ) : error ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-red-400" />
                <p className="text-sm font-medium text-red-700">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTickets} className="mt-3 h-8 rounded-lg border-slate-200 text-xs">
                  Try again
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-slate-400">
                <Ticket className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No tickets found</p>
                <p className="mt-1 text-xs">
                  {hasFilters
                    ? "No tickets match your filters."
                    : "You haven’t submitted any support tickets yet."}
                </p>
                <Button
                  size="sm"
                  variant={hasFilters ? "outline" : "default"}
                  className={hasFilters
                    ? "mt-3 h-8 rounded-lg border-slate-200 text-xs"
                    : "mt-3 h-8 rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700"}
                  onClick={() => {
                    if (hasFilters) {
                      setSearch("");
                      setSearchInput("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    } else {
                      setShowCreateModal(true);
                    }
                  }}
                >
                  {hasFilters ? "Clear filters" : "Create ticket"}
                </Button>
              </div>
            ) : (
              <ul>
                {tickets.map((ticket) => (
                  <li key={ticket.id} className="border-b border-slate-100 last:border-b-0">
                    <Link
                      href={`/dashboard/support/detail?id=${ticket.id}`}
                      className="flex items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
                            {ticket.ticket_id}
                          </span>
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                          {ticket.unread && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              New reply
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs font-medium text-slate-900">{ticket.subject}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{ticket.description}</p>
                      </div>
                      <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">
                        {new Date(ticket.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="rounded-xl border-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Create support ticket</DialogTitle>
            <DialogDescription className="text-xs">
              Provide details about your issue for the Shettar team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Subject</label>
              <Input
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="h-9 rounded-lg border-slate-200"
                placeholder="E.g., Cannot access billing page"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Description</label>
              <textarea
                required
                rows={4}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500/40"
                placeholder="Provide as much detail as possible…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none"
              >
                <option value="low">Low — general query or minor issue</option>
                <option value="medium">Medium — important but not critical</option>
                <option value="high">High — critical / blocking</option>
              </select>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-slate-200 text-xs"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 rounded-lg bg-indigo-600 text-xs hover:bg-indigo-700"
              >
                {isSubmitting ? "Submitting…" : "Submit ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
