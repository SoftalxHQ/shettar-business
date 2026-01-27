"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Calendar, Users, DollarSign, Phone, Mail, Eye, X, Printer, MoreVertical, ArrowLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

interface Reservation {
  id: number
  booking_id: string
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
}

export default function BookingsPage() {
  const { user, businessId, businessName, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterParam = searchParams?.get("filter") || "all"

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [businessDetails, setBusinessDetails] = useState<{ logo_url?: string; check_in?: string; check_out?: string } | null>(null)

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

        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/reservations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          // console.log('Reservations data from API:', data)
          // console.log('First reservation payment_method:', data[0]?.payment_method)
          // console.log('Payment method labels:', paymentMethodLabels)
          // Sort by latest created first
          data.sort((a: Reservation, b: Reservation) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setReservations(data)
        } else {
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}))
            if (
              errorData.errors?.[0]?.id === 'expiration' ||
              errorData.errors?.[0]?.message === 'Token has expired' ||
              errorData.message === 'Signature has expired'
            ) {
              logout(true)
              return
            }
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
  }, [businessId, user])

  // Helper function to determine if a reservation is active, upcoming, or past
  const getReservationStatus = (reservation: Reservation) => {
    const now = new Date()
    const startDate = new Date(reservation.start_date)
    const endDate = new Date(reservation.end_date)

    if (reservation.cancelled) return "cancelled"
    if (now >= startDate && now <= endDate) return "active"
    if (now < startDate) return "upcoming"
    return "past"
  }

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      `${reservation.other_first_name} ${reservation.other_last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      reservation.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.other_email_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.booking_id.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  // Filter by status
  const activeReservations = filteredReservations.filter((r) => getReservationStatus(r) === "active")
  const upcomingReservations = filteredReservations.filter((r) => getReservationStatus(r) === "upcoming")
  const pastReservations = filteredReservations.filter((r) => getReservationStatus(r) === "past")
  const cancelledReservations = filteredReservations.filter((r) => getReservationStatus(r) === "cancelled")

  const today = new Date().toISOString().split("T")[0]
  const todayCheckIns = upcomingReservations.filter((r) => r.start_date.split("T")[0] === today)
  const todayCheckOuts = activeReservations.filter((r) => r.end_date.split("T")[0] === today)

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

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0px'
    iframe.style.height = '0px'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    // Format dates with business check-in/check-out times
    const formatReceiptDateTime = (dateStr: string, timeStr?: string) => {
      const date = new Date(dateStr)
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })

      if (!timeStr) return formattedDate

      let formattedTime = timeStr
      try {
        const today = new Date().toISOString().split('T')[0]
        const timeDate = new Date(`${today}T${timeStr.includes('T') ? timeStr.split('T')[1] : timeStr}`)
        if (!isNaN(timeDate.getTime())) {
          formattedTime = timeDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }
      } catch (e) {
        // fallback to original string if parsing fails
      }

      return `${formattedDate} at ${formattedTime}`
    }

    const checkInDisplay = formatReceiptDateTime(reservation.start_date, businessDetails?.check_in)
    const checkOutDisplay = formatReceiptDateTime(reservation.end_date, businessDetails?.check_out)

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${reservation.booking_id}</title>
          <style>
            body { font-family: 'Courier New', monospace; max-width: 400px; margin: 20px auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .section { margin: 15px 0; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
             ${businessDetails?.logo_url
        ? `<img src="${businessDetails.logo_url}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />`
        : `<div style="width: 60px; height: 60px; background-color: #f3f4f6; border-radius: 50%; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px; font-weight: bold;">${(businessName || "H").charAt(0)}</div>`
      }
            <h2>${businessName || "RESERVATION RECEIPT"}</h2>
            <p>Booking ID: ${reservation.booking_id}</p>
          </div>
          <div class="section">
            <h3>Guest Information</h3>
            <div class="row"><span class="label">Name:</span><span>${reservation.other_first_name} ${reservation.other_last_name}</span></div>
            <div class="row"><span class="label">Email:</span><span>${reservation.other_email_address}</span></div>
            <div class="row"><span class="label">Phone:</span><span>${reservation.other_phone_number}</span></div>
          </div>
          <div class="section">
            <h3>Booking Details</h3>
            <div class="row"><span class="label">Room Type:</span><span>${reservation.room_type_name}</span></div>
            <div class="row"><span class="label">Check-in:</span><span>${checkInDisplay}</span></div>
            <div class="row"><span class="label">Check-out:</span><span>${checkOutDisplay}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="label">Payment:</span><span>${paymentMethodLabels[reservation.payment_method] || "Unknown"}</span></div>
            <div class="row total"><span class="label">Total:</span><span>₦${reservation.total_amount?.toLocaleString()}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for staying with us!</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(receiptHtml)
      doc.close()

      iframe.onload = () => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        // Wait for print dialog to close (approximate) or user interaction
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 1000)
      }
    }
  }

  if (user && user.role !== "admin" && !user.permissions?.bookings?.view) {
    return null
  }

  const ReservationsTable = ({ data }: { data: Reservation[] }) => {
    if (data.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No reservations found
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
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
            {data.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">
                  <div>{reservation.other_first_name} {reservation.other_last_name}</div>
                  <div className="text-xs text-muted-foreground">{reservation.other_email_address}</div>
                </TableCell>
                <TableCell className="text-indigo-500 font-medium">{reservation.booking_id}</TableCell>
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
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedReservation(reservation)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="sr-only">View</span>
                    </Button>
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
    )
  }

  // ... rest of the component

  return (
    <DashboardLayout activeTab="bookings">
      <div className="space-y-6">
        {/* Header and Search parts remain similar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
              <p className="text-muted-foreground">Manage all hotel reservations</p>
            </div>
          </div>
          {(user?.role === "admin" || user?.permissions?.bookings?.create) && (
            <Link href="/dashboard/bookings/new">
              <Button className="bg-indigo-500 hover:bg-indigo-600">
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, room, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs for filtering */}
        <Tabs defaultValue={filterParam} className="w-full">
          <TabsList>
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

          <TabsContent value="all" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="p-8 text-center">
                <LoadingSpinner size={32} className="mx-auto" />
                <p className="text-muted-foreground mt-4">Loading reservations...</p>
              </div>
            ) : (
              <ReservationsTable data={filteredReservations} />
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-6">
            <ReservationsTable data={activeReservations} />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            <ReservationsTable data={upcomingReservations} />
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            <ReservationsTable data={pastReservations} />
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 mt-6">
            <ReservationsTable data={cancelledReservations} />
          </TabsContent>
        </Tabs>

        {/* Detailed Reservation Modal */}
        <Dialog open={!!selectedReservation} onOpenChange={(open) => !open && setSelectedReservation(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">Reservation Details</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedReservation && selectedReservation.booking_id}
                    </p>
                  </div>
                </div>
                {selectedReservation && (
                  <Badge className={getStatusColor(getReservationStatus(selectedReservation))} variant="outline">
                    {getReservationStatus(selectedReservation)}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {selectedReservation && (
              <div className="space-y-6 mt-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-xl font-bold">₦{selectedReservation.total_amount?.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Guests</p>
                          <p className="text-xl font-bold">{selectedReservation.guests + selectedReservation.children}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🛏️</span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Room</p>
                          <p className="text-xl font-bold">{selectedReservation.room_number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-8">
                    {/* Guest Information */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">Guest Information</h3>
                      </div>
                      <div className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Primary Guest</p>
                          <p className="font-medium text-lg">{selectedReservation.other_first_name} {selectedReservation.other_last_name}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{selectedReservation.other_email_address}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{selectedReservation.other_phone_number}</span>
                          </div>
                          {(selectedReservation.emer_first_name || selectedReservation.emer_phone_number) && (
                            <div className="pt-2 mt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Emergency Contact</p>
                              <div className="text-sm">
                                {selectedReservation.emer_first_name && <span className="font-medium">{selectedReservation.emer_first_name} {selectedReservation.emer_last_name}</span>}
                                {selectedReservation.emer_phone_number && <div className="text-muted-foreground text-xs mt-0.5">{selectedReservation.emer_phone_number}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Room Details */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🛏️</span>
                        </div>
                        <h3 className="font-semibold text-lg">Room Details</h3>
                      </div>
                      <div className="bg-white border rounded-lg p-4 space-y-4 shadow-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Room Type</p>
                            <p className="font-medium">{selectedReservation.room_type_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Room Number</p>
                            <p className="font-medium">{selectedReservation.room_number || "Not Assigned"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Adults</p>
                            <p className="font-medium">{selectedReservation.guests}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Children</p>
                            <p className="font-medium">{selectedReservation.children}</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Stay Duration */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg">Stay Duration</h3>
                      </div>
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase mb-1">Check-in</p>
                            <p className="font-medium">{formatDateTime(selectedReservation.start_date)}</p>
                          </div>
                          <div className="text-muted-foreground">→</div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Check-out</p>
                            <p className="font-medium">{formatDateTime(selectedReservation.end_date)}</p>
                          </div>
                        </div>

                        {/* Status Indicators */}
                        <div className="space-y-3 pt-3 border-t">
                          {selectedReservation.checked_in_at ? (
                            <div className="text-sm bg-green-50 text-green-700 p-2 rounded flex justify-between items-center">
                              <span>✓ Checked In</span>
                              <span className="text-xs opacity-75">{formatDateTime(selectedReservation.checked_in_at)}</span>
                            </div>
                          ) : (
                            <div className="text-sm bg-slate-50 text-slate-500 p-2 rounded flex justify-between items-center">
                              <span>Pending Check-in</span>
                            </div>
                          )}

                          {selectedReservation.checked_out_at && (
                            <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded flex justify-between items-center">
                              <span>✓ Checked Out</span>
                              <span className="text-xs opacity-75">{formatDateTime(selectedReservation.checked_out_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Payment Info */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-lg">Payment</h3>
                      </div>
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Payment Method</span>
                          <Badge variant="outline">
                            {selectedReservation.payment_method !== null && selectedReservation.payment_method !== undefined
                              ? (paymentMethodLabels[selectedReservation.payment_method] || "Unknown")
                              : "Not specified"}
                          </Badge>
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                          <span className="font-medium">Total Paid</span>
                          <span className="font-bold text-lg">₦{selectedReservation.total_amount?.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>
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
