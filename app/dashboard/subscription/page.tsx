"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { openPaystackCardCheckout, type PaystackInitResponse } from "@/lib/paystack"
import { toast } from "sonner"
import { format } from "date-fns"

type PlanKey = "quarterly" | "biannual" | "annual"

type SubscriptionPayment = {
  reference_code: string
  plan: string | null
  amount: number
  paid_at: string
  period_ends_at: string | null
}

type SubscriptionSnapshot = {
  status: "trialing" | "active" | "expired"
  walk_in_open: boolean
  trial_ends_at: string
  current_period_ends_at: string | null
  access_until: string | null
  plan: PlanKey | null
  auto_renew: boolean
  card_on_file: boolean
  prices: Record<PlanKey, number>
  payments: SubscriptionPayment[]
}

const PLAN_COPY: Record<PlanKey, { title: string; length: string; months: number }> = {
  quarterly: { title: "Quarterly", length: "3 months", months: 3 },
  biannual: { title: "Bi-annual", length: "6 months", months: 6 },
  annual: { title: "Annual", length: "12 months", months: 12 },
}

const PLAN_INCLUDES = [
  "Staff reservations stay open",
  "Restaurant orders stay open",
]

const PLAN_RANK: Record<PlanKey, number> = {
  quarterly: 1,
  biannual: 2,
  annual: 3,
}

function naira(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG")}`
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return format(date, "d MMM yyyy")
}

export default function SubscriptionPage() {
  const router = useRouter()
  const { user, businessId } = useAuth()
  const canManage = user?.role === "admin" || user?.isAdmin || !!user?.permissions?.subscription?.manage
  const canView = canManage || !!user?.permissions?.subscription?.view
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [payingPlan, setPayingPlan] = useState<PlanKey | null>(null)
  const [savingAuto, setSavingAuto] = useState(false)
  const [renewPrompt, setRenewPrompt] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const token = getAuthToken()
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/subscription`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Failed to load subscription")
    }
    setSubscription(data.subscription)
  }, [businessId])

  useEffect(() => {
    if (user && !canView) {
      router.replace("/dashboard")
    }
  }, [user, canView, router])

  useEffect(() => {
    if (!canView || !businessId) return
    let cancelled = false
    setLoading(true)
    load()
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canView, businessId, load])

  const pay = async (plan: PlanKey) => {
    if (!businessId || !canManage) return
    const price = subscription?.prices[plan] ?? 0
    if (price <= 0) {
      toast.error("This plan is not available yet")
      return
    }

    try {
      setPayingPlan(plan)
      const token = getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/subscription/initialize_payment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        }
      )
      const init = (await response.json()) as PaystackInitResponse & { error?: string }
      if (!response.ok) {
        throw new Error(init.error || "Could not start payment")
      }

      openPaystackCardCheckout(init, {
        email: user?.email || init.email,
        onClose: () => setPayingPlan(null),
        onSuccess: async (reference) => {
          try {
            const verify = await fetch(
              `${API_URL}/api/v1/user_businesses/${businessId}/subscription/verify_payment`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ reference }),
              }
            )
            const result = await verify.json()
            if (!verify.ok) {
              throw new Error(result.error || "Payment verification failed")
            }
            setSubscription(result.subscription)
            toast.success(result.reference_code ? `Paid ${result.reference_code}` : "Subscription payment received")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment verification failed")
          } finally {
            setPayingPlan(null)
          }
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed")
      setPayingPlan(null)
    }
  }

  const toggleAutoRenew = async (enabled: boolean) => {
    if (!businessId || !canManage || !subscription) return
    setSavingAuto(true)
    try {
      const token = getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/subscription`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ auto_renew: enabled }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not update automatic renewal")
      setSubscription(data.subscription)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update automatic renewal")
    } finally {
      setSavingAuto(false)
    }
  }

  const quarterlyMonthly =
    subscription && subscription.prices.quarterly > 0 ? subscription.prices.quarterly / PLAN_COPY.quarterly.months : 0
  const bestValuePlan = (Object.keys(PLAN_COPY) as PlanKey[]).reduce<PlanKey | null>((best, plan) => {
    const price = subscription?.prices[plan] ?? 0
    if (price <= 0) return best
    if (!best) return plan
    const bestPrice = subscription?.prices[best] ?? 0
    const monthly = price / PLAN_COPY[plan].months
    const bestMonthly = bestPrice / PLAN_COPY[best].months
    return monthly < bestMonthly ? plan : best
  }, null)
  const renewPlan = subscription?.plan
  const renewPrice = renewPlan ? subscription.prices[renewPlan] ?? 0 : 0
  const renewEnd = formatWhen(subscription?.current_period_ends_at || subscription?.access_until)

  const statusCopy =
    subscription?.status === "active"
      ? `Paid through ${formatWhen(subscription.current_period_ends_at)}`
      : subscription?.status === "trialing"
        ? `Free trial until ${formatWhen(subscription.trial_ends_at)}`
        : "Staff reservations and restaurant orders are locked until you subscribe"

  return (
    <DashboardLayout activeTab="subscription">
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Billing</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Business subscription</h1>
            <p className="mt-1 text-sm text-slate-500">
              A subscription keeps staff reservations and restaurant orders open.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : subscription ? (
            <>
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  subscription.walk_in_open
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                <p className="font-medium">{statusCopy}</p>
                {subscription.access_until && (
                  <p className="mt-1 text-xs opacity-80">Access until {formatWhen(subscription.access_until)}</p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {(Object.keys(PLAN_COPY) as PlanKey[]).map((plan) => {
                  const price = subscription.prices[plan] ?? 0
                  const paidActive = subscription.status === "active" && !!subscription.plan
                  const current = paidActive && subscription.plan === plan
                  const shorter =
                    paidActive &&
                    !!subscription.plan &&
                    PLAN_RANK[plan] < PLAN_RANK[subscription.plan]
                  const longer =
                    paidActive &&
                    !!subscription.plan &&
                    PLAN_RANK[plan] > PLAN_RANK[subscription.plan]
                  const perMonth = price > 0 ? Math.round(price / PLAN_COPY[plan].months) : 0
                  const yearlySavings =
                    quarterlyMonthly > 0 && price > 0
                      ? Math.round(quarterlyMonthly * 12 - perMonth * 12)
                      : 0
                  const showBestValue = bestValuePlan === plan && yearlySavings > 0
                  return (
                    <div
                      key={plan}
                      className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${
                        current ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{PLAN_COPY[plan].title}</p>
                          <p className="text-xs text-slate-500">Billed every {PLAN_COPY[plan].length}</p>
                        </div>
                        {current ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            Current
                          </span>
                        ) : showBestValue ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Best value
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                        {price > 0 ? naira(price) : "Not set"}
                      </p>
                      {perMonth > 0 && (
                        <p className="text-xs text-slate-500">{naira(perMonth)} per month</p>
                      )}
                      {yearlySavings > 0 && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          Save {naira(yearlySavings)} a year compared with quarterly
                        </p>
                      )}
                      <ul className="mt-4 space-y-2">
                        {PLAN_INCLUDES.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      {current && (
                        <p className="mt-3 text-xs font-medium text-indigo-700">
                          Paid through {formatWhen(subscription.current_period_ends_at)}
                        </p>
                      )}
                      {longer && (
                        <p className="mt-3 text-xs text-slate-500">
                          Unused time on the current plan is added to the new end date.
                        </p>
                      )}
                      {shorter && (
                        <p className="mt-3 text-xs text-slate-500">
                          Available after {formatWhen(subscription.current_period_ends_at)}.
                        </p>
                      )}
                      <Button
                        type="button"
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                        disabled={!canManage || price <= 0 || payingPlan !== null || current || shorter}
                        onClick={() => void pay(plan)}
                      >
                        {payingPlan === plan ? (
                          <LoadingSpinner size={16} className="text-white" />
                        ) : current ? (
                          "Current plan"
                        ) : longer ? (
                          "Upgrade"
                        ) : (
                          "Pay"
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <Label htmlFor="auto-renew" className="text-sm font-medium text-slate-900">
                    Automatic renewal
                  </Label>
                  <p className="text-xs text-slate-500">
                    {subscription.card_on_file
                      ? "Charge the saved card when the paid period ends. Turn this off to pay manually each time."
                      : "Pay for a plan first. That saves a card you can renew automatically."}
                  </p>
                </div>
                <Switch
                  id="auto-renew"
                  checked={subscription.auto_renew}
                  disabled={!canManage || savingAuto || !subscription.card_on_file || !subscription.plan}
                  onCheckedChange={(checked) => setRenewPrompt(checked)}
                />
              </div>

              <ConfirmDialog
                open={renewPrompt !== null}
                onOpenChange={(open) => {
                  if (!open) setRenewPrompt(null)
                }}
                title={renewPrompt ? "Turn on automatic renewal" : "Turn off automatic renewal"}
                description={
                  renewPrompt
                    ? `The saved card will be charged ${naira(renewPrice)} for another ${renewPlan ? PLAN_COPY[renewPlan].length : "period"} when this period ends on ${renewEnd}.`
                    : `The saved card will not be charged on ${renewEnd}. After that date, new staff reservations and restaurant orders stay locked until you pay manually.`
                }
                confirmText={renewPrompt ? "Turn on" : "Turn off"}
                isDestructive={!renewPrompt}
                loading={savingAuto}
                onConfirm={() => toggleAutoRenew(renewPrompt === true)}
              />

              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">Payments</h2>
                </div>
                {subscription.payments.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500">No subscription payments yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {subscription.payments.map((payment) => (
                      <li key={payment.reference_code} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div>
                          <p className="font-mono text-slate-900">{payment.reference_code}</p>
                          <p className="text-xs text-slate-500">
                            {PLAN_COPY[payment.plan as PlanKey]?.title || payment.plan} · {formatWhen(payment.paid_at)}
                          </p>
                        </div>
                        <p className="font-medium text-slate-900">{naira(payment.amount)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  )
}
