"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { ChevronLeft, ChevronRight, History, Sparkles, Trash2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { BusinessAiAnalyzerPanel } from "@/components/business-ai-analyzer-panel"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { toast } from "sonner"
import {
  AI_POINTS_BALANCE_EVENT,
  deleteAiAnalyzerSession,
  fetchAiAnalyzerSession,
  fetchAiAnalyzerSessions,
  fetchAiPoints,
  isFollowUpReply,
  priorContextFromReport,
  runBusinessAiAnalyzer,
  type AiPointsBalance,
  type AnalyzeAiParams,
  type BusinessAiChatMessage,
  type BusinessAiReport,
  type BusinessAiSessionSummary,
} from "@/lib/ai-points-api"
import { cn } from "@/lib/utils"

const PAGE_FILTERS = [
  { value: "all", label: "All pages" },
  { value: "analytics", label: "Analytics" },
  { value: "finance", label: "Finance" },
  { value: "bookings", label: "Bookings" },
  { value: "activity", label: "Activity" },
] as const

export default function AiHistoryPage() {
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const canView =
    user?.role === "admin" ||
    !!user?.permissions?.ai_analyzer?.view ||
    !!user?.permissions?.ai_analyzer?.run
  const canRun = user?.role === "admin" || !!user?.permissions?.ai_analyzer?.run

  const [sessions, setSessions] = useState<BusinessAiSessionSummary[]>([])
  const [pagination, setPagination] = useState<{ count: number; last: number } | null>(null)
  const [page, setPage] = useState(1)
  const [analyzerPage, setAnalyzerPage] = useState("all")
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<AiPointsBalance | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [report, setReport] = useState<BusinessAiReport | null>(null)
  const [messages, setMessages] = useState<BusinessAiChatMessage[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [pendingFollowUp, setPendingFollowUp] = useState<string | null>(null)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [followUpInsufficient, setFollowUpInsufficient] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<BusinessAiSessionSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadSessions = useCallback(
    async (pageNum = 1, analyzer = analyzerPage) => {
      if (!businessId) return
      setLoading(true)
      try {
        const result = await fetchAiAnalyzerSessions(businessId, {
          page: pageNum,
          analyzer_page: analyzer === "all" ? undefined : analyzer,
        })
        setSessions(result.sessions)
        setPagination(result.pagination)
      } catch {
        setSessions([])
        setPagination(null)
      } finally {
        setLoading(false)
      }
    },
    [businessId, analyzerPage]
  )

  useEffect(() => {
    if (!businessId || !canView) return
    loadSessions(page, analyzerPage)
  }, [businessId, canView, page, analyzerPage, loadSessions])

  useEffect(() => {
    if (!businessId || !canView) return
    fetchAiPoints(businessId).then(setBalance).catch(() => {})
  }, [businessId, canView])

  useEffect(() => {
    const onBalance = (event: Event) => {
      const next = (event as CustomEvent<AiPointsBalance>).detail
      if (next && typeof next.total === "number") setBalance(next)
    }
    window.addEventListener(AI_POINTS_BALANCE_EVENT, onBalance)
    return () => window.removeEventListener(AI_POINTS_BALANCE_EVENT, onBalance)
  }, [])

  if (!canView) {
    return (
      <DashboardLayout activeTab="aihistory">
        <p className="text-xs text-slate-500">You do not have permission to view AI history.</p>
      </DashboardLayout>
    )
  }

  const openSession = async (id: number) => {
    if (!businessId) return
    try {
      const session = await fetchAiAnalyzerSession(businessId, id)
      setSessionId(session.id)
      setReport(session.report)
      setMessages(session.messages.map((m) => ({ role: m.role, content: m.content })))
      setFilters(session.filters || {})
      setFollowUpError(null)
      setFollowUpInsufficient(false)
      setPendingFollowUp(null)
      setPanelOpen(true)
    } catch (e) {
      setFollowUpError(e instanceof Error ? e.message : "Failed to open session")
    }
  }

  const handleFollowUp = async (followUpQuery: string) => {
    if (!businessId || !report || !sessionId) return
    const q = followUpQuery.trim()
    if (!q) return

    setFollowUpError(null)
    setFollowUpInsufficient(false)
    setPendingFollowUp(q)
    setFollowUpLoading(true)

    try {
      const result = await runBusinessAiAnalyzer(businessId, {
        page: report.page as AnalyzeAiParams["page"],
        query: q,
        session_id: sessionId,
        ...filters,
        prior_context: priorContextFromReport(report, messages),
      })
      const reply = isFollowUpReply(result.report)
        ? result.report.reply
        : result.report.focused_answer
      setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: reply }])
      setBalance(result.ai_points)
      setPendingFollowUp(null)
      loadSessions(page, analyzerPage)
    } catch (e) {
      const err = e as Error & { code?: string; ai_points?: AiPointsBalance }
      if (err.ai_points) setBalance(err.ai_points)
      if (err.code === "insufficient_ai_points") {
        setFollowUpInsufficient(true)
        setFollowUpError(err.message || "Insufficient AI points")
      } else {
        setFollowUpError(err.message || "Ops, something went wrong. Please try again shortly.")
      }
      setPendingFollowUp(null)
    } finally {
      setFollowUpLoading(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!businessId || !sessionToDelete) return
    setDeleting(true)
    try {
      await deleteAiAnalyzerSession(businessId, sessionToDelete.id)
      if (sessionId === sessionToDelete.id) {
        setPanelOpen(false)
        setSessionId(null)
        setReport(null)
        setMessages([])
      }
      toast.success("AI report deleted")
      if (sessions.length <= 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await loadSessions(page, analyzerPage)
      }
      setSessionToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete AI history")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout activeTab="aihistory">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              AI history
            </h1>
            <p className="text-xs text-slate-500">
              Reopen past analyzer reports and continue the conversation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={analyzerPage}
              onValueChange={(value) => {
                setAnalyzerPage(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_FILTERS.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
              <Link href="/dashboard/ai-points">Buy points</Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 text-xs text-slate-500">
            {pagination ? (
              <>
                Showing <span className="font-semibold text-slate-800">{sessions.length}</span> of{" "}
                <span className="font-semibold text-slate-800">{pagination.count}</span> sessions
              </>
            ) : (
              "Saved analyzer reports"
            )}
          </div>

          {loading ? (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <History className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-0.5">No AI history yet</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Run the AI Analyzer on analytics, finance, bookings, or activity to save a report here.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
              {sessions.map((session) => {
                const updated = new Date(session.updated_at)
                return (
                  <div
                    key={session.id}
                    className="flex items-start gap-1 px-2 py-1 hover:bg-slate-50/80 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => openSession(session.id)}
                      className="min-w-0 flex-1 text-left px-2 py-2 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{session.title}</p>
                          {session.query?.trim() && (
                            <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{session.query}</p>
                          )}
                          {session.preview && (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{session.preview}</p>
                          )}
                          <p className="mt-1.5 text-[11px] text-slate-400">
                            {session.follow_up_count > 0
                              ? `${session.follow_up_count} follow-up${session.follow_up_count === 1 ? "" : "s"}`
                              : "No follow-ups"}
                            {session.user?.name ? ` · ${session.user.name}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-slate-500" title={format(updated, "dd MMM yyyy, HH:mm")}>
                            {formatDistanceToNow(updated, { addSuffix: true })}
                          </p>
                          <p className="mt-1 text-[11px] tabular-nums text-slate-400">
                            {session.points_spent_total} pt{session.points_spent_total === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${session.title}`}
                      title="Delete"
                      onClick={() => setSessionToDelete(session)}
                      className="mt-1.5 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {pagination && pagination.last > 1 && (
            <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                  page <= 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-[11px] text-slate-400">
                Page {page} of {pagination.last}
              </span>
              <button
                type="button"
                disabled={page >= pagination.last}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                  page >= pagination.last ? "text-slate-300" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <BusinessAiAnalyzerPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        report={report}
        messages={messages}
        pendingFollowUp={pendingFollowUp}
        balance={balance}
        onFollowUp={canRun ? handleFollowUp : undefined}
        followUpLoading={followUpLoading}
        followUpError={followUpError}
        followUpInsufficient={followUpInsufficient}
      />

      <ConfirmDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && !deleting && setSessionToDelete(null)}
        title="Delete AI report"
        description="Are you sure you want to delete this report? This cannot be undone."
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDeleteSession}
      />
    </DashboardLayout>
  )
}
