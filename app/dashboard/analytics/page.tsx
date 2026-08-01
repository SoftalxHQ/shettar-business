"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Star, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { getAuthToken } from "@/lib/storage"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfToday, endOfToday } from "date-fns"
import { BusinessAiAnalyzerButton } from "@/components/business-ai-analyzer-button"
import { useAppSelector } from "@/lib/store/hooks"
import { selectUser } from "@/lib/store/slices/authSlice"

function MetricTile({
  title,
  value,
  change,
  trend,
  icon: Icon,
}: {
  title: string
  value: string
  change?: string
  trend?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none">{value}</p>
      {change != null && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[11px] font-medium",
            trend === "up" ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{change}</span>
          <span className="text-slate-400 font-normal">vs prior</span>
        </div>
      )}
    </div>
  )
}

function SecondaryStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-base font-semibold tabular-nums text-slate-900 mt-0.5">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { businessId, logout } = useAuth()
  const user = useAppSelector(selectUser)
  const canRunAi = user?.role === "admin" || !!user?.permissions?.ai_analyzer?.run

  const [rangeSelection, setRangeSelection] = useState("This month")
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const setRange = (range: string) => {
    const today = new Date()
    setRangeSelection(range)
    setIsCustomMode(false)

    if (range !== "Custom") {
      setPopoverOpen(false)
    }

    switch (range) {
      case "Today":
        setStartDate(startOfToday())
        setEndDate(endOfToday())
        break
      case "Last 7 days":
        setStartDate(subDays(today, 6))
        setEndDate(today)
        break
      case "This month":
        setStartDate(startOfMonth(today))
        setEndDate(endOfMonth(today))
        break
      case "Last month":
        const lastMonth = subMonths(today, 1)
        setStartDate(startOfMonth(lastMonth))
        setEndDate(endOfMonth(lastMonth))
        break
      case "All time":
        setStartDate(undefined)
        setEndDate(undefined)
        break
      case "Custom":
        setIsCustomMode(true)
        break
    }
  }

  const applyCustomFilter = () => {
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate)
      setEndDate(tempEndDate)
      setRangeSelection("Custom")
      setPopoverOpen(false)
    }
  }

  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams()
      if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"))
      if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"))
      if (rangeSelection !== "Custom") params.append("range", rangeSelection)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}/analytics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Business-Id": businessId || "",
        },
      })
      if (response.status === 401) {
        logout(true)
        return
      }

      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate, businessId])

  const dateRangeControl = (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-3 flex items-center gap-3 border-slate-200 bg-white hover:bg-slate-50 rounded-xl justify-between min-w-[150px] shrink-0"
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Period</span>
            <span className="font-medium text-slate-700 text-sm">{rangeSelection}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", popoverOpen && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1.5 rounded-xl shadow-sm border-slate-200" align="end">
        <div className="space-y-0.5">
          {[
            { label: "Today", value: format(new Date(), "d MMM") },
            { label: "Last 7 days", value: `${format(subDays(new Date(), 6), "d MMM")} - ${format(new Date(), "d MMM")}` },
            { label: "This month", value: format(new Date(), "MMM") },
            { label: "Last month", value: format(subMonths(new Date(), 1), "MMM") },
            { label: "All time", value: "" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setRange(item.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                rangeSelection === item.label ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-400 font-normal">{item.value}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRange("Custom")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCustomMode || rangeSelection === "Custom" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <span>Custom Range</span>
          </button>
          {(isCustomMode || rangeSelection === "Custom") && (
            <div className="p-3 mt-1 bg-slate-50 rounded-lg space-y-3 border border-slate-100">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Start date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-9 px-3 bg-white border-slate-200 rounded-lg text-sm">
                      {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl border-slate-200" align="start">
                    <CalendarComponent mode="single" selected={tempStartDate} onSelect={setTempStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">End date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-9 px-3 bg-white border-slate-200 rounded-lg text-sm">
                      {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl border-slate-200" align="start">
                    <CalendarComponent mode="single" selected={tempEndDate} onSelect={setTempEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg" onClick={applyCustomFilter}>
                  Apply
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 h-8 rounded-lg" onClick={() => setIsCustomMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )

  if (isLoading && !analyticsData) {
    return (
      <DashboardLayout activeTab="analytics">
        <div className="h-full min-h-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={36} />
        </div>
      </DashboardLayout>
    )
  }

  const metrics = analyticsData?.metrics || {}
  const charts = analyticsData?.charts || {}
  const summary = analyticsData?.bookings_summary || {}

  const revenueData =
    charts.revenue_trends?.map((item: any) => ({
      date: item.label,
      revenue: item.value,
    })) || []

  const bookingsData =
    charts.booking_trends?.map((item: any) => ({
      month: item.label,
      bookings: item.value,
    })) || []

  const roomTypeData = charts.room_type_performance || []
  const topRevenueSourcesData = charts.top_revenue_sources || []
  const guestDemographicsData = charts.guest_demographics || []

  const chartTooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    boxShadow: "none",
    padding: "8px 12px",
    fontSize: "12px",
  }

  return (
    <DashboardLayout activeTab="analytics">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <BusinessAiAnalyzerButton
              businessId={businessId}
              canRun={canRunAi}
              page="analytics"
              filters={{
                range:
                  rangeSelection === "Custom"
                    ? undefined
                    : rangeSelection,
                start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
              }}
            />
            {dateRangeControl}
          </div>
        </div>

        <div className="shrink-0 grid gap-3 grid-cols-2 xl:grid-cols-4">
          <MetricTile
            title="Total Revenue"
            value={`₦${Number(metrics.total_revenue?.value || 0).toLocaleString()}`}
            change={metrics.total_revenue?.change?.percentage}
            trend={metrics.total_revenue?.change?.trend}
            icon={DollarSign}
          />
          <MetricTile
            title="Occupancy Rate"
            value={`${metrics.occupancy_rate?.value || 0}%`}
            change={metrics.occupancy_rate?.change?.percentage}
            trend={metrics.occupancy_rate?.change?.trend}
            icon={Percent}
          />
          <MetricTile
            title="Avg Daily Rate"
            value={`₦${Number(metrics.avg_daily_rate?.value || 0).toLocaleString()}`}
            change={metrics.avg_daily_rate?.change?.percentage}
            trend={metrics.avg_daily_rate?.change?.trend}
            icon={BarChart3}
          />
          <MetricTile
            title="Guest Rating"
            value={`${metrics.guest_rating?.value || 0}`}
            change={metrics.guest_rating?.change?.percentage}
            trend={metrics.guest_rating?.change?.trend}
            icon={Star}
          />
        </div>

        <Tabs defaultValue="revenue" className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <TabsList className="shrink-0 h-9 w-fit">
            <TabsTrigger value="revenue" className="text-sm">Revenue</TabsTrigger>
            <TabsTrigger value="bookings" className="text-sm">Bookings</TabsTrigger>
            <TabsTrigger value="performance" className="text-sm">Performance</TabsTrigger>
          </TabsList>

          <TabsContent
            value="revenue"
            className="mt-0 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden data-[state=inactive]:hidden"
          >
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Daily revenue</p>
                <p className="text-[11px] text-slate-500">Income flow over the selected period</p>
              </div>
              <div className="flex-1 min-h-0 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} dy={8} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      dx={-6}
                      width={56}
                      tickFormatter={(value) => `₦${value}`}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ color: "#1e293b", fontWeight: 600 }}
                      formatter={(value: number) => [`₦${value}`, "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="shrink-0 grid gap-2 sm:grid-cols-3">
              <SecondaryStat label="RevPAR" value={`₦${Number(metrics.revpar || 0).toLocaleString()}`} hint="Revenue per available room" />
              <SecondaryStat label="ADR" value={`₦${Number(metrics.avg_daily_rate?.value || 0).toLocaleString()}`} hint="Average daily rate" />
              <SecondaryStat label="Avg LOS" value={`${metrics.avg_los || 0}`} hint="Nights per stay" />
            </div>
          </TabsContent>

          <TabsContent
            value="bookings"
            className="mt-0 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden data-[state=inactive]:hidden"
          >
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Booking trends</p>
              </div>
              <div className="flex-1 min-h-0 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} dx={-6} width={40} />
                    <Tooltip cursor={{ fill: "#F8FAFC" }} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="bookings" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="shrink-0 grid gap-2 sm:grid-cols-3">
              <SecondaryStat label="Total" value={`${summary.total || 0}`} hint="Reservations in period" />
              <SecondaryStat label="Confirmed" value={`${summary.confirmed || 0}`} hint="Pending check-in" />
              <SecondaryStat label="Checked in" value={`${summary.checked_in || 0}`} hint="Current guests" />
            </div>
          </TabsContent>

          <TabsContent
            value="performance"
            className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden"
          >
            <div className="h-full min-h-0 grid lg:grid-cols-2 gap-3 overflow-hidden">
              <div className="min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">Room type performance</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
                  {roomTypeData.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No room type data</p>
                  ) : (
                    roomTypeData.map((room: any) => (
                      <div key={room.type} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-slate-900">{room.type}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                {room.bookings} bookings
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums text-slate-900">₦{room.revenue.toLocaleString()}</p>
                            <p className="text-[10px] uppercase tracking-wide text-slate-400">Revenue</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${room.utilization || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Avg ₦{Math.round(room.revenue / (room.bookings || 1)).toLocaleString()}</span>
                          <span>{room.utilization || 0}% share</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Top revenue sources</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2">
                    {topRevenueSourcesData.length > 0 ? (
                      topRevenueSourcesData.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.color || "bg-indigo-500")} />
                            <span className="text-sm text-slate-700 truncate">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-slate-900 shrink-0 ml-2">{item.val}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-6">No data available</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Guest demographics</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2">
                    {guestDemographicsData.length > 0 ? (
                      guestDemographicsData.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.color || "bg-emerald-500")} />
                            <span className="text-sm text-slate-700 truncate">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-slate-900 shrink-0 ml-2">{item.val}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-6">No data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
