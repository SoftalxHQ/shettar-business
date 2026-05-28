"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { fetchAdCampaign, updateAdCampaign, formatGeoTargets, type AdCampaign } from "@/lib/ads-api"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

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
        <p className="text-muted-foreground">Campaign not found.</p>
      </DashboardLayout>
    )
  }

  if (!campaign) {
    return (
      <DashboardLayout activeTab="ads">
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="space-y-4 max-w-2xl">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href="/dashboard/ads/campaigns">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground capitalize">{campaign.status.replace("_", " ")}</p>
          </div>
          <div className="flex gap-2">
            {canManage && ["active", "paused", "pending_review", "draft"].includes(campaign.status) && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/ads/campaigns/edit?id=${campaignId}`}>Edit</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/dashboard/ads/campaigns/reports?id=${campaignId}`}>Reports</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Billing: {campaign.billing_model.toUpperCase()}</p>
            <p>Spent: ₦{campaign.spent_amount.toLocaleString()}</p>
            {campaign.daily_budget != null && (
              <p>Daily budget: ₦{campaign.daily_budget.toLocaleString()}</p>
            )}
            {campaign.total_budget != null && (
              <p>Total budget: ₦{campaign.total_budget.toLocaleString()}</p>
            )}
            <p>Max bid: ₦{campaign.max_bid.toLocaleString()}</p>
            <p>Geo targeting: {formatGeoTargets(campaign.target_geo)}</p>
            <p>Placements: {campaign.placements.join(", ")}</p>
            {campaign.rejection_reason && (
              <p className="text-destructive">Rejection: {campaign.rejection_reason}</p>
            )}
          </CardContent>
        </Card>

        {canManage && (
          <div className="flex gap-2">
            {campaign.status !== "active" && (
              <Button onClick={() => updateStatus("active")}>Activate</Button>
            )}
            {campaign.status === "active" && (
              <Button variant="outline" onClick={() => updateStatus("paused")}>
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
          <div className="flex justify-center py-12">
            <LoadingSpinner size={32} />
          </div>
        </DashboardLayout>
      }
    >
      <AdCampaignDetailContent />
    </Suspense>
  )
}
