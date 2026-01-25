"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, DoorOpen, UserPlus, QrCode, ArrowRight, Calendar as CalendarIcon } from "lucide-react"
import { MOCK_BOOKINGS, type RoomTypeAvailability } from "@/lib/mock-data"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { getAuthToken } from "@/lib/storage"
import { toast } from "sonner"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/light.css"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"

const today = new Date().toISOString().split("T")[0]

const todayCheckIns = MOCK_BOOKINGS.filter((b) => b.checkInDate <= today && b.status === "confirmed")

const todayCheckOuts = MOCK_BOOKINGS.filter((b) => b.checkOutDate === today && b.status === "checked-in")

const activeBookings = MOCK_BOOKINGS.filter((b) => b.status === "checked-in").length

export default function DashboardPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [roomAvailability, setRoomAvailability] = useState<RoomTypeAvailability[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [selectedDates, setSelectedDates] = useState<Date[]>([
    new Date(),
    addDays(new Date(), 1)
  ])
  const [fetchedDates, setFetchedDates] = useState<Date[]>([
    new Date(),
    addDays(new Date(), 1)
  ])

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "manager") {
      router.push("/dashboard/business")
    }
  }, [user, router])

  // Fetch room availability
  useEffect(() => {
    const fetchRoomAvailability = async () => {
      if (!businessId) return

      // Wait for complete range selection
      if (fetchedDates.length === 1) return

      try {
        setIsLoadingRooms(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()

        let startStr, endStr

        if (fetchedDates && fetchedDates.length > 0) {
          startStr = format(fetchedDates[0], "yyyy-MM-dd")
          if (fetchedDates.length > 1) {
            // If start and end are same day, assume 1 night
            if (fetchedDates[0].getTime() === fetchedDates[1].getTime()) {
              endStr = format(addDays(fetchedDates[0], 1), "yyyy-MM-dd")
            } else {
              endStr = format(fetchedDates[1], "yyyy-MM-dd")
            }
          } else {
            // If only start date selected, assume 1 night
            endStr = format(addDays(fetchedDates[0], 1), "yyyy-MM-dd")
          }
        } else {
          startStr = format(new Date(), "yyyy-MM-dd")
          endStr = format(addDays(new Date(), 1), "yyyy-MM-dd")
        }

        const response = await fetch(
          `${API_URL}/api/v1/user_businesses/${businessId}/room_availability?start_date=${startStr}&end_date=${endStr}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setRoomAvailability(data)
        } else if (response.status === 401) {
          const errorData = await response.json()
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            toast.error("Session expired. Please login again.")
            logout()
            return
          }
        }
      } catch (error) {
        console.error("Failed to fetch room availability:", error)
      } finally {
        setIsLoadingRooms(false)
      }
    }

    fetchRoomAvailability()
  }, [businessId, fetchedDates])

  const flatpickrOptions = useMemo(() => ({
    mode: "range" as const,
    dateFormat: "Y-m-d",
    minDate: "today",
  }), [])

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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Quick access to daily operations</p>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/bookings/new">
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

          <Link href="/dashboard/bookings?filter=active">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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
          </Link>
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
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg font-semibold">Live Room Status</CardTitle>
                <Badge variant="secondary">
                  {isLoadingRooms ? "..." : `${roomAvailability.reduce((sum, room) => sum + room.available, 0)} Available`}
                </Badge>
              </div>
              <div className="relative">
                <Flatpickr
                  options={flatpickrOptions}
                  value={selectedDates}
                  onChange={(dates) => setSelectedDates(dates)}
                  onClose={(dates) => {
                    if (dates.length === 2) {
                      setFetchedDates(dates)
                    }
                  }}
                  render={({ defaultValue, value, ...props }, ref) => {
                    // Filter out the 'render' prop if it's being passed down to avoid React warning
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { render, ...inputProps } = props as any
                    // Manually format the date range for display
                    let displayValue = ""
                    if (selectedDates && selectedDates.length > 0) {
                      const start = selectedDates[0]
                      const end = selectedDates.length > 1 ? selectedDates[1] : undefined

                      if (end) {
                        displayValue = `${format(start, "MMM d, yyyy")} to ${format(end, "MMM d, yyyy")}`
                      } else {
                        displayValue = format(start, "MMM d, yyyy")
                      }
                    }

                    return (
                      <input
                        {...inputProps}
                        ref={ref}
                        value={displayValue}
                        type="text"
                        className={cn(
                          "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-sm pl-9"
                        )}
                        placeholder="Select Date Range"
                        readOnly
                      />
                    )
                  }}
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRooms ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : roomAvailability.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No room types configured yet
                </p>
              ) : (
                <div className="space-y-3">
                  {roomAvailability.map((roomType) => {
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
                                  className={`h-full transition-all ${isFull ? "bg-red-500" : utilizationRate > 70 ? "bg-amber-500" : "bg-green-500"
                                    }`}
                                  style={{ width: `${utilizationRate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-medium ${isFull ? "text-red-600" : roomType.available <= 2 ? "text-amber-600" : "text-green-600"
                              }`}
                          >
                            {isFull ? "No rooms" : roomType.available <= 2 ? "Low" : "Available"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
