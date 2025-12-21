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
import { MOCK_BOOKINGS, type Booking } from "@/lib/mock-data"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CheckInOutPage() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false)
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false)
  const [checkInNotes, setCheckInNotes] = useState("")
  const [checkOutNotes, setCheckOutNotes] = useState("")

  const pendingCheckIns = bookings.filter((b) => b.status === "confirmed")
  const checkedIn = bookings.filter((b) => b.status === "checked-in")

  const filteredPendingCheckIns = pendingCheckIns.filter(
    (booking) =>
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || booking.roomNumber.includes(searchQuery),
  )

  const filteredCheckedIn = checkedIn.filter(
    (booking) =>
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || booking.roomNumber.includes(searchQuery),
  )

  const handleCheckIn = () => {
    if (!selectedBooking) return

    setBookings(bookings.map((b) => (b.id === selectedBooking.id ? { ...b, status: "checked-in" as const } : b)))

    setIsCheckInDialogOpen(false)
    setSelectedBooking(null)
    setCheckInNotes("")
  }

  const handleCheckOut = () => {
    if (!selectedBooking) return

    setBookings(bookings.map((b) => (b.id === selectedBooking.id ? { ...b, status: "checked-out" as const } : b)))

    setIsCheckOutDialogOpen(false)
    setSelectedBooking(null)
    setCheckOutNotes("")
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
                              <h3 className="text-lg font-semibold">{booking.guestName}</h3>
                              <Badge className="bg-blue-100 text-blue-700">Arriving Today</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <DoorOpen className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Room</div>
                              <div className="font-medium">{booking.roomNumber}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">{new Date(booking.checkInDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">{new Date(booking.checkOutDate).toLocaleDateString()}</div>
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

                        {booking.specialRequests && (
                          <Alert>
                            <AlertDescription className="text-sm">
                              <span className="font-medium">Special Requests: </span>
                              {booking.specialRequests}
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
                              <h3 className="text-lg font-semibold">{booking.guestName}</h3>
                              <Badge className="bg-green-100 text-green-700">Staying</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <DoorClosed className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Room</div>
                              <div className="font-medium">{booking.roomNumber}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">{new Date(booking.checkOutDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Balance</div>
                              <div className="font-medium">₦{booking.totalAmount - booking.paidAmount}</div>
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
              <DialogDescription>Complete the check-in process for {selectedBooking?.guestName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Guest Name</Label>
                  <div className="font-medium">{selectedBooking?.guestName}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Room Number</Label>
                  <div className="font-medium">{selectedBooking?.roomNumber}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Check-in Date</Label>
                  <div className="font-medium">
                    {selectedBooking && new Date(selectedBooking.checkInDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Check-out Date</Label>
                  <div className="font-medium">
                    {selectedBooking && new Date(selectedBooking.checkOutDate).toLocaleDateString()}
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
              <DialogDescription>Complete the check-out process for {selectedBooking?.guestName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Guest Name</Label>
                  <div className="font-medium">{selectedBooking?.guestName}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Room Number</Label>
                  <div className="font-medium">{selectedBooking?.roomNumber}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">₦{selectedBooking?.totalAmount}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-green-600">₦{selectedBooking?.paidAmount}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Balance Due</span>
                  <span className="font-bold text-lg">
                    ₦{(selectedBooking?.totalAmount || 0) - (selectedBooking?.paidAmount || 0)}
                  </span>
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
