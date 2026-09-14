"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId } from "@/lib/store/slices/authSlice"
import { selectRealtimeCounters } from "@/lib/store/slices/adsSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
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
type DeviceRow = {
  platform: string
  os: string
  device_type: string
  impressions: number
  clicks: number
}

type RangePreset = "today" | "last7" | "all" | "pick_day"

function MetricTile({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-2.5 py-2.5 sm:px-3.5 sm:py-3 min-w-0 overflow-hidden">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{title}</p>
      <p className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none mt-2 truncate">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-1.5 leading-snug line-clamp-2">{hint}</p>}
    </div>
  )
}

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
  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([])
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
      setDeviceRows(data.devices || [])
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
      setDeviceRows([])
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
        <p className="text-xs text-slate-500">Campaign not found.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="ads">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden">
        <div className="shrink-0 min-w-0">
          <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-1 gap-1.5 px-2 text-xs text-slate-500">
            <Link href={`/dashboard/ads/campaigns/detail?id=${campaignId}`}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to campaign
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate min-w-0">
            {campaign?.name ?? "Campaign reports"}
          </h1>
          <p className="text-xs text-slate-500">Performance metrics and breakdowns</p>
        </div>

        <div className="shrink-0 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 min-w-0">
          <MetricTile title="Impressions" value={totals.impressions.toLocaleString()} />
          <MetricTile title="Clicks" value={totals.clicks.toLocaleString()} />
          <MetricTile title="Spend" value={`₦${totals.spend.toLocaleString()}`} />
          <MetricTile
            title="ROAS"
            value={`₦${totals.roas.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            hint="₦ booking revenue per ₦1 ad spend"
          />
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden">
          <div className="flex-1 min-h-[240px] min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="shrink-0 flex flex-col gap-3 border-b border-slate-100 px-2.5 sm:px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Performance</p>
                <p className="text-[11px] text-slate-500">{chartSubtitle(rangePreset, granularity, pickedDay)}</p>
              </div>
              <Tabs
                value={rangePreset}
                onValueChange={(v) => setRangePreset(v as RangePreset)}
                className="w-full sm:w-auto min-w-0"
              >
                <TabsList className="h-auto w-full flex flex-wrap gap-1 sm:grid sm:h-8 sm:grid-cols-4 sm:w-auto">
                  <TabsTrigger value="today" className="text-[10px] sm:text-xs flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Today</TabsTrigger>
                  <TabsTrigger value="last7" className="text-[10px] sm:text-xs flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Last 7 days</TabsTrigger>
                  <TabsTrigger value="all" className="text-[10px] sm:text-xs flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">All time</TabsTrigger>
                  <TabsTrigger value="pick_day" className="text-[10px] sm:text-xs flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0">Pick a day</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {rangePreset === "pick_day" && (
              <div className="shrink-0 flex items-center gap-3 border-b border-slate-100 px-2.5 sm:px-3.5 py-2 min-w-0">
                <Label htmlFor="stats-day" className="shrink-0 text-xs text-slate-600">
                  Date
                </Label>
                <Input
                  id="stats-day"
                  type="date"
                  max={todayParam()}
                  value={pickedDay}
                  onChange={(e) => setPickedDay(e.target.value)}
                  className="h-8 max-w-full sm:max-w-[180px] rounded-lg border-slate-200 text-xs min-w-0"
                />
              </div>
            )}
            <div className="flex-1 min-h-[180px] min-w-0 p-2.5 sm:p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner size={28} />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">No data for this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tickFormatter={xTickFormatter} interval="preserveStartEnd" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => String(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Line type="monotone" dataKey="impressions" stroke="#6366f1" name="Impressions" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="clicks" stroke="#22c55e" name="Clicks" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="shrink-0 grid gap-3 grid-cols-1 lg:grid-cols-2 min-h-[200px] max-h-none sm:max-h-[280px] min-w-0">
            <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="shrink-0 px-2.5 sm:px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Performance by location</p>
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
                {geoRows.length === 0 ? (
                  <p className="px-3.5 py-4 text-xs text-slate-500">No location data yet.</p>
                ) : (
                  <table className="w-full min-w-[360px] text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">State</th>
                        <th className="px-3 py-2">City</th>
                        <th className="px-3 py-2">Impressions</th>
                        <th className="px-3 py-2">Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geoRows.map((row, idx) => (
                        <tr key={`${row.state}-${row.city}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-slate-700 max-w-[96px] truncate">{row.state}</td>
                          <td className="px-3 py-2 text-slate-600 max-w-[96px] truncate">{row.city || "—"}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">{row.impressions.toLocaleString()}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">{row.clicks.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="shrink-0 px-2.5 sm:px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Performance by device</p>
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
                {deviceRows.length === 0 ? (
                  <p className="px-3.5 py-4 text-xs text-slate-500">No device data yet.</p>
                ) : (
                  <table className="w-full min-w-[480px] text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Platform</th>
                        <th className="px-3 py-2">OS</th>
                        <th className="px-3 py-2">Device</th>
                        <th className="px-3 py-2">Impressions</th>
                        <th className="px-3 py-2">Clicks</th>
                        <th className="px-3 py-2">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceRows.map((row, idx) => {
                        const ctr =
                          row.impressions > 0
                            ? `${((row.clicks / row.impressions) * 100).toFixed(1)}%`
                            : "—"
                        return (
                          <tr
                            key={`${row.platform}-${row.os}-${row.device_type}-${idx}`}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                          >
                            <td className="px-3 py-2 capitalize text-slate-700 max-w-[96px] truncate">{row.platform}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[96px] truncate">{row.os}</td>
                            <td className="px-3 py-2 capitalize text-slate-600 max-w-[96px] truncate">{row.device_type}</td>
                            <td className="px-3 py-2 tabular-nums text-slate-700">{row.impressions.toLocaleString()}</td>
                            <td className="px-3 py-2 tabular-nums text-slate-700">{row.clicks.toLocaleString()}</td>
                            <td className="px-3 py-2 tabular-nums text-slate-700">{ctr}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function AdCampaignReportsPage() {
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
      <AdCampaignReportsContent />
    </Suspense>
  )
}
