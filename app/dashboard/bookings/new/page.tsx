"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Users, UserPlus, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface RoomType {
  id: number
  name: string
  price: number
  available_rooms: number
  total_rooms: number
  is_available: boolean
}

export default function NewBookingPage() {
  const router = useRouter()
  const { businessId } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    emer_first_name: "",
    emer_last_name: "",
    emer_phone: "",
    room_type_id: "",
    check_in_date: "",
    check_out_date: "",
    guests: "1",
    children: "0",
    number_of_rooms: "1",
    payment_method: "2", // POS
  })

  // Fetch available room types when dates change
  useEffect(() => {
    if (businessId && formData.check_in_date && formData.check_out_date) {
      // Validate that check-out date is after check-in date
      const checkIn = new Date(formData.check_in_date)
      const checkOut = new Date(formData.check_out_date)

      if (checkOut > checkIn) {
        fetchAvailableRoomTypes()
      } else {
        // Clear room types if dates are invalid
        setRoomTypes([])
      }
    }
  }, [businessId, formData.check_in_date, formData.check_out_date])

  const fetchAvailableRoomTypes = async () => {
    try {
      setLoadingRoomTypes(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/available_room_types?start_date=${formData.check_in_date}&end_date=${formData.check_out_date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setRoomTypes(data.room_types || [])
      } else {
        const errorData = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.errors || "Failed to fetch available room types",
        })
      }
    } catch (error) {
      console.error("Failed to fetch room types:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load available rooms",
      })
    } finally {
      setLoadingRoomTypes(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Business information not found. Please try logging in again.",
      })
      return
    }

    if (!formData.room_type_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a room type",
      })
      return
    }

    try {
      setIsLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const reservationData = {
        reservation: {
          other_first_name: formData.first_name,
          other_last_name: formData.last_name,
          other_email_address: formData.email,
          other_phone_number: formData.phone,
          emer_first_name: formData.emer_first_name,
          emer_last_name: formData.emer_last_name,
          emer_phone_number: formData.emer_phone,
          start_date: formData.check_in_date,
          end_date: formData.check_out_date,
          guests: formData.guests,
          children: formData.children,
          number_of_room: formData.number_of_rooms,
          payment_method: formData.payment_method,
        },
      }

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${formData.room_type_id}/reservations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reservationData),
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "Booking created successfully",
        })
        router.push("/dashboard/bookings")
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.errors || data.error?.message || "Failed to create booking",
        })
      }
    } catch (error) {
      console.error("Failed to create booking:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show error if no business is selected
  if (!businessId) {
    return (
      <DashboardLayout activeTab="bookings">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Business information not found. Please try logging in again.</p>
              <Link href="/dashboard/bookings">
                <Button className="mt-4" variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Bookings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="bookings">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Walk-in Booking</h1>
            <p className="text-muted-foreground">Create a new reservation for a walk-in guest</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Guest Information
              </CardTitle>
              <CardDescription>Primary guest contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+234 123 456 7890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Contact person in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emer_first_name">First Name *</Label>
                  <Input
                    id="emer_first_name"
                    required
                    value={formData.emer_first_name}
                    onChange={(e) => setFormData({ ...formData, emer_first_name: e.target.value })}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emer_last_name">Last Name *</Label>
                  <Input
                    id="emer_last_name"
                    required
                    value={formData.emer_last_name}
                    onChange={(e) => setFormData({ ...formData, emer_last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emer_phone">Emergency Contact Phone *</Label>
                <Input
                  id="emer_phone"
                  type="tel"
                  required
                  value={formData.emer_phone}
                  onChange={(e) => setFormData({ ...formData, emer_phone: e.target.value })}
                  placeholder="+234 123 456 7890"
                />
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Details
              </CardTitle>
              <CardDescription>Reservation dates and room selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="check_in_date">Check-in Date *</Label>
                  <Input
                    id="check_in_date"
                    type="date"
                    required
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check_out_date">Check-out Date *</Label>
                  <Input
                    id="check_out_date"
                    type="date"
                    required
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    min={formData.check_in_date || new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              {formData.check_in_date && formData.check_out_date && (
                <div className="space-y-2">
                  <Label htmlFor="room_type_id">Room Type *</Label>
                  <Select
                    value={formData.room_type_id}
                    onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}
                    disabled={loadingRoomTypes}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingRoomTypes ? "Loading..." : "Select a room type"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((roomType) => (
                        <SelectItem key={roomType.id} value={roomType.id.toString()}>
                          {roomType.name} - ₦{roomType.price.toLocaleString()}/night ({roomType.available_rooms}{" "}
                          available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roomTypes.length === 0 && !loadingRoomTypes && (
                    <p className="text-sm text-red-500">No rooms available for selected dates</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guests">Adults *</Label>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    required
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_rooms">Number of Rooms *</Label>
                  <Input
                    id="number_of_rooms"
                    type="number"
                    min="1"
                    required
                    value={formData.number_of_rooms}
                    onChange={(e) => setFormData({ ...formData, number_of_rooms: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Information
              </CardTitle>
              <CardDescription>Select payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">POS</SelectItem>
                    <SelectItem value="3">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/bookings">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
