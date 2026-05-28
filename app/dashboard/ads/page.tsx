"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { setAdAccount, setCampaigns } from "@/lib/store/slices/adsSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Megaphone, Wallet, BarChart3 } from "lucide-react"
import { fetchAdAccount, fetchAdCampaigns } from "@/lib/ads-api"
import { toast } from "sonner"

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
        <p className="text-muted-foreground">You do not have permission to view ads.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ads & Promotions</h1>
            <p className="text-muted-foreground">Promote your property with sponsored listings</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/ads/fund">Fund balance</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/ads/campaigns/new">New campaign</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ads balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "—" : `₦${(account?.ads_balance ?? 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime spend ₦{(account?.lifetime_spend ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active campaigns</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Withdrawable</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{(account?.withdrawable_balance ?? 0).toLocaleString()}
              </div>
              <CardDescription className="mt-1">Available to transfer into ads wallet</CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            ) : (
              <ul className="divide-y">
                {campaigns.slice(0, 5).map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.status.replace("_", " ")}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/ads/campaigns/detail?id=${c.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/ads/campaigns">View all campaigns</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
