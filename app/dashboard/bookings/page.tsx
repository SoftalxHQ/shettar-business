"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Calendar, Users, DollarSign, Phone, Mail } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

interface Reservation {
  id: number
  booking_id: string
  other_first_name: string
  other_last_name: string
  other_phone_number: string
  other_email_address: string
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
}

export default function BookingsPage() {
  const { businessId } = useAuth()
  const searchParams = useSearchParams()
  const filterParam = searchParams?.get("filter") || "all"

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")


  // Fetch reservations on mount
  useEffect(() => {
    const fetchReservations = async () => {
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
          setReservations(data)
        } else {
          console.error("Failed to fetch reservations")
        }
      } catch (error) {
        console.error("Error fetching reservations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [businessId])

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
  }

  return (
    <DashboardLayout activeTab="bookings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
            <p className="text-muted-foreground">Manage all hotel reservations</p>
          </div>
          <Link href="/dashboard/bookings/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </Link>
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

          {/* All Reservations */}
          <TabsContent value="all" className="space-y-4 mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  <p className="text-muted-foreground mt-4">Loading reservations...</p>
                </CardContent>
              </Card>
            ) : filteredReservations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No reservations found
                </CardContent>
              </Card>
            ) : (
              filteredReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {reservation.other_first_name} {reservation.other_last_name}
                              </h3>
                              <Badge className={getStatusColor(getReservationStatus(reservation))}>
                                {getReservationStatus(reservation)}
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {reservation.other_email_address}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {reservation.other_phone_number}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Booking ID: {reservation.booking_id}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{reservation.total_amount?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {paymentMethodLabels[reservation.payment_method]}
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
                                {reservation.room_number} - {reservation.room_type_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">
                                {new Date(reservation.start_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">
                                {new Date(reservation.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{reservation.guests}</div>
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

          {/* Active Reservations */}
          <TabsContent value="active" className="space-y-4 mt-6">
            {activeReservations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No active reservations
                </CardContent>
              </Card>
            ) : (
              activeReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {reservation.other_first_name} {reservation.other_last_name}
                              </h3>
                              <Badge className={getStatusColor("active")}>active</Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {reservation.other_email_address}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {reservation.other_phone_number}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{reservation.total_amount?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {paymentMethodLabels[reservation.payment_method]}
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
                                {reservation.room_number} - {reservation.room_type_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">
                                {new Date(reservation.start_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">
                                {new Date(reservation.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{reservation.guests}</div>
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

          {/* Upcoming Reservations */}
          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingReservations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No upcoming reservations
                </CardContent>
              </Card>
            ) : (
              upcomingReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {reservation.other_first_name} {reservation.other_last_name}
                              </h3>
                              <Badge className={getStatusColor("upcoming")}>upcoming</Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {reservation.other_email_address}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {reservation.other_phone_number}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{reservation.total_amount?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {paymentMethodLabels[reservation.payment_method]}
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
                                {reservation.room_number} - {reservation.room_type_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">
                                {new Date(reservation.start_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">
                                {new Date(reservation.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{reservation.guests}</div>
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

          {/* Past Reservations */}
          <TabsContent value="past" className="space-y-4 mt-6">
            {pastReservations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No past reservations
                </CardContent>
              </Card>
            ) : (
              pastReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {reservation.other_first_name} {reservation.other_last_name}
                              </h3>
                              <Badge className={getStatusColor("past")}>past</Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {reservation.other_email_address}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {reservation.other_phone_number}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{reservation.total_amount?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {paymentMethodLabels[reservation.payment_method]}
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
                                {reservation.room_number} - {reservation.room_type_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">
                                {new Date(reservation.start_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">
                                {new Date(reservation.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{reservation.guests}</div>
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

          {/* Cancelled Reservations */}
          <TabsContent value="cancelled" className="space-y-4 mt-6">
            {cancelledReservations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No cancelled reservations
                </CardContent>
              </Card>
            ) : (
              cancelledReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {reservation.other_first_name} {reservation.other_last_name}
                              </h3>
                              <Badge className={getStatusColor("cancelled")}>cancelled</Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {reservation.other_email_address}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                {reservation.other_phone_number}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₦{reservation.total_amount?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {paymentMethodLabels[reservation.payment_method]}
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
                                {reservation.room_number} - {reservation.room_type_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-in</div>
                              <div className="font-medium">
                                {new Date(reservation.start_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Check-out</div>
                              <div className="font-medium">
                                {new Date(reservation.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Guests</div>
                              <div className="font-medium">{reservation.guests}</div>
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
