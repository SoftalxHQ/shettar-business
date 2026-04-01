"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ticket, Search as SearchIcon, MessageSquare, Clock, CheckCircle2, AlertTriangle, Plus } from "lucide-react";

interface SupportTicket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("low");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search input by 400ms
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

  useEffect(() => { fetchTickets(); fetchStats(); }, [fetchTickets, fetchStats]);

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
      case "open": return <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200 uppercase text-[10px] px-2 py-0.5 tracking-wider">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 uppercase text-[10px] px-2 py-0.5 tracking-wider">In Progress</Badge>;
      case "resolved": return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 uppercase text-[10px] px-2 py-0.5 tracking-wider">Resolved</Badge>;
      case "closed": return <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 uppercase text-[10px] px-2 py-0.5 tracking-wider">Closed</Badge>;
      default: return <Badge variant="secondary" className="uppercase text-[10px] px-2 py-0.5 tracking-wider">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge variant="destructive" className="uppercase text-[10px] px-2 py-0.5 tracking-wider">High</Badge>;
      case "medium": return <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 uppercase text-[10px] px-2 py-0.5 tracking-wider">Medium</Badge>;
      case "low": return <Badge variant="secondary" className="text-indigo-600 bg-indigo-50 hover:bg-indigo-50 uppercase text-[10px] px-2 py-0.5 tracking-wider">Low</Badge>;
      default: return null;
    }
  };

  const statsCards = [
    { label: "Open Tickets", value: stats?.open, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "In Progress", value: stats?.in_progress, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Resolved", value: stats?.resolved, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "High Priority", value: stats?.high_priority, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  ];

  return (
    <DashboardLayout activeTab="support">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Support Center</h1>
            <p className="text-slate-500 mt-1">Manage your tickets and get help from the Shettar team</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all sm:w-auto w-full group"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
            New Ticket
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-sm text-slate-500">{stat.label}</p>
                    <div className={`p-2 rounded-xl ${stat.bg}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-3xl font-bold text-slate-900">
                      {statsLoading ? "—" : (stat.value || "0")}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 lg:col-span-8 relative group">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <Input
                type="text"
                placeholder="Search by Ticket ID or subject..."
                className="pl-9 h-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-indigo-500 w-full"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 lg:col-span-2">
              <select
                className="w-full h-10 px-3 bg-slate-50 rounded-md border-none text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
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
            <div className="md:col-span-3 lg:col-span-2">
              <select
                className="w-full h-10 px-3 bg-slate-50 rounded-md border-none text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Create Support Ticket</h2>
                <p className="text-sm text-slate-500 mt-1">Please provide details about your issue.</p>
              </div>
              
              <form onSubmit={handleCreateTicket} className="p-6 space-y-5 bg-slate-50/50">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Subject</label>
                  <Input
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="bg-white border-slate-200 h-11"
                    placeholder="E.g., Cannot access billing page"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    required
                    rows={5}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none transition-all"
                    placeholder="Provide as much detail as possible..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="low">Low - General query or minor issue</option>
                    <option value="medium">Medium - Important but not critical</option>
                    <option value="high">High - Critical issue blocking operations</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" className="font-semibold text-slate-600 hover:text-slate-900" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-md">
                    {isSubmitting ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tickets List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="border-dashed border-2 shadow-none border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-slate-500 animate-pulse">Loading your tickets...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border-red-100 bg-red-50/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
                <p className="font-medium text-red-800">{error}</p>
                <Button variant="outline" onClick={fetchTickets} className="mt-4 bg-white">Try Again</Button>
              </CardContent>
            </Card>
          ) : tickets.length === 0 ? (
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <Ticket className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No tickets found</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                  {search || statusFilter !== "all" || priorityFilter !== "all" 
                    ? "We couldn't find any tickets matching your current filters." 
                    : "You haven't submitted any support tickets yet."}
                </p>
                <Button onClick={() => {
                  if (search || statusFilter !== "all" || priorityFilter !== "all") {
                    setSearch("");
                    setSearchInput("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  } else {
                    setShowCreateModal(true);
                  }
                }} variant={search || statusFilter !== "all" ? "outline" : "default"} className="font-semibold">
                  {search || statusFilter !== "all" ? "Clear Filters" : "Create your first ticket"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/dashboard/support/detail?id=${ticket.id}`}
                  className="block group outline-none"
                >
                  <Card className="border-slate-100 shadow-xs hover:shadow-md hover:border-indigo-100 transition-all duration-300">
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {ticket.ticket_id}
                          </span>
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                        <div className="text-xs font-medium text-slate-400">
                          {new Date(ticket.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                          View Details <span className="ml-1">→</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
