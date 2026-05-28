"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId } from "@/lib/store/slices/authSlice"
import { selectRealtimeCounters } from "@/lib/store/slices/adsSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { fetchCampaignStats } from "@/lib/ads-api"
import { useAdAnalyticsCable } from "@/lib/hooks/useAdAnalyticsCable"
import { ArrowLeft } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type StatRow = { date: string; impressions: number; clicks: number; spend: number; roas: number }
type GeoRow = { state: string; city: string | null; impressions: number; clicks: number }

function AdCampaignReportsContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("id") || ""
  const businessId = useAppSelector(selectBusinessId)
  const realtime = useAppSelector(selectRealtimeCounters)
  const [rows, setRows] = useState<StatRow[]>([])
  const [geoRows, setGeoRows] = useState<GeoRow[]>([])
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, spend: 0, roas: 0 })

  useAdAnalyticsCable(businessId, true)

  useEffect(() => {
    if (!businessId || !campaignId) return
    fetchCampaignStats(businessId, campaignId)
      .then((data) => {
        setRows(data.rows || [])
        setGeoRows(data.geo || [])
        setTotals(data.totals || { impressions: 0, clicks: 0, spend: 0, roas: 0 })
      })
      .catch(() => {})
  }, [businessId, campaignId, realtime[Number(campaignId)]])

  const live = realtime[Number(campaignId)]

  if (!campaignId) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-muted-foreground">Campaign not found.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="space-y-6">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href={`/dashboard/ads/campaigns/detail?id=${campaignId}`}>
            <ArrowLeft className="h-4 w-4" /> Back to campaign
          </Link>
        </Button>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Impressions</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {(live?.impressions ?? totals.impressions).toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clicks</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {(live?.clicks ?? totals.clicks).toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Spend</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              ₦{(live?.spend ?? totals.spend).toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ROAS</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {(live?.roas ?? totals.roas).toFixed(2)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily performance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5, 10)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="impressions" stroke="#6366f1" name="Impressions" />
                <Line type="monotone" dataKey="clicks" stroke="#22c55e" name="Clicks" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by location</CardTitle>
          </CardHeader>
          <CardContent>
            {geoRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No location data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">State</th>
                      <th className="py-2 pr-4">City</th>
                      <th className="py-2 pr-4">Impressions</th>
                      <th className="py-2">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geoRows.map((row, idx) => (
                      <tr key={`${row.state}-${row.city}-${idx}`} className="border-b last:border-0">
                        <td className="py-2 pr-4">{row.state}</td>
                        <td className="py-2 pr-4">{row.city || "—"}</td>
                        <td className="py-2 pr-4">{row.impressions.toLocaleString()}</td>
                        <td className="py-2">{row.clicks.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function AdCampaignReportsPage() {
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
      <AdCampaignReportsContent />
    </Suspense>
  )
}
