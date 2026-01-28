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
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/material_blue.css"

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
  const { businessId, logout } = useAuth()
  // ... (rest of component until the date inputs)

  // ... inside the JSX where inputs are:

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
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === 'expiration' || errorData.message === 'Signature has expired') {
            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Please login again.",
            })
            logout()
            return
          }
        }
        const errorData = await response.json().catch(() => ({}))
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
        const bookingId =
          data.reservations?.[0]?.booking_id ||
          data.data?.booking_id ||
          data.booking_id ||
          data.reservation?.booking_id ||
          data.data?.reservation?.booking_id

        if (bookingId) {
          router.push(`/dashboard/bookings/success?booking_id=${bookingId}`)
        } else {
          // Fallback if ID can't be found, just go to list but show success
          router.push("/dashboard/bookings")
        }
      } else {
        if (response.status === 401) {
          if (data.errors?.[0]?.id === 'expiration' || data.message === 'Signature has expired') {
            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Please login again.",
            })
            logout()
            return
          }
        }
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
      {/* Custom Styles for Flatpickr Theme Override */}
      <style jsx global>{`
        .flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange, .flatpickr-day.selected.inRange, .flatpickr-day.startRange.inRange, .flatpickr-day.endRange.inRange, .flatpickr-day.selected:focus, .flatpickr-day.startRange:focus, .flatpickr-day.endRange:focus, .flatpickr-day.selected:hover, .flatpickr-day.startRange:hover, .flatpickr-day.endRange:hover, .flatpickr-day.selected.prevMonthDay, .flatpickr-day.startRange.prevMonthDay, .flatpickr-day.endRange.prevMonthDay, .flatpickr-day.selected.nextMonthDay, .flatpickr-day.startRange.nextMonthDay, .flatpickr-day.endRange.nextMonthDay {
          background: #4f46e5 !important;
          border-color: #4f46e5 !important;
        }
        .flatpickr-day.today {
          border-color: #4f46e5 !important;
        }
        .flatpickr-day.today:hover {
          background: #e0e7ff !important;
          color: #312e81 !important;
        }
        .flatpickr-months .flatpickr-month {
            background: #4f46e5 !important;
            color: #fff !important;
            fill: #fff !important;
        }
        .flatpickr-current-month .flatpickr-monthDropdown-months .flatpickr-monthDropdown-month {
            background-color: #4f46e5 !important;
        }
        .flatpickr-weekdays {
            background: #4f46e5 !important;
        }
        span.flatpickr-weekday {
          background: #4f46e5 !important;
          color: #fff !important;
        }
      `}</style>

      {/* Hero Section - Compact */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 pb-24 rounded-b-3xl">
        <div className="absolute inset-x-0 bottom-0 h-full bg-grid-white/[0.1] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard" className="inline-flex items-center text-indigo-100 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            New Reservation
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Main Form Area */}
          <div className="flex-1">
            <form id="new-booking-form" onSubmit={handleSubmit}>
              <Card className="border-0 shadow-xl rounded-xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        Guest Info
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* Primary Guest */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name <span className="text-rose-500">*</span></Label>
                      <Input
                        id="first_name"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="John"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name <span className="text-rose-500">*</span></Label>
                      <Input
                        id="last_name"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Doe"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-rose-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone <span className="text-rose-500">*</span></Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+234..."
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Divider with Label */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-100" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-medium">Emergency Contact</span>
                    </div>
                  </div>

                  {/* Emergency Contact - Compact Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emer_first_name">First Name <span className="text-rose-500">*</span></Label>
                      <Input
                        id="emer_first_name"
                        required
                        value={formData.emer_first_name}
                        onChange={(e) => setFormData({ ...formData, emer_first_name: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emer_last_name">Last Name <span className="text-rose-500">*</span></Label>
                      <Input
                        id="emer_last_name"
                        required
                        value={formData.emer_last_name}
                        onChange={(e) => setFormData({ ...formData, emer_last_name: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emer_phone">Phone <span className="text-rose-500">*</span></Label>
                      <Input
                        id="emer_phone"
                        required
                        value={formData.emer_phone}
                        onChange={(e) => setFormData({ ...formData, emer_phone: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardHeader className="bg-slate-50/50 border-t border-b border-slate-100 py-3 px-5">
                  <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Stay Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Dates - 5 cols */}
                    <div className="md:col-span-5 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="check_in_date">Check-in <span className="text-rose-500">*</span></Label>
                        <Flatpickr
                          id="check_in_date"
                          value={formData.check_in_date}
                          onChange={([date]) => {
                            if (date) {
                              const offset = date.getTimezoneOffset();
                              const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
                              setFormData({ ...formData, check_in_date: adjustedDate.toISOString().split('T')[0] });
                            }
                          }}
                          options={{
                            minDate: "today",
                            dateFormat: "Y-m-d",
                            disableMobile: true
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Select date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="check_out_date">Check-out <span className="text-rose-500">*</span></Label>
                        <Flatpickr
                          id="check_out_date"
                          value={formData.check_out_date}
                          onChange={([date]) => {
                            if (date) {
                              const offset = date.getTimezoneOffset();
                              const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
                              setFormData({ ...formData, check_out_date: adjustedDate.toISOString().split('T')[0] });
                            }
                          }}
                          options={{
                            minDate: formData.check_in_date || "today",
                            dateFormat: "Y-m-d",
                            disableMobile: true
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Select date"
                        />
                      </div>
                    </div>

                    {/* Room Selection - 7 cols */}
                    {formData.check_in_date && formData.check_out_date && (
                      <div className="md:col-span-7 space-y-2">
                        <Label htmlFor="room_type_id">Room Type <span className="text-rose-500">*</span></Label>
                        <Select
                          value={formData.room_type_id}
                          onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}
                          disabled={loadingRoomTypes}
                        >
                          <SelectTrigger className="w-full bg-white h-10 border-indigo-200 focus:ring-indigo-500">
                            <SelectValue
                              placeholder={loadingRoomTypes ? "Loading..." : "Select Room..."}
                            />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {roomTypes.map((roomType) => (
                              <SelectItem key={roomType.id} value={roomType.id.toString()}>
                                <span className="font-medium mr-2">{roomType.name}</span>
                                <span className="text-slate-500 text-xs">
                                  (₦{roomType.price.toLocaleString()}) • {roomType.available_rooms} left
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {roomTypes.length === 0 && !loadingRoomTypes && (
                          <p className="text-sm text-rose-600 font-medium">
                            ⚠️ No rooms available
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Adults</Label>
                      <Input type="number" min="1" className="h-10" value={formData.guests} onChange={(e) => setFormData({ ...formData, guests: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Children</Label>
                      <Input type="number" min="0" className="h-10" value={formData.children} onChange={(e) => setFormData({ ...formData, children: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rooms</Label>
                      <Input type="number" min="1" className="h-10" value={formData.number_of_rooms} onChange={(e) => setFormData({ ...formData, number_of_rooms: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>


          {/* Sidebar Summary */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <Card className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-white/80" />
                    Booking Summary
                  </h3>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Rooms ({formData.number_of_rooms})</span>
                      <span className="font-medium">
                        {formData.room_type_id
                          ? `₦${(roomTypes.find(r => r.id.toString() === formData.room_type_id)?.price || 0).toLocaleString()}`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-medium">
                        {formData.check_in_date && formData.check_out_date
                          ? `${Math.max(1, Math.ceil((new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) / (1000 * 60 * 60 * 24)))} Nights`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Taxes & Fees</span>
                      <span className="font-medium">₦0.00</span>
                    </div>

                    <div className="pt-4 border-t border-dashed border-slate-200 mt-4">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-900">Total Due</span>
                        <span className="font-bold text-2xl text-indigo-600">
                          {formData.room_type_id && formData.check_in_date && formData.check_out_date
                            ? `₦${(
                              (roomTypes.find(r => r.id.toString() === formData.room_type_id)?.price || 0) *
                              Number(formData.number_of_rooms) *
                              Math.max(1, Math.ceil((new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) / (1000 * 60 * 60 * 24)))
                            ).toLocaleString()}`
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">POS Terminal</SelectItem>
                        <SelectItem value="3">Cash Payment</SelectItem>
                        <SelectItem value="4">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={(e) => {
                      const form = document.getElementById('new-booking-form') as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }}
                    disabled={isLoading}
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {isLoading ? <LoadingSpinner size={20} className="text-white" /> : "Confirm Reservation"}
                  </Button>

                  <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Secure Transaction
                  </p>
                </div>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
