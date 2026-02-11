"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, DoorOpen, UserPlus, QrCode, ArrowRight, Calendar as CalendarIcon, Search, Hotel, MapPin, X } from "lucide-react"
import { MOCK_BOOKINGS, type RoomTypeAvailability } from "@/lib/mock-data"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { getAuthToken } from "@/lib/storage"
import api from "@/lib/api-client"
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
  const [summary, setSummary] = useState({
    check_ins_today: 0,
    check_outs_today: 0,
    active_guests: 0
  })
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [businessInfo, setBusinessInfo] = useState<any>(null)

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
        toast.error("Oops, no reservation found with this code")
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
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="staffdashboard">
      <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 pb-32 rounded-b-3xl">
        <div className="absolute inset-x-0 bottom-0 h-full bg-grid-white/[0.1] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Welcome back, {user?.name?.split(' ')[0] || 'Team'}! 👋
          </h1>

          <div className="max-w-2xl mx-auto">
            <form className="relative" onSubmit={handleSearch}>
              <div className="relative group">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <input
                  className="w-full bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl py-3 pl-12 pr-12 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all text-lg"
                  type="search"
                  placeholder="Scan or enter booking code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSearching}
                />
                <button
                  className="absolute right-3 top-2.5 p-1.5 bg-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-200 transition-colors"
                  type="submit"
                  disabled={isSearching}
                >
                  {isSearching ? <LoadingSpinner size={18} /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-12 space-y-8">
        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/scan">
            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md group cursor-pointer overflow-hidden">
              <CardContent className="p-6 flex items-start space-x-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-slate-900">Scan QR Code</h3>
                  <p className="text-sm text-slate-500">
                    Quickly check-in guests by scanning their booking slip
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/bookings/new">
            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md group cursor-pointer overflow-hidden">
              <CardContent className="p-6 flex items-start space-x-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-slate-900">New Reservation</h3>
                  <p className="text-sm text-slate-500">
                    Create a new room reservation for a walk-in guest
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/bookings?filter=active">
            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md group cursor-pointer overflow-hidden">
              <CardContent className="p-6 flex items-start space-x-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <DoorOpen className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-slate-900">Active Guests</h3>
                  <p className="text-sm text-slate-500">
                    View list of {summary.active_guests} currently checked-in guests
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {businessInfo?.latitude && businessInfo?.longitude && (
            <button
              onClick={() => setShowMapModal(true)}
              className="text-left"
            >
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md group cursor-pointer overflow-hidden">
                <CardContent className="p-6 flex items-start space-x-4">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 text-left">
                    <h3 className="font-semibold text-lg text-slate-900">Business Location</h3>
                    <p className="text-sm text-slate-500">
                      View business location on Google Maps
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          )}
        </div>

        {/* Room Status */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Room Availability</h2>

            <div className="relative w-full sm:w-64">
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
                    if (end) displayValue = `${format(start, "MMM d Y")} - ${format(end, "MMM d Y")}`
                    else displayValue = format(start, "MMM d Y")
                  }

                  return (
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-indigo-500 z-10" />
                      <input
                        {...inputProps}
                        ref={ref}
                        value={displayValue}
                        type="text"
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                        placeholder="Select Dates"
                        readOnly
                      />
                    </div>
                  )
                }}
              />
            </div>
          </div>

          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-0">
              {isLoadingRooms ? (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner size={40} />
                </div>
              ) : roomAvailability.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="p-4 bg-slate-50 rounded-full inline-block mb-3">
                    <Hotel className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No room types configured yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {roomAvailability.map((roomType) => {
                    const isFull = roomType.available === 0
                    const utilizationRate = ((roomType.total - roomType.available) / roomType.total) * 100
                    const statusColor = isFull ? "bg-red-500" : utilizationRate > 70 ? "bg-amber-500" : "bg-emerald-500"

                    return (
                      <div key={roomType.type} className="p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <h3 className="font-semibold text-base text-slate-900">{roomType.type}</h3>
                              {isFull ? (
                                <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Full</Badge>
                              ) : roomType.available <= 2 ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 h-5 text-[10px] px-1.5">High Demand</Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 h-5 text-[10px] px-1.5">Available</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-sm">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${statusColor}`}
                                  style={{ width: `${utilizationRate}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 w-8 text-right">
                                {Math.round(utilizationRate)}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1 sm:text-right">
                            <span className="text-2xl font-bold text-slate-900">{roomType.available}</span>
                            <span className="text-xs text-slate-500 font-medium">/ {roomType.total}</span>
                          </div>
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
