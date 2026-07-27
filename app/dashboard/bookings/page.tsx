"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Calendar, Users, DollarSign, Phone, Mail, Eye, X, Printer, MoreVertical, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Copy, LogOut } from "lucide-react"
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
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react"
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
        return "bg-green-100 text-green-700"
      case "upcoming":
        return "bg-blue-100 text-blue-700"
      case "past":
        return "bg-gray-100 text-gray-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
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
      <div className="h-full min-h-0 flex flex-col gap-2">
        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow>
                <TableHead className="w-[200px]">Client Name</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    <div>{reservation.client_name || `${reservation.other_first_name || ''} ${reservation.other_last_name || ''}`}</div>
                    <div className="text-xs text-muted-foreground">{reservation.client_email || reservation.other_email_address || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-500 font-medium font-mono text-sm">
                        {reservation.booking_id}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                        onClick={() => {
                          void navigator.clipboard.writeText(reservation.booking_id).then(() => {
                            toast.success("Booking code copied")
                          })
                        }}
                        aria-label={`Copy booking code ${reservation.booking_id}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">₦{reservation.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>{new Date(reservation.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(reservation.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>{reservation.room_type_name}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(getReservationStatus(reservation))} rounded-full`}>
                      {getReservationStatus(reservation)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedReservation(reservation)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Eye className="w-4 h-4" />
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
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        >
                          <Link
                            href={`/dashboard/scan?code=${encodeURIComponent(reservation.booking_id)}`}
                            title="Check out guest"
                            aria-label={`Check out ${reservation.booking_id}`}
                          >
                            <LogOut className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintReceipt(reservation)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="sr-only">Print</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between px-1">
            <div className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className={`h-8 w-8 p-0 ${currentPage === pageNum ? "bg-indigo-500 hover:bg-indigo-600" : ""}`}
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
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ... rest of the component

  return (
    <DashboardLayout activeTab="bookings">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Dashboard
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Bookings</h1>
            <p className="text-xs text-slate-500">Manage all hotel reservations</p>
          </div>
          {(user?.role === "admin" || user?.permissions?.bookings?.create) && (
            <Link href="/dashboard/bookings/new" className="shrink-0">
              <Button className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </Link>
          )}
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, room, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 px-3 flex items-center gap-3 border-slate-200 shadow-sm bg-white hover:bg-slate-50 rounded-xl justify-between min-w-[200px] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Date Range</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {rangeSelection === "Custom" ? (
                        startDate && endDate ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}` : "Custom Range"
                      ) : rangeSelection}
                    </span>
                  </div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", popoverOpen && "rotate-180")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="end">
              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                <div className="grid grid-cols-2 gap-1">
                  {["Today", "Last 7 days", "This month", "Last month", "All time", "Custom"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setRange(range)}
                      className={cn(
                        "px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left flex items-center justify-between group",
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

              <div className="p-4 bg-white">
                {isCustomMode && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">Start date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                            {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={tempStartDate}
                            onSelect={setTempStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">End date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                            {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
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
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
                        onClick={applyCustomFilter}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 rounded-lg"
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

        <Tabs defaultValue={filterParam} className="flex-1 min-h-0 overflow-hidden gap-3">
          <TabsList className="shrink-0">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="rounded-full">
                {filteredReservations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              Active
              <Badge variant="secondary" className="rounded-full">
                {activeReservations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              Upcoming
              <Badge variant="secondary" className="rounded-full">
                {upcomingReservations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              Past
              <Badge variant="secondary" className="rounded-full">
                {pastReservations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              Cancelled
              <Badge variant="secondary" className="rounded-full">
                {cancelledReservations.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="min-h-0 overflow-hidden mt-0 flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white">
                <LoadingSpinner size={32} />
                <p className="text-sm text-slate-500 mt-3">Loading reservations...</p>
              </div>
            ) : (
              <ReservationsTable data={filteredReservations} />
            )}
          </TabsContent>

          <TabsContent value="active" className="min-h-0 overflow-hidden mt-0 flex flex-col">
            <ReservationsTable data={activeReservations} />
          </TabsContent>

          <TabsContent value="upcoming" className="min-h-0 overflow-hidden mt-0 flex flex-col">
            <ReservationsTable data={upcomingReservations} />
          </TabsContent>

          <TabsContent value="past" className="min-h-0 overflow-hidden mt-0 flex flex-col">
            <ReservationsTable data={pastReservations} />
          </TabsContent>

          <TabsContent value="cancelled" className="min-h-0 overflow-hidden mt-0 flex flex-col">
            <ReservationsTable data={cancelledReservations} />
          </TabsContent>
        </Tabs>

        {/* Detailed Reservation Modal */}
        <Dialog open={!!selectedReservation} onOpenChange={(open) => !open && setSelectedReservation(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <DialogTitle className="text-xl">Reservation Details</DialogTitle>
                <DialogDescription>
                  Booking ID: <span className="font-mono text-primary font-bold">{selectedReservation?.booking_id}</span>
                </DialogDescription>
              </div>
              {selectedReservation && (
                <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(selectedReservation)} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </Button>
              )}
            </DialogHeader>

            {selectedReservation && (
              <div className="space-y-8 pt-2">
                {/* Primary Guest Card */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedReservation.client_name || `${selectedReservation.other_first_name || ''} ${selectedReservation.other_last_name || ''}`}</h3>
                        <p className="text-muted-foreground text-sm">{selectedReservation.client_email || selectedReservation.other_email_address || 'N/A'}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(getReservationStatus(selectedReservation))}>
                      {getReservationStatus(selectedReservation).toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Check-in</p>
                      <p className="font-semibold text-slate-900">{formatDateTime(selectedReservation.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Check-out</p>
                      <p className="font-semibold text-slate-900">{formatDateTime(selectedReservation.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Guests</p>
                      <p className="font-semibold text-slate-900">{selectedReservation.guests} Adults, {selectedReservation.children} Children</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Total Amount</p>
                      <p className="font-semibold text-slate-900">₦{selectedReservation.total_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Phone</p>
                      <p className="font-semibold text-slate-900">{selectedReservation.client_phone || selectedReservation.other_phone_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3">
                  <h4 className="font-bold text-lg px-1">Emergency Contact</h4>
                  <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-6 grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                    {reservationHasEmergencyContact(selectedReservation) ? (
                      <>
                        <div>
                          <p className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Name</p>
                          <p className="text-slate-700 font-medium">
                            {reservationEmergencyName(selectedReservation) || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Phone</p>
                          <p className="text-slate-700 font-medium">
                            {reservationEmergencyPhone(selectedReservation) || "N/A"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <p className="text-slate-500">No emergency contact on file for this reservation.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Details (Gray Box) */}
                <div className="space-y-3">
                  <h4 className="font-bold text-lg px-1">Room & Booking Details</h4>
                  <div className="bg-slate-50/80 border rounded-xl p-6 grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Room Type</p>
                      <p className="text-slate-600">{selectedReservation.room_type_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Room Number</p>
                      <p className="text-slate-600">{selectedReservation.room_number || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Payment Method</p>
                      <p className="text-slate-600 font-medium">
                        {selectedReservation.payment_method !== null && selectedReservation.payment_method !== undefined
                          ? (paymentMethodLabels[selectedReservation.payment_method] || "Unknown")
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">Booking Date</p>
                      <p className="text-slate-600">{new Date(selectedReservation.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-4">
                  <h4 className="font-bold text-lg px-1">Activity Timeline</h4>
                  <div className="space-y-3">
                    {/* Created */}
                    <div className="flex gap-4 items-start">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-2.5 shrink-0 ring-4 ring-yellow-50" />
                      <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3 w-full">
                        <p className="font-semibold text-sm text-yellow-900">Reservation Created</p>
                        <p className="text-xs text-yellow-700 mt-1">{formatDateTime(selectedReservation.created_at)}</p>
                      </div>
                    </div>

                    {/* Checked In */}
                    {selectedReservation.checked_in_at && (
                      <div className="flex gap-4 items-start">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-2.5 shrink-0 ring-4 ring-green-50" />
                        <div className="bg-green-50/50 border border-green-100 rounded-lg p-3 w-full">
                          <p className="font-semibold text-sm text-green-900">Guest Checked In</p>
                          <p className="text-xs text-green-700 mt-1">{formatDateTime(selectedReservation.checked_in_at)}</p>
                          {selectedReservation.checked_in_by_name && (
                            <p className="text-xs text-green-700 mt-0.5">Processed by {selectedReservation.checked_in_by_name}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Checked Out */}
                    {selectedReservation.checked_out_at && (
                      <div className="flex gap-4 items-start">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2.5 shrink-0 ring-4 ring-blue-50" />
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 w-full">
                          <p className="font-semibold text-sm text-blue-900">Guest Checked Out</p>
                          <p className="text-xs text-blue-700 mt-1">{formatDateTime(selectedReservation.checked_out_at)}</p>
                          {selectedReservation.checked_out_by_name && (
                            <p className="text-xs text-blue-700 mt-0.5">Processed by {selectedReservation.checked_out_by_name}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
