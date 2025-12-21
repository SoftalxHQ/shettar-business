"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Calendar, Users, DollarSign, Phone, Mail } from "lucide-react"
import { MOCK_BOOKINGS, MOCK_ROOMS, type Booking } from "@/lib/mock-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newBooking, setNewBooking] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    roomNumber: "",
    checkInDate: "",
    checkOutDate: "",
    guests: 1,
    specialRequests: "",
  })

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.roomNumber.includes(searchQuery) ||
      booking.guestEmail.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const today = new Date().toISOString().split("T")[0]
  const checkInBookings = filteredBookings.filter((b) => b.checkInDate === today && b.status === "confirmed")
  const checkOutBookings = filteredBookings.filter((b) => b.checkOutDate === today && b.status === "checked-in")

  const handleAddBooking = () => {
    const room = MOCK_ROOMS.find((r) => r.number === newBooking.roomNumber)
    if (!room) return

    const checkIn = new Date(newBooking.checkInDate)
    const checkOut = new Date(newBooking.checkOutDate)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const totalAmount = nights * room.price

    const booking: Booking = {
      id: (bookings.length + 1).toString(),
      ...newBooking,
      roomType: room.type,
      status: "confirmed",
      totalAmount,
      paidAmount: 0,
      bookingDate: new Date().toISOString().split("T")[0],
    }

    setBookings([booking, ...bookings])
    setIsAddDialogOpen(false)
    setNewBooking({
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      roomNumber: "",
      checkInDate: "",
      checkOutDate: "",
      guests: 1,
      specialRequests: "",
    })
  }

  const getStatusColor = (status: Booking["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-700"
      case "checked-in":
        return "bg-green-100 text-green-700"
      case "checked-out":
        return "bg-gray-100 text-gray-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const availableRooms = MOCK_ROOMS.filter((room) => room.status === "available")

  return (
    <DashboardLayout activeTab="bookings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
            <p className="text-muted-foreground">Manage all hotel reservations</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
                <DialogDescription>Fill in the details to create a new reservation.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guestName">Guest Name</Label>
                    <Input
                      id="guestName"
                      placeholder="John Doe"
                      value={newBooking.guestName}
                      onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestEmail">Email</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="john@email.com"
                      value={newBooking.guestEmail}
                      onChange={(e) => setNewBooking({ ...newBooking, guestEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone">Phone</Label>
                    <Input
                      id="guestPhone"
                      placeholder="+1 (555) 123-4567"
                      value={newBooking.guestPhone}
                      onChange={(e) => setNewBooking({ ...newBooking, guestPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guests">Number of Guests</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      value={newBooking.guests}
                      onChange={(e) => setNewBooking({ ...newBooking, guests: Number.parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Select
                    value={newBooking.roomNumber}
                    onValueChange={(value) => setNewBooking({ ...newBooking, roomNumber: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.number}>
                          Room {room.number} - {room.type} (₦{room.price.toLocaleString()}/night)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn">Check-in Date</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={newBooking.checkInDate}
                      onChange={(e) => setNewBooking({ ...newBooking, checkInDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut">Check-out Date</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={newBooking.checkOutDate}
                      onChange={(e) => setNewBooking({ ...newBooking, checkOutDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requests">Special Requests</Label>
                  <Textarea
                    id="requests"
                    placeholder="Any special requirements..."
                    value={newBooking.specialRequests}
                    onChange={(e) => setNewBooking({ ...newBooking, specialRequests: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBooking} className="bg-blue-600 hover:bg-blue-700">
                  Create Booking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Tabs for All, Check-in, Check-out */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="rounded-full">
                {filteredBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="checkin" className="gap-2">
              Check-in
              <Badge variant="secondary" className="rounded-full">
                {checkInBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="checkout" className="gap-2">
              Check-out
              <Badge variant="secondary" className="rounded-full">
                {checkOutBookings.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{booking.guestName}</h3>
                            <Badge className={getStatusColor(booking.status)}>{booking.status.replace("-", " ")}</Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {booking.guestEmail}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              {booking.guestPhone}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">₦{booking.totalAmount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            Paid: ₦{booking.paidAmount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Room</div>
                            <div className="font-medium">
                              {booking.roomNumber} - {booking.roomType}
                            </div>
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
                            <Users className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Guests</div>
                            <div className="font-medium">{booking.guests}</div>
                          </div>
                        </div>
                      </div>

                      {booking.specialRequests && (
                        <div className="pt-4 border-t">
                          <div className="text-sm font-medium mb-1">Special Requests</div>
                          <div className="text-sm text-muted-foreground">{booking.specialRequests}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4 mt-6">
            {checkInBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No check-ins scheduled for today
                </CardContent>
              </Card>
            ) : (
              checkInBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{booking.guestName}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status.replace("-", " ")}
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {booking.guestEmail}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {booking.guestPhone}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{booking.totalAmount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              Paid: ₦{booking.paidAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Room</div>
                              <div className="font-medium">
                                {booking.roomNumber} - {booking.roomType}
                              </div>
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
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{booking.guests}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="checkout" className="space-y-4 mt-6">
            {checkOutBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No check-outs scheduled for today
                </CardContent>
              </Card>
            ) : (
              checkOutBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{booking.guestName}</h3>
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status.replace("-", " ")}
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {booking.guestEmail}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {booking.guestPhone}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{booking.totalAmount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              Paid: ₦{booking.paidAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Room</div>
                              <div className="font-medium">
                                {booking.roomNumber} - {booking.roomType}
                              </div>
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
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{booking.guests}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
