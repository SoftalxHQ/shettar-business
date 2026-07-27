"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { fetchAdCampaign, updateAdCampaign, formatGeoTargets, type AdCampaign } from "@/lib/ads-api"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-900 text-right">{value}</span>
    </div>
  )
}

function AdCampaignDetailContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("id") || ""
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)

  const canManage = user?.role === "admin" || user?.permissions?.ads?.manage

  useEffect(() => {
    if (!businessId || !campaignId) return
    fetchAdCampaign(businessId, campaignId).then(setCampaign).catch((e) => toast.error(e.message))
  }, [businessId, campaignId])

  const updateStatus = async (status: string) => {
    if (!businessId || !campaignId) return
    try {
      const updated = await updateAdCampaign(businessId, campaignId, { status })
      setCampaign(updated)
      const label = updated.status.replace(/_/g, " ")
      if (status === "active" && updated.status === "pending_review") {
        toast.success("Campaign submitted for review")
      } else {
        toast.success(`Campaign ${label}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    }
  }

  if (!campaignId) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-xs text-slate-500">Campaign not found.</p>
      </DashboardLayout>
    )
  }

  if (!campaign) {
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
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden max-w-2xl">
        <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-1 gap-1.5 px-2 text-xs text-slate-500">
              <Link href="/dashboard/ads/campaigns">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{campaign.name}</h1>
            <p className="text-xs text-slate-500 capitalize">{campaign.status.replace("_", " ")}</p>
          </div>
          <div className="flex gap-2">
            {canManage && ["active", "paused", "pending_review", "draft"].includes(campaign.status) && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs">
                <Link href={`/dashboard/ads/campaigns/edit?id=${campaignId}`}>Edit</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs">
              <Link href={`/dashboard/ads/campaigns/reports?id=${campaignId}`}>Reports</Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Details</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-1">
            <DetailRow label="Billing" value={campaign.billing_model.toUpperCase()} />
            <DetailRow label="Spent" value={`₦${campaign.spent_amount.toLocaleString()}`} />
            {campaign.daily_budget != null && (
              <DetailRow label="Daily budget" value={`₦${campaign.daily_budget.toLocaleString()}`} />
            )}
            {campaign.total_budget != null && (
              <DetailRow label="Total budget" value={`₦${campaign.total_budget.toLocaleString()}`} />
            )}
            <DetailRow label="Max bid" value={`₦${campaign.max_bid.toLocaleString()}`} />
            <DetailRow label="Geo targeting" value={formatGeoTargets(campaign.target_geo)} />
            <DetailRow label="Placements" value={campaign.placements.join(", ")} />
            {campaign.rejection_reason && (
              <DetailRow label="Rejection" value={<span className="text-rose-600">{campaign.rejection_reason}</span>} />
            )}
          </div>
        </div>

        {canManage && (
          <div className="shrink-0 flex gap-2">
            {campaign.status !== "active" && (
              <Button size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs" onClick={() => updateStatus("active")}>
                Activate
              </Button>
            )}
            {campaign.status === "active" && (
              <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs" onClick={() => updateStatus("paused")}>
                Pause
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function AdCampaignDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout activeTab="ads">
          <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LoadingSpinner size={32} />
          </div>
        </DashboardLayout>
      }
    >
      <AdCampaignDetailContent />
    </Suspense>
  )
}
