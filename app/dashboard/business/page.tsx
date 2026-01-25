"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DollarSign, TrendingUp, TrendingDown, Users, Building2, Upload, ImageIcon, Settings } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

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
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager") {
      router.push("/dashboard")
    }
  }, [user, router])

  if (user?.role !== "admin" && user?.role !== "manager") {
    return null
  }

  return (
    <DashboardLayout activeTab="businessdashboard">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Dashboard</h1>
          <p className="text-muted-foreground">Revenue analytics and business settings</p>
        </div>

        {/* Revenue stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {revenueStats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p
                  className={`text-xs mt-1 ${stat.trend === "up" ? "text-green-600" : stat.trend === "down" ? "text-red-600" : "text-muted-foreground"}`}
                >
                  {stat.change} from last period
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Business settings */}
        <div className="grid gap-6 md:grid-cols-2">
          {user.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <p className="text-base">{user.hotelName}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Business ID</label>
                  <p className="text-base font-mono text-sm">{user.businessId}</p>
                </div>

                <Link href="/dashboard/business/settings">
                  <Button className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Business Settings
                  </Button>
                </Link>

                <p className="text-xs text-muted-foreground text-center">
                  Update business info, logo, images, and amenities
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                <Building2 className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Room Configuration</p>
                  <p className="text-xs text-muted-foreground">Manage rooms and pricing</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                <Users className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Staff Management</p>
                  <p className="text-xs text-muted-foreground">Add and manage staff accounts</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                <TrendingUp className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">View Analytics</p>
                  <p className="text-xs text-muted-foreground">Detailed reports and trends</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Revenue breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-medium">Room Bookings</p>
                  <p className="text-sm text-muted-foreground">145 bookings</p>
                </div>
                <p className="text-lg font-bold">₦298,500</p>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-medium">Additional Services</p>
                  <p className="text-sm text-muted-foreground">Room service, amenities</p>
                </div>
                <p className="text-lg font-bold">₦32,400</p>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-medium">Refunds & Cancellations</p>
                  <p className="text-sm text-muted-foreground">12 cancellations</p>
                </div>
                <p className="text-lg font-bold text-red-600">-₦11,900</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="font-semibold text-lg">Net Revenue</p>
                <p className="text-2xl font-bold text-blue-600">₦319,000</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
