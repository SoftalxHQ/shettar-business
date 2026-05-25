"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, DoorOpen, DoorClosed, User, Calendar, CreditCard, CheckCircle, XCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { getAuthToken } from "@/lib/storage"
import { toast } from "sonner"
import { reservationGuestName } from "@/lib/reservation-guest"

interface Booking {
  id: number
  booking_id: string
  other_first_name: string
  other_last_name: string
  other_email_address: string
  room_number?: string
  start_date: string
  end_date: string
  guests: number
  total_amount: number
  payment_method: string
  occupied: boolean
  processed: boolean
  cancelled: boolean
}

export default function CheckInOutPage() {
  const { businessId } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false)
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false)
  const [checkInNotes, setCheckInNotes] = useState("")
  const [checkOutNotes, setCheckOutNotes] = useState("")

  useEffect(() => {
    const loadBookings = async () => {
      if (!businessId) return
      setIsLoading(true)
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()
        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/reservations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        if (response.ok && Array.isArray(data)) {
          setBookings(data)
        } else {
          toast.error(data.status?.message || data.error || "Failed to load reservations")
        }
      } catch {
        toast.error("Failed to load reservations")
      } finally {
        setIsLoading(false)
      }
    }
    loadBookings()
  }, [businessId])

  const pendingCheckIns = bookings.filter(
    (b) => !b.cancelled && !b.checked_in_at && !b.checked_out_at
  )
  const checkedIn = bookings.filter(
    (b) => !b.cancelled && b.checked_in_at && !b.checked_out_at
  )

  const filteredPendingCheckIns = pendingCheckIns.filter(
    (booking) =>
      reservationGuestName(booking).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(booking.room_number || "").includes(searchQuery) ||
      booking.booking_id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredCheckedIn = checkedIn.filter(
    (booking) =>
      reservationGuestName(booking).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(booking.room_number || "").includes(searchQuery) ||
      booking.booking_id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCheckIn = async () => {
    if (!selectedBooking) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const businessId = localStorage.getItem("businessId")

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/reservations/${selectedBooking.booking_id}/check_in`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: checkInNotes.trim() || undefined }),
      })

      const data = await response.json()
      if (response.ok && data.status?.code === 200) {
        toast.success(data.status?.message || "Guest checked in successfully")
        if (data.data) {
          setBookings(bookings.map((b) => (b.id === selectedBooking.id ? { ...b, ...data.data, occupied: true } : b)))
        }
        setIsCheckInDialogOpen(false)
        setSelectedBooking(null)
        setCheckInNotes("")
      } else {
        toast.error(data.status?.message || data.error || "Failed to check in guest")
      }
    } catch (error) {
      console.error("Check-in failed:", error)
      toast.error("An error occurred during check-in")
    }
  }

  const handleCheckOut = async () => {
    if (!selectedBooking) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const businessId = localStorage.getItem("businessId")

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/reservations/${selectedBooking.booking_id}/check_out`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: checkOutNotes.trim() || undefined }),
      })

      const data = await response.json()
      if (response.ok && data.status?.code === 200) {
        toast.success(data.status?.message || "Guest checked out successfully")
        if (data.data) {
          setBookings(bookings.map((b) => (b.id === selectedBooking.id ? { ...b, ...data.data, occupied: false } : b)))
        }
        setIsCheckOutDialogOpen(false)
        setSelectedBooking(null)
        setCheckOutNotes("")
      } else {
        toast.error(data.status?.message || data.error || "Failed to check out guest")
      }
    } catch (error) {
      console.error("Check-out failed:", error)
      toast.error("An error occurred during check-out")
    }
  }

  const openCheckInDialog = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsCheckInDialogOpen(true)
  }

  const openCheckOutDialog = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsCheckOutDialogOpen(true)
  }

  return (
    <DashboardLayout activeTab="check-in/out">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-in / Check-out</h1>
          <p className="text-muted-foreground">Manage guest arrivals and departures</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="check-in" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="check-in">Pending Check-in ({pendingCheckIns.length})</TabsTrigger>
            <TabsTrigger value="checked-in">Checked In ({checkedIn.length})</TabsTrigger>
          </TabsList>

          {/* Pending Check-ins */}
          <TabsContent value="check-in" className="space-y-4">
            {filteredPendingCheckIns.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <DoorOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending check-ins</h3>
                    <p className="text-muted-foreground">All guests have been checked in or no arrivals today</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredPendingCheckIns.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{reservationGuestName(booking)}</h3>
                              <Badge className="bg-blue-100 text-blue-700">Arriving Today</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{booking.other_email_address}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <DoorOpen className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Room</div>
                              <div className="font-medium">{booking.room_number || "TBD"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">{new Date(booking.start_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">{new Date(booking.end_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{booking.guests}</div>
                            </div>
                          </div>
                        </div>

                        {booking.booking_id && (
                          <Alert>
                            <AlertDescription className="text-sm">
                              <span className="font-medium">Booking ID: </span>
                              {booking.booking_id}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <Button
                        onClick={() => openCheckInDialog(booking)}
                        className="bg-purple-600 hover:bg-purple-700 ml-4"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Check In
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Checked In Guests */}
          <TabsContent value="checked-in" className="space-y-4">
            {filteredCheckedIn.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <DoorClosed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No checked-in guests</h3>
                    <p className="text-muted-foreground">No guests are currently checked in</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredCheckedIn.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{reservationGuestName(booking)}</h3>
                              <Badge className="bg-green-100 text-green-700">Staying</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{booking.other_email_address}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <DoorClosed className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Room</div>
                              <div className="font-medium">{booking.room_number || "N/A"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">{new Date(booking.end_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Total</div>
                              <div className="font-medium">₦{Number(booking.total_amount || 0).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{booking.guests}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button onClick={() => openCheckOutDialog(booking)} variant="outline" className="ml-4">
                        <XCircle className="w-4 h-4 mr-2" />
                        Check Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Check-in Dialog */}
        <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check In Guest</DialogTitle>
              <DialogDescription>Complete the check-in process for {reservationGuestName(selectedBooking)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Guest Name</Label>
                  <div className="font-medium">{reservationGuestName(selectedBooking)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Room Number</Label>
                  <div className="font-medium">{selectedBooking?.room_number || "TBD"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Check-in Date</Label>
                  <div className="font-medium">
                    {selectedBooking && new Date(selectedBooking.start_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Check-out Date</Label>
                  <div className="font-medium">
                    {selectedBooking && new Date(selectedBooking.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Number of Guests</Label>
                <div className="font-medium">{selectedBooking?.guests}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkInNotes">Notes (Optional)</Label>
                <Textarea
                  id="checkInNotes"
                  placeholder="Add any notes about the check-in..."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCheckInDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckIn} className="bg-purple-600 hover:bg-purple-700">
                Confirm Check-in
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Check-out Dialog */}
        <Dialog open={isCheckOutDialogOpen} onOpenChange={setIsCheckOutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check Out Guest</DialogTitle>
              <DialogDescription>Complete the check-out process for {reservationGuestName(selectedBooking)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Guest Name</Label>
                  <div className="font-medium">{reservationGuestName(selectedBooking)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Room Number</Label>
                  <div className="font-medium">{selectedBooking?.room_number || "N/A"}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">₦{Number(selectedBooking?.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted-foreground italic">Payment Method</span>
                  <span className="font-medium">{selectedBooking?.payment_method}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutNotes">Notes (Optional)</Label>
                <Textarea
                  id="checkOutNotes"
                  placeholder="Add any notes about the check-out..."
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCheckOutDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckOut} className="bg-purple-600 hover:bg-purple-700">
                Confirm Check-out
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
