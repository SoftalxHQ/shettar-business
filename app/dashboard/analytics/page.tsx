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

export default function AnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    if (user && user.role !== 'admin') {
      if (!user.permissions?.dashboard?.view_analytics) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  if (user && user.role !== 'admin' && !user.permissions?.dashboard?.view_analytics) {
    return null
  }

  // Calculate analytics
  const totalRevenue = MOCK_PAYMENTS.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)

  const totalBookings = MOCK_BOOKINGS.length
  const confirmedBookings = MOCK_BOOKINGS.filter((b) => b.status === "confirmed").length
  const checkedInBookings = MOCK_BOOKINGS.filter((b) => b.status === "checked-in").length

  const occupancyRate = 72 // Mock data
  const avgDailyRate = 185 // Mock data
  const avgLengthOfStay = 3.2 // Mock data
  const guestSatisfaction = 4.8 // Mock data

  // Revenue by day (mock data)
  const revenueData = [
    { date: "Mon", revenue: 2400 },
    { date: "Tue", revenue: 1800 },
    { date: "Wed", revenue: 3200 },
    { date: "Thu", revenue: 2800 },
    { date: "Fri", revenue: 3600 },
    { date: "Sat", revenue: 4200 },
    { date: "Sun", revenue: 3800 },
  ]

  // Bookings by month (mock data)
  const bookingsData = [
    { month: "Jan", bookings: 45 },
    { month: "Feb", bookings: 52 },
    { month: "Mar", bookings: 61 },
    { month: "Apr", bookings: 58 },
    { month: "May", bookings: 67 },
    { month: "Jun", bookings: 72 },
    { month: "Jul", bookings: 89 },
    { month: "Aug", bookings: 85 },
    { month: "Sep", bookings: 73 },
    { month: "Oct", bookings: 68 },
    { month: "Nov", bookings: 62 },
    { month: "Dec", bookings: 78 },
  ]

  // Room type performance (mock data)
  const roomTypeData = [
    { type: "Standard", bookings: 45, revenue: 5400 },
    { type: "Deluxe", bookings: 32, revenue: 5760 },
    { type: "Suite", bookings: 18, revenue: 5040 },
  ]

  return (
    <DashboardLayout activeTab="analytics">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
            <p className="text-muted-foreground mt-1">Insights and performance metrics</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
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
              <div className="text-3xl font-bold text-slate-900">₦{totalRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 mt-2">
                <TrendingUp className="w-4 h-4" />
                <span>+12.5%</span>
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
              <div className="text-3xl font-bold text-slate-900">{occupancyRate}%</div>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 mt-2">
                <TrendingUp className="w-4 h-4" />
                <span>+5.2%</span>
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
              <div className="text-3xl font-bold text-slate-900">₦{avgDailyRate}</div>
              <div className="flex items-center gap-1 text-sm font-medium text-rose-600 mt-2">
                <TrendingDown className="w-4 h-4" />
                <span>-2.1%</span>
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
              <div className="text-3xl font-bold text-slate-900">{guestSatisfaction}</div>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 mt-2">
                <TrendingUp className="w-4 h-4" />
                <span>+0.3</span>
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
                    <div className="text-2xl font-bold text-slate-900">₦133</div>
                    <p className="text-xs text-blue-700 mt-1 font-medium">Revenue per available room</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-indigo-50/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-indigo-900">ADR</CardTitle>
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">₦{avgDailyRate}</div>
                    <p className="text-xs text-indigo-700 mt-1 font-medium">Average daily rate</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-purple-50/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-purple-900">Avg LOS</CardTitle>
                    <Clock className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{avgLengthOfStay}</div>
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
                    <div className="text-2xl font-bold text-slate-900">{totalBookings}</div>
                    <p className="text-xs text-slate-400 mt-1">All time bookings</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Confirmed</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{confirmedBookings}</div>
                    <p className="text-xs text-slate-400 mt-1">Upcoming reservations</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Checked In</CardTitle>
                    <Users className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{checkedInBookings}</div>
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
                      {roomTypeData.map((room) => (
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
                              style={{ width: `${(room.bookings / 95) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Avg Rate: ₦{Math.round(room.revenue / room.bookings).toLocaleString()}</span>
                            <span>{Math.round((room.bookings / 95) * 100)}% utilization</span>
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
