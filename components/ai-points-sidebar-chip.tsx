"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { History, Sparkles } from "lucide-react"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { AI_POINTS_BALANCE_EVENT, fetchAiPoints, type AiPointsBalance } from "@/lib/ai-points-api"

export function AiPointsSidebarChip({ collapsed = false }: { collapsed?: boolean }) {
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [total, setTotal] = useState<number | null>(null)

  const canView =
    user?.role === "admin" ||
    user?.permissions?.ai_analyzer?.view ||
    user?.permissions?.ai_analyzer?.run

  useEffect(() => {
    if (!businessId || !canView) return
    fetchAiPoints(businessId)
      .then((b) => setTotal(b.total))
      .catch(() => setTotal(null))
  }, [businessId, canView])

  useEffect(() => {
    const onBalance = (event: Event) => {
      const next = (event as CustomEvent<AiPointsBalance>).detail
      if (next && typeof next.total === "number") setTotal(next.total)
    }
    window.addEventListener(AI_POINTS_BALANCE_EVENT, onBalance)
    return () => window.removeEventListener(AI_POINTS_BALANCE_EVENT, onBalance)
  }, [])

  if (!canView) return null

  if (collapsed) {
    return (
      <div className="space-y-1 flex flex-col items-center">
        <Link
          href="/dashboard/ai-points"
          title={`AI points${total != null ? `: ${total}` : ""}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/80 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/dashboard/ai-history"
          title="AI history"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-indigo-800 transition-colors"
        >
          <History className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Link
        href="/dashboard/ai-points"
        className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-[12px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-800 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
        <span className="truncate flex-1">AI points</span>
        <span className="tabular-nums font-semibold text-slate-900">{total ?? "—"}</span>
      </Link>
      <Link
        href="/dashboard/ai-history"
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 hover:text-indigo-800 transition-colors"
      >
        <History className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="truncate flex-1">AI history</span>
      </Link>
    </div>
  )
}
