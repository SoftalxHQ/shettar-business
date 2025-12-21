"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, DoorOpen, UserPlus, QrCode, ArrowRight } from "lucide-react"
import { MOCK_BOOKINGS, MOCK_ROOM_AVAILABILITY } from "@/lib/mock-data"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const today = new Date().toISOString().split("T")[0]

const todayCheckIns = MOCK_BOOKINGS.filter((b) => b.checkInDate <= today && b.status === "confirmed")

const todayCheckOuts = MOCK_BOOKINGS.filter((b) => b.checkOutDate === today && b.status === "checked-in")

const activeBookings = MOCK_BOOKINGS.filter((b) => b.status === "checked-in").length

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.role === "admin") {
      router.push("/dashboard/business")
    }
  }, [user, router])

  // Show loading state while redirecting admin users
  if (user?.role === "admin") {
    return (
      <DashboardLayout activeTab="staffdashboard">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="staffdashboard">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
          <p className="text-muted-foreground">Quick access to daily operations</p>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/bookings">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Walk-in Booking</p>
                    <p className="text-2xl font-bold">Create New</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/scan">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Scan Booking</p>
                    <p className="text-2xl font-bold">Check-in</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <DoorOpen className="w-6 h-6 text-cyan-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Bookings</p>
                  <p className="text-2xl font-bold">{activeBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Today's Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <DoorOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-ins</p>
                    <p className="text-2xl font-bold">{todayCheckIns.length}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-outs</p>
                    <p className="text-2xl font-bold">{todayCheckOuts.length}</p>
                  </div>
                </div>
              </div>

              <Link href="/dashboard/bookings">
                <Button className="w-full bg-transparent" variant="outline">
                  View All Bookings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Live Room Status</CardTitle>
              <Badge variant="secondary">
                {MOCK_ROOM_AVAILABILITY.reduce((sum, room) => sum + room.available, 0)} Available
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_ROOM_AVAILABILITY.map((roomType) => {
                  const isFull = roomType.available === 0
                  const utilizationRate = ((roomType.total - roomType.available) / roomType.total) * 100

                  return (
                    <div
                      key={roomType.type}
                      className="flex items-center justify-between pb-3 border-b last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium">{roomType.type}</p>
                          {isFull && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                              FULL
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold tabular-nums">
                            {roomType.available}/{roomType.total}
                          </p>
                          <div className="flex-1 max-w-[100px]">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isFull ? "bg-red-500" : utilizationRate > 70 ? "bg-amber-500" : "bg-green-500"
                                }`}
                                style={{ width: `${utilizationRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-medium ${
                            isFull ? "text-red-600" : roomType.available <= 2 ? "text-amber-600" : "text-green-600"
                          }`}
                        >
                          {isFull ? "No rooms" : roomType.available <= 2 ? "Low" : "Available"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Link href="/dashboard/bookings">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MOCK_BOOKINGS.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      booking.status === "checked-in"
                        ? "bg-green-100 text-green-700"
                        : booking.status === "confirmed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {booking.status === "checked-in" && <DoorOpen className="w-5 h-5" />}
                    {booking.status === "confirmed" && <CalendarCheck className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{booking.guestName}</p>
                    <p className="text-xs text-muted-foreground">
                      Room {booking.roomNumber} • {booking.checkInDate} to {booking.checkOutDate}
                    </p>
                  </div>
                  <Badge
                    variant={
                      booking.status === "checked-in"
                        ? "default"
                        : booking.status === "confirmed"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
