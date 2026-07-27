"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Calendar, Eye, Printer, ChevronLeft, ChevronRight, Copy, LogOut, LogIn, ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfToday, endOfToday } from "date-fns"
import { cn } from "@/lib/utils"
import { reservationGuestName, reservationEmergencyName, reservationEmergencyPhone, reservationHasEmergencyContact } from "@/lib/reservation-guest"
import {
  BookingReceiptBusiness,
  PAYMENT_METHOD_LABELS,
  printBookingReceiptSmart,
} from "@/lib/booking-receipt"

interface Reservation {
  id: number
  booking_id: string
  booking_id_revealed?: boolean
  other_first_name: string
  other_last_name: string
  other_phone_number: string
  other_email_address: string
  emer_first_name?: string
  emer_last_name?: string
  emer_phone_number?: string
  start_date: string
  end_date: string
  guests: number
  children: number
  total_amount: number
  payment_method: number
  cancelled: boolean
  room_number: string
  room_type_name: string
  created_at: string
  checked_in_at?: string
  checked_out_at?: string
  checked_in_by_name?: string
  checked_out_by_name?: string
  settled_at?: string | null
  settlement_type?: string | null
  status?: string
  client_name?: string
  client_email?: string
  client_phone?: string
}

import { Suspense } from "react"

function BookingsContent() {
  const { user, businessId, businessName, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterParam = searchParams?.get("filter") || "all"

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [businessDetails, setBusinessDetails] = useState<BookingReceiptBusiness | null>(null)

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
    setStartDate(tempStartDate)
    setEndDate(tempEndDate)
    setPopoverOpen(false)
  }

  // Check permissions
  useEffect(() => {
    if (user && user.role !== "admin") {
      if (!user.permissions?.bookings?.view) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  // Fetch business details for receipt
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      if (!businessId) return

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()
        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBusinessDetails(data)
        }
      } catch (error) {
        console.error("Failed to fetch business details:", error)
      }
    }

    fetchBusinessDetails()
  }, [businessId])

  // Fetch reservations on mount
  useEffect(() => {
    const fetchReservations = async () => {
      // Logic only runs if we pass perm check
      if (user?.role !== "admin" && !user?.permissions?.bookings?.view) return;

      if (!businessId) return

      try {
        setIsLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()

        const params = new URLSearchParams()
        if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"))
        if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"))

        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/reservations?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          // API now handles sorting in the updated controller
          setReservations(data)
        } else {
          if (response.status === 401) {
            logout(true)
            return
          }
          console.error("Failed to fetch reservations")
          toast.error("Failed to fetch reservations")
        }
      } catch (error) {
        console.error("Error fetching reservations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [businessId, user, startDate, endDate])

  // Helper function to determine if a reservation is active, upcoming, or past
  const getReservationStatus = (reservation: Reservation) => {
    if (reservation.cancelled) return "cancelled"
    if (reservation.checked_out_at) return "past"
    if (reservation.status) return reservation.status

    const now = new Date()
    const startDate = new Date(reservation.start_date)
    const endDate = new Date(reservation.end_date)

    if (now >= startDate && now <= endDate) return "active"
    if (now < startDate) return "upcoming"
    return "past"
  }

  const filteredReservations = reservations.filter((reservation) => {
    const searchLower = searchQuery.toLowerCase()
    const fullName = String(reservation.client_name || `${reservation.other_first_name || ""} ${reservation.other_last_name || ""}`).toLowerCase()

    // Safety checks for other fields
    const roomNum = String(reservation.room_number || "").toLowerCase()
    const email = String(reservation.client_email || reservation.other_email_address || "").toLowerCase()
    const bookingId = String(reservation.booking_id || "").toLowerCase()
    const status = getReservationStatus(reservation)

    const matchesSearch =
      fullName.includes(searchLower) ||
      roomNum.includes(searchLower) ||
      email.includes(searchLower) ||
      bookingId.includes(searchLower) ||
      status.includes(searchLower)

    return matchesSearch
  })

  // Filter by status
  const activeReservations = filteredReservations.filter((r) => getReservationStatus(r) === "active")
  const upcomingReservations = filteredReservations.filter((r) => getReservationStatus(r) === "upcoming")
  const pastReservations = filteredReservations.filter((r) => getReservationStatus(r) === "past")
  const cancelledReservations = filteredReservations.filter((r) => getReservationStatus(r) === "cancelled")

  const today = new Date().toISOString().split("T")[0]
  const todayCheckIns = upcomingReservations.filter((r) => r.start_date.split("T")[0] === today)
  const todayCheckOuts = filteredReservations.filter((r) => {
    if (r.cancelled) return false
    const scheduledToday = r.end_date.split("T")[0] === today
    const checkedOutToday = r.checked_out_at?.split("T")[0] === today
    return scheduledToday || !!checkedOutToday
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-100"
      case "upcoming":
        return "bg-sky-50 text-sky-700 border-sky-100"
      case "past":
        return "bg-slate-100 text-slate-600 border-slate-200"
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-100"
      default:
        return "bg-slate-100 text-slate-600 border-slate-200"
    }
  }

  const paymentMethodLabels: { [key: number]: string } = {
    0: "Wallet",
    1: "Card",
    2: "POS",
    3: "Cash",
    4: "Transfer",
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }

    return date.toLocaleString('en-US', options).replace(',', ' at')
  }

  const handlePrintReceipt = (reservation: Reservation) => {
    if (!reservation) return

    void printBookingReceiptSmart({
      reservation,
      business: {
        name: businessName || businessDetails?.name,
        logo_url: businessDetails?.logo_url,
        check_in: businessDetails?.check_in,
        check_out: businessDetails?.check_out,
        address: businessDetails?.address,
        city: businessDetails?.city,
        state: businessDetails?.state,
      },
      guestName: reservationGuestName(reservation),
      paymentMethodLabel: PAYMENT_METHOD_LABELS[reservation.payment_method] || "Unknown",
      detailed: Boolean(
        reservation.room_number ||
          reservation.checked_in_at ||
          reservation.checked_out_at
      ),
    })
  }

  if (user && user.role !== "admin" && !user.permissions?.bookings?.view) {
    return null
  }

  const ReservationsTable = ({ data }: { data: Reservation[] }) => {
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const totalPages = Math.ceil(data.length / itemsPerPage)

    // Reset to page 1 if data changes (e.g. search filter applied or tab changed)
    useEffect(() => {
      setCurrentPage(1)
    }, [data.length])

    if (data.length === 0) {
      return (
        <div className="h-full min-h-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
          <p className="text-sm text-slate-500">No reservations found</p>
        </div>
      )
    }

    const paginatedData = data.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )

    const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    }

    return (
      <div className="h-full min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50 [&_tr]:border-slate-200">
              <TableRow className="hover:bg-slate-50">
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-[200px]">Client</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Booking ID</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">End</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Room type</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((reservation) => (
                <TableRow key={reservation.id} className="hover:bg-slate-50/80">
                  <TableCell className="px-3 py-2.5 font-medium">
                    <div className="text-sm text-slate-900">{reservation.client_name || `${reservation.other_first_name || ''} ${reservation.other_last_name || ''}`}</div>
                    <div className="text-[11px] text-slate-500">{reservation.client_email || reservation.other_email_address || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-700 font-medium font-mono text-xs">
                        {reservation.booking_id}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-slate-700"
                        onClick={() => {
                          void navigator.clipboard.writeText(reservation.booking_id).then(() => {
                            toast.success("Booking code copied")
                          })
                        }}
                        aria-label={`Copy booking code ${reservation.booking_id}`}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm tabular-nums font-medium text-slate-900">₦{reservation.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600">{new Date(reservation.start_date).toLocaleDateString()}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600">{new Date(reservation.end_date).toLocaleDateString()}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-700">{reservation.room_type_name}</TableCell>
                  <TableCell className="px-3 py-2.5">
                    <Badge variant="outline" className={cn("rounded-md border text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0", getStatusColor(getReservationStatus(reservation)))}>
                      {getReservationStatus(reservation)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedReservation(reservation)}
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="sr-only">View</span>
                      </Button>
                      {reservation.checked_in_at &&
                        !reservation.checked_out_at &&
                        !reservation.cancelled &&
                        !reservation.settled_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        >
                          <Link
                            href={`/dashboard/scan?code=${encodeURIComponent(reservation.booking_id)}`}
                            title="Check out guest"
                            aria-label={`Check out ${reservation.booking_id}`}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintReceipt(reservation)}
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="sr-only">Print</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50">
            <div className="text-[11px] text-slate-500">
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0 border-slate-200"
              >
                <span className="sr-only">Previous page</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage > 3) pageNum = currentPage - 2 + i
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i)
                  }
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className={cn(
                          "h-7 w-7 p-0 text-xs",
                          currentPage === pageNum
                            ? "bg-indigo-600 hover:bg-indigo-700"
                            : "border-slate-200 text-slate-600",
                        )}
                      >
                        {pageNum}
                      </Button>
                    )
                  }
                  return null
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0 border-slate-200"
              >
                <span className="sr-only">Next page</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout activeTab="bookings">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Bookings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Hotel reservations</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 min-w-[4.5rem]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                  <LogIn className="w-3 h-3" />
                  In
                </p>
                <p className="text-sm font-semibold tabular-nums text-slate-900 leading-none mt-0.5">{todayCheckIns.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 min-w-[4.5rem]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                  <LogOut className="w-3 h-3" />
                  Out
                </p>
                <p className="text-sm font-semibold tabular-nums text-slate-900 leading-none mt-0.5">{todayCheckOuts.length}</p>
              </div>
            </div>
            {(user?.role === "admin" || user?.permissions?.bookings?.create) && (
              <Link href="/dashboard/bookings/new">
                <Button className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Booking
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search guest, room, email, or booking code…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-lg border-slate-200"
              />
            </div>

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-3 flex items-center gap-2.5 border-slate-200 bg-white hover:bg-slate-50 rounded-lg justify-between min-w-[180px] shrink-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Date range</span>
                      <span className="text-xs font-medium text-slate-700">
                        {rangeSelection === "Custom" ? (
                          startDate && endDate ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}` : "Custom"
                        ) : rangeSelection}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", popoverOpen && "rotate-180")} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 rounded-xl shadow-sm border-slate-200 overflow-hidden" align="end">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-1">
                    {["Today", "Last 7 days", "This month", "Last month", "All time", "Custom"].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setRange(range)}
                        className={cn(
                          "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all text-left flex items-center justify-between",
                          rangeSelection === range
                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500 hover:bg-white hover:text-slate-900"
                        )}
                      >
                        {range}
                        {rangeSelection === range && <div className="w-1 h-1 bg-indigo-600 rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-white">
                  {isCustomMode && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Start date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-9 px-3 bg-white border-slate-200 rounded-lg text-sm">
                              {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl border-slate-200" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={tempStartDate}
                              onSelect={setTempStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">End date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-9 px-3 bg-white border-slate-200 rounded-lg text-sm">
                              {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl border-slate-200" align="start">
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
                          className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                          onClick={applyCustomFilter}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 rounded-lg"
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
        </div>

        <Tabs defaultValue={filterParam} className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <TabsList className="shrink-0 h-9 w-fit max-w-full overflow-x-auto">
            <TabsTrigger value="all" className="gap-1.5 text-sm">
              All
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">{filteredReservations.length}</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5 text-sm">
              Active
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">{activeReservations.length}</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5 text-sm">
              Upcoming
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">{upcomingReservations.length}</span>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5 text-sm">
              Past
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">{pastReservations.length}</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-1.5 text-sm">
              Cancelled
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">{cancelledReservations.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
                <LoadingSpinner size={32} />
                <p className="text-sm text-slate-500 mt-3">Loading reservations…</p>
              </div>
            ) : (
              <ReservationsTable data={filteredReservations} />
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <ReservationsTable data={activeReservations} />
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <ReservationsTable data={upcomingReservations} />
          </TabsContent>

          <TabsContent value="past" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <ReservationsTable data={pastReservations} />
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0 flex-1 min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <ReservationsTable data={cancelledReservations} />
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedReservation} onOpenChange={(open) => !open && setSelectedReservation(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5 min-w-0">
                <DialogTitle className="text-base font-semibold text-slate-900">Reservation</DialogTitle>
                <DialogDescription className="text-xs">
                  <span className="font-mono text-slate-600">{selectedReservation?.booking_id}</span>
                </DialogDescription>
              </div>
              {selectedReservation && (
                <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(selectedReservation)} className="h-8 gap-1.5 shrink-0 rounded-lg">
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </Button>
              )}
            </DialogHeader>

            {selectedReservation && (
              <div className="px-5 py-4 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedReservation.client_name || `${selectedReservation.other_first_name || ''} ${selectedReservation.other_last_name || ''}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedReservation.client_email || selectedReservation.other_email_address || 'N/A'}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-md border text-[10px] font-semibold uppercase tracking-wide shrink-0", getStatusColor(getReservationStatus(selectedReservation)))}>
                    {getReservationStatus(selectedReservation)}
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-slate-100 pt-4">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Check-in</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(selectedReservation.start_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Check-out</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(selectedReservation.end_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Guests</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{selectedReservation.guests} adults, {selectedReservation.children} children</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-slate-900">₦{selectedReservation.total_amount?.toLocaleString()}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{selectedReservation.client_phone || selectedReservation.other_phone_number || 'N/A'}</dd>
                  </div>
                </dl>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-900 mb-2">Emergency contact</p>
                  {reservationHasEmergencyContact(selectedReservation) ? (
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Name</dt>
                        <dd className="mt-0.5 text-slate-700">{reservationEmergencyName(selectedReservation) || "N/A"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                        <dd className="mt-0.5 text-slate-700">{reservationEmergencyPhone(selectedReservation) || "N/A"}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-slate-500">No emergency contact on file.</p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-900 mb-2">Room & payment</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Room type</dt>
                      <dd className="mt-0.5 text-slate-700">{selectedReservation.room_type_name}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Room number</dt>
                      <dd className="mt-0.5 text-slate-700">{selectedReservation.room_number || "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payment</dt>
                      <dd className="mt-0.5 text-slate-700">
                        {selectedReservation.payment_method !== null && selectedReservation.payment_method !== undefined
                          ? (paymentMethodLabels[selectedReservation.payment_method] || "Unknown")
                          : "Not specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Booked</dt>
                      <dd className="mt-0.5 text-slate-700">{new Date(selectedReservation.created_at).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-900 mb-2">Timeline</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-3">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">Created</p>
                        <p className="text-xs text-slate-500">{formatDateTime(selectedReservation.created_at)}</p>
                      </div>
                    </li>
                    {selectedReservation.checked_in_at && (
                      <li className="flex gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-900">Checked in</p>
                          <p className="text-xs text-slate-500">{formatDateTime(selectedReservation.checked_in_at)}</p>
                          {selectedReservation.checked_in_by_name && (
                            <p className="text-xs text-slate-500">by {selectedReservation.checked_in_by_name}</p>
                          )}
                        </div>
                      </li>
                    )}
                    {selectedReservation.checked_out_at && (
                      <li className="flex gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-900">Checked out</p>
                          <p className="text-xs text-slate-500">{formatDateTime(selectedReservation.checked_out_at)}</p>
                          {selectedReservation.checked_out_by_name && (
                            <p className="text-xs text-slate-500">by {selectedReservation.checked_out_by_name}</p>
                          )}
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="h-dvh flex items-center justify-center"><LoadingSpinner size={32} /></div>}>
      <BookingsContent />
    </Suspense>
  )
}
