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
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Page content */}
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:space-x-8 xl:space-x-16">

          {/* Form Content */}
          <div className="mb-6 lg:mb-0 flex-1">
            <div className="mb-3">
              <div className="flex text-sm font-medium text-slate-400 space-x-2">
                <span className="text-indigo-500"><Link href="/dashboard">Dashboard</Link></span>
                <span>-&gt;</span>
                <span className="text-slate-500">Reservation</span>
              </div>
            </div>
            <header className="mb-6">
              <h1 className="text-2xl md:text-3xl text-slate-800 font-bold">New Reservation ✨</h1>
            </header>

            <form id="new-booking-form" onSubmit={handleSubmit}>
              <div className="bg-white p-5 shadow-lg rounded-sm border border-slate-200">
                {/* Guest Details */}
                <div className="space-y-4 mb-8">
                  <h2 className="text-xl text-slate-800 font-bold">1. Guest Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-sm font-medium mb-1">First Name <span className="text-rose-500">*</span></Label>
                      <input
                        id="first_name"
                        className="form-input w-full"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-sm font-medium mb-1">Last Name <span className="text-rose-500">*</span></Label>
                      <input
                        id="last_name"
                        className="form-input w-full"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium mb-1">Email <span className="text-rose-500">*</span></Label>
                      <input
                        id="email"
                        type="email"
                        className="form-input w-full"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium mb-1">Phone Number <span className="text-rose-500">*</span></Label>
                      <input
                        id="phone"
                        type="tel"
                        className="form-input w-full"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+234 123 456 7890"
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-6 border-t border-slate-200" />

                {/* Emergency Contact */}
                <div className="space-y-4 mb-8">
                  <h2 className="text-xl text-slate-800 font-bold">2. Emergency Contact</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emer_first_name" className="text-sm font-medium mb-1">First Name <span className="text-rose-500">*</span></Label>
                      <input
                        id="emer_first_name"
                        className="form-input w-full"
                        required
                        value={formData.emer_first_name}
                        onChange={(e) => setFormData({ ...formData, emer_first_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emer_last_name" className="text-sm font-medium mb-1">Last Name <span className="text-rose-500">*</span></Label>
                      <input
                        id="emer_last_name"
                        className="form-input w-full"
                        required
                        value={formData.emer_last_name}
                        onChange={(e) => setFormData({ ...formData, emer_last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emer_phone" className="text-sm font-medium mb-1">Phone <span className="text-rose-500">*</span></Label>
                    <input
                      id="emer_phone"
                      className="form-input w-full"
                      required
                      value={formData.emer_phone}
                      onChange={(e) => setFormData({ ...formData, emer_phone: e.target.value })}
                    />
                  </div>
                </div>

                <hr className="my-6 border-t border-slate-200" />

                {/* Booking Details */}
                <div className="space-y-4 mb-8">
                  <h2 className="text-xl text-slate-800 font-bold">3. Reservation Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="check_in_date" className="text-sm font-medium mb-1">Check-in <span className="text-rose-500">*</span></Label>
                      <input
                        id="check_in_date"
                        type="date"
                        className="form-input w-full"
                        required
                        value={formData.check_in_date}
                        onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check_out_date" className="text-sm font-medium mb-1">Check-out <span className="text-rose-500">*</span></Label>
                      <input
                        id="check_out_date"
                        type="date"
                        className="form-input w-full"
                        required
                        value={formData.check_out_date}
                        onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                        min={formData.check_in_date || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  {formData.check_in_date && formData.check_out_date && (
                    <div className="space-y-2">
                      <Label htmlFor="room_type_id" className="text-sm font-medium mb-1">Room Type <span className="text-rose-500">*</span></Label>
                      <Select
                        value={formData.room_type_id}
                        onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}
                        disabled={loadingRoomTypes}
                      >
                        <SelectTrigger className="form-input w-full">
                          <SelectValue
                            placeholder={loadingRoomTypes ? "Loading..." : "Select a room type"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {roomTypes.map((roomType) => (
                            <SelectItem key={roomType.id} value={roomType.id.toString()}>
                              {roomType.name} - ₦{roomType.price.toLocaleString()}/night ({roomType.available_rooms} available)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {roomTypes.length === 0 && !loadingRoomTypes && (
                        <p className="text-xs text-rose-500 mt-1">No rooms available for selected dates</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium mb-1">Adults</Label>
                      <input type="number" min="1" className="form-input w-full" value={formData.guests} onChange={(e) => setFormData({ ...formData, guests: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium mb-1">Children</Label>
                      <input type="number" min="0" className="form-input w-full" value={formData.children} onChange={(e) => setFormData({ ...formData, children: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium mb-1">Rooms</Label>
                      <input type="number" min="1" className="form-input w-full" value={formData.number_of_rooms} onChange={(e) => setFormData({ ...formData, number_of_rooms: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white p-5 shadow-lg rounded-sm border border-slate-200 lg:w-72 xl:w-80 sticky top-24">
              <div className="text-slate-800 font-semibold mb-2">Booking Summary</div>
              <ul className="mb-4">
                <li className="text-sm w-full flex justify-between py-3 border-b border-slate-200">
                  <div>Rooms <span>x {formData.number_of_rooms}</span></div>
                  <div className="font-medium text-slate-800">
                    {/* Calculate price if room selected */}
                    {formData.room_type_id
                      ? `₦${(roomTypes.find(r => r.id.toString() === formData.room_type_id)?.price || 0).toLocaleString()}`
                      : '-'}
                  </div>
                </li>
                <li className="text-sm w-full flex justify-between py-3 border-b border-slate-200">
                  <div>Duration</div>
                  <div className="font-medium text-slate-800">
                    {formData.check_in_date && formData.check_out_date
                      ? `${Math.max(1, Math.ceil((new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) / (1000 * 60 * 60 * 24)))} Nights`
                      : '-'}
                  </div>
                </li>
                <li className="text-sm w-full flex justify-between py-3 border-b border-slate-200">
                  <div>Taxes</div>
                  <div className="font-medium text-slate-800">-</div>
                </li>
                <li className="text-sm w-full flex justify-between py-3 border-b border-slate-200">
                  <div className="font-bold">Total Due</div>
                  <div className="font-bold text-emerald-600">
                    {formData.room_type_id && formData.check_in_date && formData.check_out_date
                      ? `₦${(
                        (roomTypes.find(r => r.id.toString() === formData.room_type_id)?.price || 0) *
                        Number(formData.number_of_rooms) *
                        Math.max(1, Math.ceil((new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) / (1000 * 60 * 60 * 24)))
                      ).toLocaleString()}`
                      : '-'}
                  </div>
                </li>
              </ul>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium mb-1" htmlFor="promo">Payment Method</label>
                </div>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger className="form-input w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">POS</SelectItem>
                    <SelectItem value="3">Cash</SelectItem>
                    <SelectItem value="4">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Button
                  onClick={(e) => {
                    // Trigger form submission manually since button is outside form
                    const form = document.getElementById('new-booking-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  disabled={isLoading}
                  className="w-full shadow-none"
                >
                  {isLoading ? <LoadingSpinner size={20} className="text-white" /> : "Complete Reservation"}
                </Button>
              </div>
              <div className="text-xs text-slate-500 text-center italic">
                Secure booking processing
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
