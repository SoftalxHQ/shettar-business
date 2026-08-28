"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BusinessAiAnalyzerPanel } from "@/components/business-ai-analyzer-panel"
import {
  AI_POINTS_BALANCE_EVENT,
  fetchAiPoints,
  isFollowUpReply,
  runBusinessAiAnalyzer,
  type AiPointsBalance,
  type AnalyzeAiParams,
  type BusinessAiChatMessage,
  type BusinessAiReport,
} from "@/lib/ai-points-api"
import { cn } from "@/lib/utils"

type Props = {
  businessId: string | null | undefined
  canRun: boolean
  page: AnalyzeAiParams["page"]
  filters?: Omit<AnalyzeAiParams, "page" | "query" | "prior_context">
  className?: string
}

export function BusinessAiAnalyzerButton({ businessId, canRun, page, filters, className }: Props) {
  const [balance, setBalance] = useState<AiPointsBalance | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [report, setReport] = useState<BusinessAiReport | null>(null)
  const [messages, setMessages] = useState<BusinessAiChatMessage[]>([])
  const [pendingFollowUp, setPendingFollowUp] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insufficient, setInsufficient] = useState(false)
  const [loading, setLoading] = useState(false)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [followUpInsufficient, setFollowUpInsufficient] = useState(false)

  useEffect(() => {
    if (!businessId || !canRun) return
    fetchAiPoints(businessId)
      .then(setBalance)
      .catch(() => {})
  }, [businessId, canRun])

  useEffect(() => {
    const onBalance = (event: Event) => {
      const next = (event as CustomEvent<AiPointsBalance>).detail
      if (next && typeof next.total === "number") setBalance(next)
    }
    window.addEventListener(AI_POINTS_BALANCE_EVENT, onBalance)
    return () => window.removeEventListener(AI_POINTS_BALANCE_EVENT, onBalance)
  }, [])

  if (!canRun) return null

  const pointsCost = balance?.config.points_per_request ?? 1
  const total = balance?.total ?? 0

  const applyAnalyzeError = (
    e: unknown,
    setters: {
      setError: (value: string | null) => void
      setInsufficient: (value: boolean) => void
      setStatus: (value: string | null) => void
    }
  ) => {
    const err = e as Error & { code?: string; ai_points?: AiPointsBalance }
    if (err.ai_points) setBalance(err.ai_points)
    if (err.code === "insufficient_ai_points") {
      setters.setInsufficient(true)
      setters.setError(err.message || "Insufficient AI points")
    } else if (err.code === "ai_provider_unavailable") {
      setters.setError("Ops, something went wrong. Please try again shortly.")
    } else if (err.code === "no_activity") {
      setters.setError(err.message || "No activity events to analyze for the selected filters")
    } else {
      setters.setError(err.message || "Ops, something went wrong. Please try again shortly.")
    }
    setters.setStatus(null)
  }

  const handleAnalyze = async (mode: "general" | "request") => {
    if (!businessId) return
    const q = mode === "request" ? query.trim() : ""
    if (mode === "request" && !q) {
      setError("Enter a request, or use general scan")
      return
    }

    setError(null)
    setInsufficient(false)
    setLoading(true)
    setStatus(q ? "Running your request..." : "Running general scan...")

    try {
      const result = await runBusinessAiAnalyzer(businessId, {
        page,
        query: q || undefined,
        ...filters,
      })
      if (isFollowUpReply(result.report)) return
      setReport(result.report)
      setMessages([])
      setPendingFollowUp(null)
      setBalance(result.ai_points)
      setStatus(null)
      setFollowUpError(null)
      setFollowUpInsufficient(false)
      setPromptOpen(false)
      setPanelOpen(true)
    } catch (e) {
      applyAnalyzeError(e, { setError, setInsufficient, setStatus })
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUp = async (followUpQuery: string) => {
    if (!businessId || !report) return
    const q = followUpQuery.trim()
    if (!q) return

    setFollowUpError(null)
    setFollowUpInsufficient(false)
    setPendingFollowUp(q)
    setFollowUpLoading(true)

    try {
      const result = await runBusinessAiAnalyzer(businessId, {
        page,
        query: q,
        ...filters,
        prior_context: {
          query: report.query,
          focused_answer: report.focused_answer,
          executive_summary: report.executive_summary,
          key_findings: report.key_findings,
          trends: report.trends,
          risks: report.risks,
          recommendations: report.recommendations,
          conversation: messages,
        },
      })
      const reply = isFollowUpReply(result.report)
        ? result.report.reply
        : result.report.focused_answer
      setMessages((prev) => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: reply },
      ])
      setBalance(result.ai_points)
      setPendingFollowUp(null)
    } catch (e) {
      applyAnalyzeError(e, {
        setError: setFollowUpError,
        setInsufficient: setFollowUpInsufficient,
        setStatus: () => {},
      })
      setPendingFollowUp(null)
    } finally {
      setFollowUpLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setError(null)
          setInsufficient(false)
          setPromptOpen(true)
        }}
        className={cn("h-8 gap-1.5 rounded-lg border-slate-200 text-xs", className)}
      >
        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
        AI Analyzer
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
          {total}
        </span>
      </Button>

      {promptOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => !loading && setPromptOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">AI Analyzer</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ask something specific about {page === "activity" ? "the activity log" : page}, or run a
              general scan. Costs {pointsCost} point{pointsCost === 1 ? "" : "s"} per run.
              {filters && Object.keys(filters).length > 0 ? " Uses your current filters." : ""}
            </p>

            {loading && status ? (
              <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-5 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <p className="mt-3 text-sm font-medium text-indigo-900">{status}</p>
              </div>
            ) : (
              <>
                <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Specific request <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (error) setError(null)
                  }}
                  rows={4}
                  placeholder={
                    page === "activity"
                      ? 'e.g. "Any unusual staff changes?" or "Summarize check-ins today"'
                      : 'e.g. "Why did occupancy drop this week?" or "Summarize cancelled bookings"'
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </>
            )}

            {error && !loading && (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{error}</p>
                {insufficient && (
                  <Link href="/dashboard/ai-points" className="mt-2 inline-block font-semibold text-indigo-700 hover:underline">
                    Buy AI points
                  </Link>
                )}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Balance: {total} point{total === 1 ? "" : "s"}
              {balance ? ` (${balance.free} free · ${balance.purchased} purchased)` : ""}
            </p>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setPromptOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAnalyze("general")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                General scan
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAnalyze("request")}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Send request
              </button>
            </div>
          </div>
        </div>
      )}

      <BusinessAiAnalyzerPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        report={report}
        messages={messages}
        pendingFollowUp={pendingFollowUp}
        balance={balance}
        onFollowUp={handleFollowUp}
        followUpLoading={followUpLoading}
        followUpError={followUpError}
        followUpInsufficient={followUpInsufficient}
      />
    </>
  )
}
