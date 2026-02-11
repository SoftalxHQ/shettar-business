"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Building2, UserCircle, Settings, Upload, Copy, Image as ImageIcon, MapPin, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import api from "@/lib/api-client"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const revenueStats = [
  {
    title: "Revenue Today",
    value: "₦12,458",
    change: "+8%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "This Week",
    value: "₦84,250",
    change: "+12%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    title: "This Month",
    value: "₦342,800",
    change: "+15%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    title: "Cancellations",
    value: "12",
    change: "-3%",
    trend: "down",
    icon: TrendingDown,
  },
]

export default function BusinessDashboardPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [businessInfo, setBusinessInfo] = useState<any>(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager") {
      router.push("/dashboard")
    }
  }, [user, router])

  useEffect(() => {
    async function fetchStats() {
      const id = businessId || user?.businessId
      if (id) {
        try {
          const data = await api.getBusinessData<any>(`/api/v1/user_businesses/${id}/stats`)
          setStats(data)
        } catch (error: any) {
          if (error.status === 401) {
            logout(true)
            return
          }
          console.error("Failed to fetch stats:", error)
        } finally {
          setIsLoadingStats(false)
        }
      }
    }

    async function fetchBusinessInfo() {
      const id = businessId || user?.businessId
      if (id) {
        try {
          const data = await api.getBusinessData<any>(`/api/v1/user_businesses/${id}`)
          setBusinessInfo(data)
        } catch (error) {
          console.error("Failed to fetch business info:", error)
        }
      }
    }

    if (user && (user.role === "admin" || user.role === "manager")) {
      fetchStats()
      fetchBusinessInfo()
    }
  }, [user, businessId])

  if (user?.role !== "admin" && user?.role !== "manager") {
    return null
  }

  const displayStats = stats ? [
    {
      title: "Revenue Today",
      value: `₦${Number(stats.revenue_today.value).toLocaleString()}`,
      change: stats.revenue_today.change.percentage,
      trend: stats.revenue_today.change.trend,
      icon: DollarSign,
    },
    {
      title: "This Week",
      value: `₦${Number(stats.revenue_this_week.value).toLocaleString()}`,
      change: stats.revenue_this_week.change.percentage,
      trend: stats.revenue_this_week.change.trend,
      icon: TrendingUp,
    },
    {
      title: "This Month",
      value: `₦${Number(stats.revenue_this_month.value).toLocaleString()}`,
      change: stats.revenue_this_month.change.percentage,
      trend: stats.revenue_this_month.change.trend,
      icon: TrendingUp,
    },
    {
      title: "Cancellations",
      value: stats.cancellations.value.toString(),
      change: stats.cancellations.change.percentage,
      trend: stats.cancellations.change.trend,
      icon: TrendingDown,
    },
  ] : revenueStats

  return (
    <DashboardLayout activeTab="business">
      <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 pb-32 rounded-b-3xl">
        <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Business Overview
          </h1>
          <p className="text-indigo-100 text-lg">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-12 space-y-8">

        {/* Revenue stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-lg overflow-hidden relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            displayStats.map((stat) => (
              <Card key={stat.title} className="border-0 shadow-lg overflow-hidden relative group">
                <div className="absolute inset-0 bg-white opacity-100 group-hover:bg-slate-50 transition-colors" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${stat.icon === DollarSign ? "bg-green-100 text-green-600" :
                      stat.icon === TrendingUp ? "bg-blue-100 text-blue-600" :
                        stat.icon === TrendingDown ? "bg-rose-100 text-rose-600" :
                          "bg-slate-100 text-slate-600"
                      }`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    {stat.trend === "up" ? (
                      <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        {stat.change} <TrendingUp className="w-3 h-3 ml-1" />
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                        {stat.change} <TrendingDown className="w-3 h-3 ml-1" />
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-medium text-slate-500 mb-1">{stat.title}</h3>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Business settings */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Business Info Card (Span 2 cols) */}
          {user.role === "admin" && (
            <Card className="lg:col-span-2 border-0 shadow-md overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Business Profile</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">Manage your business identity and details</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/business/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Name</label>
                      <p className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2">{user.hotelName}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business ID</label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-slate-100 px-3 py-1 rounded font-mono text-slate-700">{user.businessId}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-slate-600"
                          onClick={() => {
                            navigator.clipboard.writeText(user.businessId || "")
                            toast.success("Business ID copied to clipboard")
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center border border-slate-100 border-dashed">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300 mb-3">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h4 className="font-medium text-slate-900 mb-1">Business Logo</h4>
                    <p className="text-xs text-slate-500 mb-4">Displayed on invoices and app header</p>
                    <Button variant="outline" size="sm" className="text-xs h-8">Update Logo</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions / Settings */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/rooms" className="block">
                <div className="group flex items-center p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Room Configuration</p>
                    <p className="text-xs text-slate-500">Manage rates & availability</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/staff" className="block">
                <div className="group flex items-center p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Staff Management</p>
                    <p className="text-xs text-slate-500">Access control & roles</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/analytics" className="block">
                <div className="group flex items-center p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">View Analytics</p>
                    <p className="text-xs text-slate-500">Performance reports</p>
                  </div>
                </div>
              </Link>

              {businessInfo?.latitude && businessInfo?.longitude && (
                <button
                  onClick={() => setShowMapModal(true)}
                  className="block w-full text-left"
                >
                  <div className="group flex items-center p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Location Map</p>
                      <p className="text-xs text-slate-500">View on Google Maps</p>
                    </div>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Map Modal */}
      {showMapModal && businessInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setShowMapModal(false); setMapLoading(true); }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{businessInfo.name} - Location</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {businessInfo.address}, {businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowMapModal(false); setMapLoading(true); }}
                className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latitude</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{businessInfo.latitude}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Longitude</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{businessInfo.longitude}</p>
                  </div>
                </div>

                <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800 shadow-inner">
                  {mapLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10 transition-opacity duration-300">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading interactive map...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${businessInfo.latitude},${businessInfo.longitude}&hl=en&z=15&output=embed`}
                    allowFullScreen
                    onLoad={() => setMapLoading(false)}
                    className={cn("transition-opacity duration-500", mapLoading ? "opacity-0" : "opacity-100")}
                  ></iframe>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    asChild
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${businessInfo.latitude},${businessInfo.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <a
                      href={`https://maps.apple.com/?q=${businessInfo.latitude},${businessInfo.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      Open in Apple Maps
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
