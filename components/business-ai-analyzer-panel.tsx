"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Send } from "lucide-react"
import type { AiPointsBalance, BusinessAiChatMessage, BusinessAiReport } from "@/lib/ai-points-api"

export function BusinessAiAnalyzerPanel({
  open,
  onClose,
  report,
  messages = [],
  pendingFollowUp = null,
  balance,
  onFollowUp,
  followUpLoading = false,
  followUpError = null,
  followUpInsufficient = false,
}: {
  open: boolean
  onClose: () => void
  report: BusinessAiReport | null
  messages?: BusinessAiChatMessage[]
  pendingFollowUp?: string | null
  balance?: AiPointsBalance | null
  onFollowUp?: (query: string) => void
  followUpLoading?: boolean
  followUpError?: string | null
  followUpInsufficient?: boolean
}) {
  const [followUp, setFollowUp] = useState("")
  const lastSentRef = useRef("")
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (followUpError && !followUpLoading && lastSentRef.current) {
      setFollowUp(lastSentRef.current)
    }
  }, [followUpError, followUpLoading])

  useEffect(() => {
    const node = threadRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, pendingFollowUp, followUpLoading, report])

  if (!open || !report) return null

  const canSend = Boolean(onFollowUp) && followUp.trim().length > 0 && !followUpLoading

  const submitFollowUp = () => {
    const q = followUp.trim()
    if (!onFollowUp || !q || followUpLoading) return
    lastSentRef.current = q
    setFollowUp("")
    onFollowUp(q)
  }

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

        <div ref={threadRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm text-slate-700">
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

          {(messages.length > 0 || pendingFollowUp) && (
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Follow-up</h3>
              {messages.map((message, idx) => (
                <ChatBubble key={`${message.role}-${idx}`} role={message.role} content={message.content} />
              ))}
              {pendingFollowUp && <ChatBubble role="user" content={pendingFollowUp} />}
              {followUpLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
                    Thinking…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {onFollowUp && (
          <div className="border-t border-slate-200 bg-white px-5 py-3">
            {followUpError && !followUpLoading && (
              <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{followUpError}</p>
                {followUpInsufficient && (
                  <Link href="/dashboard/ai-points" className="mt-1 inline-block font-semibold text-indigo-700 hover:underline">
                    Buy AI points
                  </Link>
                )}
              </div>
            )}
            <label className="sr-only" htmlFor="ai-analyzer-follow-up">
              Ask a follow-up
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="ai-analyzer-follow-up"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    submitFollowUp()
                  }
                }}
                rows={2}
                disabled={followUpLoading}
                placeholder="Ask a follow-up…"
                className="min-h-[44px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
              <button
                type="button"
                disabled={!canSend}
                onClick={submitFollowUp}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                aria-label="Send follow-up"
              >
                {followUpLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Enter to send · Shift+Enter for a new line
              {balance ? ` · costs ${balance.config.points_per_request} pt${balance.config.points_per_request === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        )}

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

function ChatBubble({ role, content }: { role: BusinessAiChatMessage["role"]; content: string }) {
  const isUser = role === "user"
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3 py-2 text-sm leading-relaxed text-white"
            : "max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2 text-sm leading-relaxed text-slate-800"
        }
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
