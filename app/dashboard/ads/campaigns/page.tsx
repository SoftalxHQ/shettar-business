"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchAdCampaigns, formatGeoTargets, type AdCampaign } from "@/lib/ads-api"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function AdsCampaignsPage() {
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const canView = user?.role === "admin" || user?.permissions?.ads?.view || user?.permissions?.ads?.manage
  const canManage = user?.role === "admin" || user?.permissions?.ads?.manage

  useEffect(() => {
    if (!businessId || !canView) return
    fetchAdCampaigns(businessId)
      .then(setCampaigns)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [businessId, canView])

  return (
    <DashboardLayout activeTab="ads">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href="/dashboard/ads">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Campaigns</h1>
          {canManage && (
            <Button asChild>
              <Link href="/dashboard/ads/campaigns/new">New campaign</Link>
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-muted-foreground">No campaigns yet.</p>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{c.name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">{c.status.replace("_", " ")}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/ads/campaigns/detail?id=${c.id}`}>Details</Link>
                  </Button>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Spent ₦{c.spent_amount.toLocaleString()} · {formatGeoTargets(c.target_geo)} · Placements:{" "}
                  {c.placements.join(", ")}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
