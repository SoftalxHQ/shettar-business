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
import { LoadingSpinner } from "@/components/ui/loading-spinner"

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setIsSearching(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reservations/${searchQuery.trim()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (response.ok && data.status?.code === 200) {
        // Success: Redirect to scan page with code
        router.push(`/dashboard/scan?code=${encodeURIComponent(searchQuery.trim())}`)
      } else {
        // Error: Show toast
        if (response.status === 401 && (data.errors?.[0]?.id === 'expiration' || data.message === 'Signature has expired')) {
          logout(true)
          return
        }
        // Use the imported toast function from sonner
        toast.error("No job reservation found with this code")
      }
    } catch (error) {
      console.error("Search failed:", error)
      toast.error("Failed to verify booking code")
    } finally {
      setIsSearching(false)
    }
  }

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
          if (
            errorData.errors?.[0]?.id === 'expiration' ||
            errorData.errors?.[0]?.message === 'Token has expired' ||
            errorData.message === 'Signature has expired'
          ) {
            logout(true)
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
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="staffdashboard">
      <div className="-m-8 mb-8 relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-16 bg-indigo-500 overflow-hidden">
        {/* Glow */}
        <div className="absolute pointer-events-none top-0 left-1/2 -translate-x-1/2 -mt-10" aria-hidden="true">
          <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" r="50%" id="ill-a">
                <stop stopColor="#FFF" offset="0%" />
                <stop stopColor="#FFF" stopOpacity="0" offset="100%" />
              </radialGradient>
            </defs>
            <circle
              style={{ mixBlendMode: 'overlay' }}
              cx="256"
              cy="256"
              r="256"
              fill="url(#ill-a)"
              fillRule="evenodd"
              opacity=".48"
            />
          </svg>
        </div>

        <div className="relative w-full max-w-2xl mx-auto text-center z-10">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl text-white font-bold">👋 What Can We Help You Find?</h1>
          </div>
          <form className="relative" onSubmit={handleSearch}>
            <label htmlFor="action-search" className="sr-only">
              Search
            </label>
            <input
              id="action-search"
              className="form-input pl-9 py-3 focus:border-indigo-300 w-full rounded-md"
              type="search"
              placeholder="Enter Booking Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
            <button className="absolute inset-0 right-auto group" type="submit" aria-label="Search" disabled={isSearching}>
              {!isSearching ? (
                <svg
                  className="w-4 h-4 shrink-0 fill-current text-slate-400 group-hover:text-slate-500 ml-3 mr-2"
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                  <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                </svg>
              ) : (
                <div className="ml-3 mr-2">
                  <LoadingSpinner size={16} />
                </div>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 w-full max-w-9xl mx-auto">
        <div className="space-y-8">
          <h3 className="text-xl text-slate-800 font-bold">Quick Actions</h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Scan QR Code */}
            <Link href="/dashboard/scan">
              <div className="bg-slate-100 rounded-sm text-center p-5 hover:bg-slate-50 transition-colors border border-transparent hover:border-indigo-200">
                <div className="flex flex-col h-full bg-slate-100 items-center">
                  <div className="grow mb-2">
                    <div className="inline-flex w-12 h-12 rounded-full bg-indigo-400 items-center justify-center mb-4 text-white">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">Scan QR Code</h3>
                    <div className="text-sm text-slate-600">Scan slip or phone to lodge customer.</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-indigo-500 hover:text-indigo-600 cursor-pointer">
                      Explore -&gt;
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* New Reservation */}
            <Link href="/dashboard/bookings/new">
              <div className="bg-slate-100 rounded-sm text-center p-5 hover:bg-slate-50 transition-colors border border-transparent hover:border-indigo-200">
                <div className="flex flex-col h-full items-center">
                  <div className="grow mb-2">
                    <div className="inline-flex w-12 h-12 rounded-full bg-indigo-400 items-center justify-center mb-4 text-white">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">New Reservation</h3>
                    <div className="text-sm text-slate-600">Reserve room for client on site.</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-indigo-500 hover:text-indigo-600 cursor-pointer">
                      Explore -&gt;
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* View Reservations */}
            <Link href="/dashboard/bookings?filter=active">
              <div className="bg-slate-100 rounded-sm text-center p-5 hover:bg-slate-50 transition-colors border border-transparent hover:border-indigo-200">
                <div className="flex flex-col h-full items-center">
                  <div className="grow mb-2">
                    <div className="inline-flex w-12 h-12 rounded-full bg-indigo-400 items-center justify-center mb-4 text-white">
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">View Reservations</h3>
                    <div className="text-sm text-slate-600">View active ({activeBookings}) reservations.</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-indigo-500 hover:text-indigo-600 cursor-pointer">
                      Explore -&gt;
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl text-slate-800 font-bold">Live Room Status</h2>
              <div className="relative w-64">
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
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { render, ...inputProps } = props as any
                    let displayValue = ""
                    if (selectedDates && selectedDates.length > 0) {
                      const start = selectedDates[0]
                      const end = selectedDates.length > 1 ? selectedDates[1] : undefined
                      if (end) displayValue = `${format(start, "MMM d")} - ${format(end, "MMM d")}`
                      else displayValue = format(start, "MMM d")
                    }

                    return (
                      <input
                        {...inputProps}
                        ref={ref}
                        value={displayValue}
                        type="text"
                        className="form-input pl-9 py-2 w-full"
                        placeholder="Select Date"
                        readOnly
                      />
                    )
                  }}
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-lg">
              {isLoadingRooms ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : roomAvailability.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No room types configured yet</p>
              ) : (
                <div className="space-y-4">
                  {roomAvailability.map((roomType) => {
                    const isFull = roomType.available === 0
                    const utilizationRate = ((roomType.total - roomType.available) / roomType.total) * 100

                    return (
                      <div key={roomType.type} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-slate-800">{roomType.type}</p>
                            {isFull && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">FULL</Badge>}
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-2xl font-bold text-slate-800 tabular-nums">
                              {roomType.available}<span className="text-sm text-slate-400 font-normal">/{roomType.total}</span>
                            </p>
                            <div className="flex-1 max-w-[150px]">
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${isFull ? "bg-red-500" : utilizationRate > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${utilizationRate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold px-2 py-1 rounded ${isFull ? "bg-red-100 text-red-600" :
                            roomType.available <= 2 ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            }`}>
                            {isFull ? "No rooms" : roomType.available <= 2 ? "Low Stock" : "Available"}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
