"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight, Building2, Settings, Copy, Image as ImageIcon, MapPin, X } from "lucide-react"
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
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Business overview</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome back, {user?.name?.split(" ")[0] || "there"} — today&apos;s performance at a glance
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 rounded-xl">
              <Link href="/dashboard/analytics">
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Analytics
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Link href="/dashboard/business/settings">
                <Settings className="w-4 h-4 mr-1.5" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoadingStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-7 w-28 mb-2" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))
          ) : (
            displayStats.map((stat) => (
              <div
                key={stat.title}
                className="rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 hover:bg-white hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{stat.title}</p>
                  <stat.icon className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none">
                  {stat.value}
                </p>
                <div className="mt-2">
                  {stat.trend === "up" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      {stat.change}
                      <TrendingUp className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
                      {stat.change}
                      <TrendingDown className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {user.role === "admin" && (
            <div className="lg:col-span-2 rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Business profile</p>
                  <p className="text-[11px] text-slate-500">Identity shown on receipts and the app header</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 rounded-lg" asChild>
                  <Link href="/dashboard/business/settings">
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Link>
                </Button>
              </div>
              <div className="p-4 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Business name</p>
                    <p className="text-sm font-medium text-slate-900">{user.hotelName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Business ID</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded-md font-mono text-slate-700">
                        {user.businessId}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        onClick={() => {
                          navigator.clipboard.writeText(user.businessId || "")
                          toast.success("Business ID copied to clipboard")
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 mb-2">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">Business logo</p>
                  <p className="text-[11px] text-slate-500 mb-3">Used on invoices and desktop chrome</p>
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">Update logo</Button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Quick actions</p>
            </div>
            <div className="p-2 space-y-0.5">
              <Link
                href="/dashboard/rooms"
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Rooms</p>
                  <p className="text-[11px] text-slate-500">Rates & availability</p>
                </div>
              </Link>
              <Link
                href="/dashboard/staff"
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Staff</p>
                  <p className="text-[11px] text-slate-500">Roles & access</p>
                </div>
              </Link>
              <Link
                href="/dashboard/analytics"
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Analytics</p>
                  <p className="text-[11px] text-slate-500">Performance reports</p>
                </div>
              </Link>
              {businessInfo?.latitude && businessInfo?.longitude && (
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">Location</p>
                    <p className="text-[11px] text-slate-500">View on map</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMapModal && businessInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setShowMapModal(false); setMapLoading(true); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{businessInfo.name} — Location</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {businessInfo.address}, {businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowMapModal(false); setMapLoading(true); }}
                className="rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Latitude</p>
                  <p className="text-sm font-semibold text-slate-900">{businessInfo.latitude}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Longitude</p>
                  <p className="text-sm font-semibold text-slate-900">{businessInfo.longitude}</p>
                </div>
              </div>

              <div className="w-full h-[380px] rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
                {mapLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button asChild className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  <a
                    href={`https://www.google.com/maps?q=${businessInfo.latitude},${businessInfo.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Google Maps
                  </a>
                </Button>
                <Button variant="outline" asChild className="h-10 rounded-xl">
                  <a
                    href={`https://maps.apple.com/?q=${businessInfo.latitude},${businessInfo.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    Apple Maps
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
