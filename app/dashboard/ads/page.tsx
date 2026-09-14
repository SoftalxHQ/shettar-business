"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { setAdAccount, setCampaigns } from "@/lib/store/slices/adsSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Megaphone, Wallet, BarChart3 } from "lucide-react"
import { fetchAdAccount, fetchAdCampaigns } from "@/lib/ads-api"
import { toast } from "sonner"

function MetricTile({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-2.5 py-2.5 sm:px-3.5 sm:py-3 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{title}</p>
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </div>
      <p className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none truncate">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-1.5 truncate">{hint}</p>}
    </div>
  )
}

export default function AdsOverviewPage() {
  const dispatch = useAppDispatch()
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [loading, setLoading] = useState(true)

  const canView = user?.role === "admin" || user?.permissions?.ads?.view || user?.permissions?.ads?.manage
  const canManage = user?.role === "admin" || user?.permissions?.ads?.manage

  useEffect(() => {
    if (!businessId || !canView) return
    ;(async () => {
      try {
        const [account, campaigns] = await Promise.all([
          fetchAdAccount(businessId),
          fetchAdCampaigns(businessId),
        ])
        dispatch(setAdAccount(account))
        dispatch(setCampaigns(campaigns))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load ads")
      } finally {
        setLoading(false)
      }
    })()
  }, [businessId, canView, dispatch])

  const account = useAppSelector((s) => s.ads.adAccount)
  const campaigns = useAppSelector((s) => s.ads.campaigns)
  const activeCount = campaigns.filter((c) => c.status === "active").length

  if (!canView) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-xs text-slate-500">You do not have permission to view ads.</p>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="ads">
        <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">Ads & Promotions</h1>
            <p className="text-xs text-slate-500">Promote your property with sponsored listings</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs flex-1 sm:flex-none">
                <Link href="/dashboard/ads/fund">Fund balance</Link>
              </Button>
              <Button asChild size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs flex-1 sm:flex-none">
                <Link href="/dashboard/ads/campaigns/new">New campaign</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="shrink-0 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3 min-w-0">
          <MetricTile
            title="Ads balance"
            value={`₦${(account?.ads_balance ?? 0).toLocaleString()}`}
            hint={`Lifetime spend ₦${(account?.lifetime_spend ?? 0).toLocaleString()}`}
            icon={Wallet}
          />
          <MetricTile
            title="Active campaigns"
            value={String(activeCount)}
            icon={Megaphone}
          />
          <MetricTile
            title="Withdrawable"
            value={`₦${(account?.withdrawable_balance ?? 0).toLocaleString()}`}
            hint="Available to transfer into ads wallet"
            icon={BarChart3}
          />
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2.5 sm:px-3.5 py-2.5 border-b border-slate-100 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Recent campaigns</p>
              <p className="text-[11px] text-slate-500">Latest ad campaigns</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700 self-start sm:self-auto">
              <Link href="/dashboard/ads/campaigns">View all</Link>
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {campaigns.length === 0 ? (
              <p className="px-2.5 sm:px-3.5 py-6 text-xs text-slate-500">No campaigns yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {campaigns.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-2.5 sm:px-3.5 py-2.5 hover:bg-slate-50/60 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{c.status.replace("_", " ")}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 text-xs">
                      <Link href={`/dashboard/ads/campaigns/detail?id=${c.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
