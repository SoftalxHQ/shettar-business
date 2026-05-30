"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId } from "@/lib/store/slices/authSlice"
import { selectRealtimeCounters } from "@/lib/store/slices/adsSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  fetchAdCampaign,
  fetchCampaignStats,
  type AdCampaign,
  type CampaignStatsQuery,
  type CampaignStatsResponse,
} from "@/lib/ads-api"
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

type StatRow = CampaignStatsResponse["rows"][number]
type GeoRow = { state: string; city: string | null; impressions: number; clicks: number }

type RangePreset = "today" | "last7" | "all" | "pick_day"

function formatDateParam(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function todayParam(): string {
  return formatDateParam(new Date())
}

function buildStatsQuery(
  preset: RangePreset,
  pickedDay: string,
  campaign: AdCampaign | null
): CampaignStatsQuery {
  const today = todayParam()

  switch (preset) {
    case "today":
      return { from: today, to: today, granularity: "hour" }
    case "last7": {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return { from: formatDateParam(start), to: formatDateParam(end), granularity: "day" }
    }
    case "pick_day": {
      const day = pickedDay || today
      return { from: day, to: day, granularity: "hour" }
    }
    case "all":
    default: {
      let from = formatDateParam(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      if (campaign?.starts_at) {
        const start = new Date(campaign.starts_at)
        if (!Number.isNaN(start.getTime())) {
          from = formatDateParam(start)
        }
      }
      return { from, to: today, granularity: "day" }
    }
  }
}

function chartSubtitle(preset: RangePreset, granularity: string, pickedDay: string): string {
  switch (preset) {
    case "today":
      return "Today by hour (Africa/Lagos)"
    case "pick_day":
      return `${pickedDay} by hour (Africa/Lagos)`
    case "last7":
      return "Last 7 days by day"
    case "all":
      return "All time by day"
    default:
      return granularity === "hour" ? "By hour" : "By day"
  }
}

function AdCampaignReportsContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("id") || ""
  const businessId = useAppSelector(selectBusinessId)
  const realtime = useAppSelector(selectRealtimeCounters)
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [rangePreset, setRangePreset] = useState<RangePreset>("today")
  const [pickedDay, setPickedDay] = useState(todayParam())
  const [rows, setRows] = useState<StatRow[]>([])
  const [geoRows, setGeoRows] = useState<GeoRow[]>([])
  const [totals, setTotals] = useState({
    impressions: 0,
    clicks: 0,
    spend: 0,
    roas: 0,
  })
  const [granularity, setGranularity] = useState<"day" | "hour">("hour")
  const [loading, setLoading] = useState(true)

  useAdAnalyticsCable(businessId, true)

  const live = realtime[Number(campaignId)]

  const statsQuery = useMemo(
    () => buildStatsQuery(rangePreset, pickedDay, campaign),
    [rangePreset, pickedDay, campaign]
  )

  const loadStats = useCallback(async () => {
    if (!businessId || !campaignId) return
    setLoading(true)
    try {
      const data = await fetchCampaignStats(businessId, campaignId, statsQuery)
      setRows(data.rows || [])
      setGeoRows(data.geo || [])
      setTotals({
        impressions: data.totals?.impressions ?? 0,
        clicks: data.totals?.clicks ?? 0,
        spend: data.totals?.spend ?? 0,
        roas: data.totals?.roas ?? 0,
      })
      setGranularity(data.granularity === "hour" ? "hour" : "day")
    } catch {
      setRows([])
      setGeoRows([])
      setTotals({ impressions: 0, clicks: 0, spend: 0, roas: 0 })
    } finally {
      setLoading(false)
    }
  }, [businessId, campaignId, statsQuery])

  useEffect(() => {
    if (!businessId || !campaignId) return
    fetchAdCampaign(businessId, campaignId)
      .then(setCampaign)
      .catch(() => setCampaign(null))
  }, [businessId, campaignId])

  useEffect(() => {
    loadStats()
  }, [
    loadStats,
    live?.impressions,
    live?.clicks,
    live?.spend,
    live?.roas,
  ])

  const xTickFormatter = useCallback(
    (v: string) => {
      if (granularity === "hour") return String(v)
      return String(v).slice(5, 10)
    },
    [granularity]
  )

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
              {totals.impressions.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clicks</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{totals.clicks.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Spend</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">₦{totals.spend.toLocaleString()}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ROAS</CardTitle>
              <p className="text-xs text-muted-foreground font-normal leading-snug">
                ₦ booking revenue per ₦1 ad spend
              </p>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              ₦{totals.roas.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Performance</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {chartSubtitle(rangePreset, granularity, pickedDay)}
                </p>
              </div>
              <Tabs
                value={rangePreset}
                onValueChange={(v) => setRangePreset(v as RangePreset)}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid w-full grid-cols-4 sm:w-auto">
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="last7">Last 7 days</TabsTrigger>
                  <TabsTrigger value="all">All time</TabsTrigger>
                  <TabsTrigger value="pick_day">Pick a day</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {rangePreset === "pick_day" && (
              <div className="flex items-center gap-3 max-w-xs">
                <Label htmlFor="stats-day" className="shrink-0 text-sm">
                  Date
                </Label>
                <Input
                  id="stats-day"
                  type="date"
                  max={todayParam()}
                  value={pickedDay}
                  onChange={(e) => setPickedDay(e.target.value)}
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner size={28} />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data for this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={xTickFormatter} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => String(v)} />
                  <Line type="monotone" dataKey="impressions" stroke="#6366f1" name="Impressions" />
                  <Line type="monotone" dataKey="clicks" stroke="#22c55e" name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            )}
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
