"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  DoorOpen,
  UserPlus,
  QrCode,
  ArrowRight,
  Calendar as CalendarIcon,
  Search,
  Hotel,
  MapPin,
  X,
  LogIn,
  LogOut as CheckoutIcon,
  Users,
} from "lucide-react"
import { type RoomTypeAvailability } from "@/lib/mock-data"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { usesRestaurantPortal } from "@/lib/portal-access"
import { getAuthToken } from "@/lib/storage"
import api from "@/lib/api-client"
import {
  subscribeUserNotifications,
  type StaffNotificationCablePayload,
} from "@/lib/notifications-api"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/light.css"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { DigitalClock } from "@/components/digital-clock"

const BOOKING_AVAILABILITY_EVENTS = new Set([
  "booking_created",
  "booking_cancelled",
  "check_in",
  "check_out",
  "booking_updated",
])

export default function DashboardPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && usesRestaurantPortal(user)) {
      router.replace("/dashboard/restaurant")
    }
  }, [user, router])
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
  const [summary, setSummary] = useState({
    check_ins_today: 0,
    check_outs_today: 0,
    active_guests: 0
  })
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [businessInfo, setBusinessInfo] = useState<any>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/dashboard/scan?code=${encodeURIComponent(searchQuery.trim().toUpperCase())}`)
  }

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "manager") {
      router.push("/dashboard/business")
    }
  }, [user, router])

  // Fetch room availability
  const fetchRoomAvailability = useCallback(async (opts?: { silent?: boolean }) => {
    if (!businessId) return

    // Wait for complete range selection
    if (fetchedDates.length === 1) return

    try {
      if (!opts?.silent) setIsLoadingRooms(true)
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
      if (!opts?.silent) setIsLoadingRooms(false)
    }
  }, [businessId, fetchedDates, logout])

  useEffect(() => {
    void fetchRoomAvailability()
  }, [fetchRoomAvailability])

  // Live refresh when bookings change via ActionCable notifications
  const availabilityRefreshTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!businessId) return

    const unsubscribe = subscribeUserNotifications((msg: StaffNotificationCablePayload) => {
      const event = typeof msg.metadata?.event === "string" ? msg.metadata.event : ""
      if (!BOOKING_AVAILABILITY_EVENTS.has(event)) return

      if (availabilityRefreshTimer.current) {
        window.clearTimeout(availabilityRefreshTimer.current)
      }
      availabilityRefreshTimer.current = window.setTimeout(() => {
        void fetchRoomAvailability({ silent: true })
      }, 400)
    })

    return () => {
      unsubscribe()
      if (availabilityRefreshTimer.current) {
        window.clearTimeout(availabilityRefreshTimer.current)
      }
    }
  }, [businessId, fetchRoomAvailability])

  // Fetch dashboard summary
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      if (!businessId) return

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()

        const response = await fetch(
          `${API_URL}/api/v1/user_businesses/${businessId}/dashboard_summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setSummary(data)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard summary:", error)
      }
    }

    fetchDashboardSummary()
  }, [businessId])

  // Fetch business info
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!businessId) return

      try {
        const data = await api.getBusinessData<any>(`/api/v1/user_businesses/${businessId}`)
        setBusinessInfo(data)
      } catch (error) {
        console.error("Failed to fetch business info:", error)
      }
    }

    fetchBusinessInfo()
  }, [businessId])

  const flatpickrOptions = useMemo(() => ({
    mode: "range" as const,
    dateFormat: "Y-m-d",
    minDate: "today",
  }), [])

  // Show loading state while redirecting admin users
  if (user?.role === "admin") {
    return (
      <DashboardLayout activeTab="staffdashboard">
        <div className="h-full flex items-center justify-center">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="staffdashboard">
      <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
        {/* Greeting + clock + metrics / actions */}
        <div className="shrink-0 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_minmax(0,1fr)] lg:items-center lg:gap-6">
          <div className="flex flex-col gap-3 min-w-0">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Front desk
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Welcome, {user?.name?.split(" ")[0] || "Team"}
              </h1>
            </div>

            <form className="w-full max-w-xs" onSubmit={handleSearch}>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-sm font-mono uppercase tracking-wider shadow-sm"
                  type="search"
                  placeholder="Booking code"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  type="submit"
                  aria-label="Look up booking"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          <DigitalClock className="order-first lg:order-none py-2 lg:py-0" />

          <div className="flex flex-col gap-2 w-full lg:items-end min-w-0">
            <div className="grid grid-cols-3 gap-2 w-full lg:w-auto lg:min-w-[22rem]">
              <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Check-ins</span>
                </div>
                <p className="text-xl font-semibold tabular-nums text-slate-900 leading-none">
                  {summary.check_ins_today}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <CheckoutIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Check-outs</span>
                </div>
                <p className="text-xl font-semibold tabular-nums text-slate-900 leading-none">
                  {summary.check_outs_today}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">In-house</span>
                </div>
                <p className="text-xl font-semibold tabular-nums text-slate-900 leading-none">
                  {summary.active_guests}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button asChild size="sm" className="h-10 gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Link href="/dashboard/scan">
                  <QrCode className="w-4 h-4" />
                  Scan QR
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 gap-2 rounded-xl bg-white border-slate-200">
                <Link href="/dashboard/bookings/new">
                  <UserPlus className="w-4 h-4 text-slate-600" />
                  New Reservation
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 gap-2 rounded-xl bg-white border-slate-200">
                <Link href="/dashboard/bookings?filter=active">
                  <DoorOpen className="w-4 h-4 text-slate-600" />
                  Active Guests
                  {summary.active_guests > 0 && (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[11px] font-semibold tabular-nums text-slate-700">
                      {summary.active_guests}
                    </span>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Room availability — dense inventory that scales to many room types */}
        <section className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Room Availability</h2>
              <p className="text-xs text-slate-500">
                {isLoadingRooms
                  ? "Loading inventory…"
                  : roomAvailability.length === 0
                    ? "No room types yet"
                    : `${roomAvailability.reduce((sum, r) => sum + r.available, 0)} free · ${roomAvailability.reduce((sum, r) => sum + r.total, 0)} total · ${roomAvailability.length} types`}
              </p>
            </div>
            <div className="relative w-full sm:w-56">
              <Flatpickr
                options={flatpickrOptions}
                value={selectedDates}
                onChange={(dates) => setSelectedDates(dates)}
                onClose={(dates) => {
                  if (dates.length === 2) setFetchedDates(dates)
                }}
                render={({ defaultValue, value, ...props }, ref) => {
                  const { render, ...inputProps } = props as any
                  let displayValue = ""
                  if (selectedDates && selectedDates.length > 0) {
                    const start = selectedDates[0]
                    const end = selectedDates.length > 1 ? selectedDates[1] : undefined
                    if (end) displayValue = `${format(start, "MMM d")} – ${format(end, "MMM d")}`
                    else displayValue = format(start, "MMM d")
                  }

                  return (
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-500 z-10" />
                      <input
                        {...inputProps}
                        ref={ref}
                        value={displayValue}
                        type="text"
                        className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium shadow-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all cursor-pointer"
                        placeholder="Select dates"
                        readOnly
                      />
                    </div>
                  )
                }}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoadingRooms ? (
              <div className="flex items-center justify-center h-full min-h-[10rem]">
                <LoadingSpinner size={32} />
              </div>
            ) : roomAvailability.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[10rem] text-center px-4">
                <div className="p-3 bg-slate-100 rounded-full mb-2">
                  <Hotel className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 font-medium">No room types configured yet</p>
              </div>
            ) : (
              <div className="p-3 sm:p-4">
                {/*
                  Compact tiles: 2 cols on sm, 3 on lg, 4 on xl.
                  Content-sized (no stretch) so 2 types don’t leave a huge empty card,
                  and 6–7 types wrap into a scannable grid that scrolls inside the panel.
                */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
                  {roomAvailability.map((roomType) => {
                    const isFull = roomType.available === 0
                    const utilizationRate =
                      roomType.total > 0
                        ? ((roomType.total - roomType.available) / roomType.total) * 100
                        : 0
                    const barColor = isFull
                      ? "bg-red-500"
                      : utilizationRate > 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    const statusLabel = isFull
                      ? "Full"
                      : roomType.available <= 2
                        ? "Low"
                        : "Open"
                    const statusClass = isFull
                      ? "bg-red-50 text-red-700"
                      : roomType.available <= 2
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"

                    return (
                      <div
                        key={roomType.type}
                        className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="truncate text-sm font-semibold text-slate-900" title={roomType.type}>
                            {roomType.type}
                          </h3>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              statusClass,
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex items-end justify-between gap-2 mb-2">
                          <div className="tabular-nums">
                            <span className="text-2xl font-semibold tracking-tight text-slate-900 leading-none">
                              {roomType.available}
                            </span>
                            <span className="text-sm text-slate-400 font-medium">/{roomType.total}</span>
                          </div>
                          <span className="text-[11px] font-medium tabular-nums text-slate-500 pb-0.5">
                            {Math.round(utilizationRate)}% occ.
                          </span>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", barColor)}
                            style={{ width: `${Math.min(100, Math.max(0, utilizationRate))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
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
                      <ArrowRight className="w-4 h-4 text-slate-400" />
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
