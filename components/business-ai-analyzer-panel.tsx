"use client"

import Link from "next/link"
import type { AiPointsBalance, BusinessAiReport } from "@/lib/ai-points-api"

export function BusinessAiAnalyzerPanel({
  open,
  onClose,
  report,
  balance,
}: {
  open: boolean
  onClose: () => void
  report: BusinessAiReport | null
  balance?: AiPointsBalance | null
}) {
  if (!open || !report) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Analyzer</h2>
            <p className="text-xs text-slate-500 capitalize">
              {report.query?.trim() ? "Custom request" : "General scan"} · {report.page}
              {balance ? ` · ${balance.total} pts left` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm text-slate-700">
          {report.query?.trim() && (
            <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">Your request</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-indigo-950">{report.query}</p>
            </section>
          )}

          {report.focused_answer?.trim() && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Answer</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{report.focused_answer}</p>
            </section>
          )}

          {report.executive_summary?.trim() && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Executive Summary</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{report.executive_summary}</p>
            </section>
          )}

          {report.key_findings?.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Key Findings</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                {report.key_findings.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {report.trends?.trim() && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Trends</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{report.trends}</p>
            </section>
          )}

          {report.risks?.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Risks</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                {report.risks.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {report.recommendations?.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Recommendations</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                {report.recommendations.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {balance && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span>
              Balance: {balance.total} ({balance.free} free · {balance.purchased} purchased)
            </span>
            <Link href="/dashboard/ai-points" className="font-semibold text-indigo-600 hover:underline">
              Buy points
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
