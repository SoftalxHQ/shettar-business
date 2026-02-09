"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Percent, BarChart3, Star, Clock } from "lucide-react"
import { MOCK_BOOKINGS, MOCK_PAYMENTS } from "@/lib/mock-data"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { getAuthToken } from "@/lib/storage"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ChevronDown } from "lucide-react"
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfToday, endOfToday } from "date-fns"

export default function AnalyticsPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()

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
          'Authorization': `Bearer ${token}`,
          'X-Business-Id': businessId || ''
        }
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

  if (isLoading && !analyticsData) {
    return (
      <DashboardLayout activeTab="analytics">
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size={44} />
        </div>
      </DashboardLayout>
    )
  }

  const metrics = analyticsData?.metrics || {}
  const charts = analyticsData?.charts || {}
  const summary = analyticsData?.bookings_summary || {}

  const revenueData = charts.revenue_trends?.map((item: any) => ({
    date: item.label,
    revenue: item.value
  })) || []

  const bookingsData = charts.booking_trends?.map((item: any) => ({
    month: item.label,
    bookings: item.value
  })) || []

  const roomTypeData = charts.room_type_performance || []

  return (
    <DashboardLayout activeTab="analytics">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
            <p className="text-muted-foreground mt-1">Insights and performance metrics</p>
          </div>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 px-4 flex items-center gap-6 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl justify-between min-w-[160px]">
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time Period</span>
                  <span className="font-semibold text-slate-700 text-sm">{rangeSelection}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-1.5 rounded-2xl shadow-sm border-slate-100" align="end">
              <div className="space-y-1">
                {[
                  { label: "Today", value: format(new Date(), "d MMM") },
                  { label: "Last 7 days", value: `${format(subDays(new Date(), 6), "d MMM")} - ${format(new Date(), "d MMM")}` },
                  { label: "This month", value: format(new Date(), "MMM") },
                  { label: "Last month", value: format(subMonths(new Date(), 1), "MMM") },
                  { label: "All time", value: "" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setRange(item.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      rangeSelection === item.label ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                    <span className="text-xs text-slate-400 font-normal">{item.value}</span>
                  </button>
                ))}
                <button
                  onClick={() => setRange("Custom")}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                    isCustomMode || rangeSelection === "Custom" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="group-hover:translate-x-0.5 transition-transform">Custom Range</span>
                </button>
                {(isCustomMode || rangeSelection === "Custom") && (
                  <div className="p-4 mt-2 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 transition-all shadow-inner">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">Start date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                            {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={tempStartDate}
                            onSelect={setTempStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">End date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                            {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={tempEndDate}
                            onSelect={setTempEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                        onClick={applyCustomFilter}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 rounded-lg"
                        onClick={() => setIsCustomMode(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Revenue</CardTitle>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">₦{Number(metrics.total_revenue?.value || 0).toLocaleString()}</div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium mt-2",
                metrics.total_revenue?.change?.trend === "up" ? "text-emerald-600" : "text-rose-600"
              )}>
                {metrics.total_revenue?.change?.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{metrics.total_revenue?.change?.percentage}</span>
                <span className="text-slate-400 font-normal">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Occupancy Rate</CardTitle>
              <div className="p-2 bg-violet-50 rounded-lg">
                <Percent className="h-5 w-5 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{metrics.occupancy_rate?.value || 0}%</div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium mt-2",
                metrics.occupancy_rate?.change?.trend === "up" ? "text-emerald-600" : "text-rose-600"
              )}>
                {metrics.occupancy_rate?.change?.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{metrics.occupancy_rate?.change?.percentage}</span>
                <span className="text-slate-400 font-normal">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Avg Daily Rate</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">₦{Number(metrics.avg_daily_rate?.value || 0).toLocaleString()}</div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium mt-2",
                metrics.avg_daily_rate?.change?.trend === "up" ? "text-emerald-600" : "text-rose-600"
              )}>
                {metrics.avg_daily_rate?.change?.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{metrics.avg_daily_rate?.change?.percentage}</span>
                <span className="text-slate-400 font-normal">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Guest Rating</CardTitle>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{metrics.guest_rating?.value || 0}</div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium mt-2",
                metrics.guest_rating?.change?.trend === "up" ? "text-emerald-600" : "text-rose-600"
              )}>
                {metrics.guest_rating?.change?.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{metrics.guest_rating?.change?.percentage}</span>
                <span className="text-slate-400 font-normal">vs last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Details */}
        <div className="bg-slate-50/50 rounded-3xl p-1">
          <Tabs defaultValue="revenue" className="space-y-6">
            <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 inline-flex h-auto w-full md:w-auto">
              <TabsTrigger value="revenue" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">Revenue Trends</TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">Bookings</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">Room Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900">Daily Revenue Overview</CardTitle>
                  <p className="text-slate-500 text-sm">Visualizing daily income flow over the selected period</p>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₦${value}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            padding: "12px 16px"
                          }}
                          itemStyle={{ color: "#1e293b", fontWeight: 600 }}
                          formatter={(value: number) => [`₦${value}`, "Revenue"]}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-blue-50/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-blue-900">RevPAR</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">₦{Number(metrics.revpar || 0).toLocaleString()}</div>
                    <p className="text-xs text-blue-700 mt-1 font-medium">Revenue per available room</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-indigo-50/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-indigo-900">ADR</CardTitle>
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">₦{Number(metrics.avg_daily_rate?.value || 0).toLocaleString()}</div>
                    <p className="text-xs text-indigo-700 mt-1 font-medium">Average daily rate</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-purple-50/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-purple-900">Avg LOS</CardTitle>
                    <Clock className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{(metrics.avg_los || 0)}</div>
                    <p className="text-xs text-purple-700 mt-1 font-medium">Nights per stay</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900">Booking Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bookingsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                        <Tooltip
                          cursor={{ fill: '#F1F5F9' }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="bookings" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Total Bookings</CardTitle>
                    <div className="p-1.5 bg-slate-100 rounded-md">
                      <Calendar className="h-4 w-4 text-slate-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{summary.total || 0}</div>
                    <p className="text-xs text-slate-400 mt-1">Total reservations in period</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Confirmed</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{summary.confirmed || 0}</div>
                    <p className="text-xs text-slate-400 mt-1">Pending check-in</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Checked In</CardTitle>
                    <Users className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{summary.checked_in || 0}</div>
                    <p className="text-xs text-slate-400 mt-1">Current guests</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-md h-full">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-900">Room Type Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {roomTypeData.map((room: any) => (
                        <div key={room.type} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">{room.type}</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{room.bookings} bookings</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-bold text-slate-900">₦{room.revenue.toLocaleString()}</div>
                              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Revenue</div>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${room.utilization || 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Avg Rate: ₦{Math.round(room.revenue / (room.bookings || 1)).toLocaleString()}</span>
                            <span>{room.utilization || 0}% share</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-slate-900">Top Revenue Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {[
                          { name: "Direct Bookings", val: "45%", color: "bg-emerald-500" },
                          { name: "Online Travel Agencies", val: "32%", color: "bg-blue-500" },
                          { name: "Corporate", val: "15%", color: "bg-amber-500" },
                          { name: "Walk-in", val: "8%", color: "bg-slate-400" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${item.color}`} />
                              <span className="text-sm font-medium text-slate-700">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">{item.val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-slate-900">Guest Demographics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {[
                          { name: "Business Travelers", val: "38%", color: "bg-indigo-500" },
                          { name: "Leisure", val: "42%", color: "bg-rose-500" },
                          { name: "Groups/Events", val: "12%", color: "bg-purple-500" },
                          { name: "Other", val: "8%", color: "bg-slate-400" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${item.color}`} />
                              <span className="text-sm font-medium text-slate-700">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">{item.val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}
