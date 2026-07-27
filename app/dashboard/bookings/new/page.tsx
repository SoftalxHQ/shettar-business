"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, UserPlus, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Flatpickr from "react-flatpickr"
import "flatpickr/dist/themes/light.css"

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

  const nights =
    formData.check_in_date && formData.check_out_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(formData.check_out_date).getTime() -
              new Date(formData.check_in_date).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0

  const selectedRoom = roomTypes.find((r) => r.id.toString() === formData.room_type_id)
  const roomPrice = selectedRoom?.price || 0
  const totalDue =
    selectedRoom && nights > 0
      ? roomPrice * Number(formData.number_of_rooms) * nights
      : null

  // Show error if no business is selected
  if (!businessId) {
    return (
      <DashboardLayout activeTab="bookings">
        <div className="h-full flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm max-w-md">
            <p className="text-sm text-muted-foreground">
              Business information not found. Please try logging in again.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="bookings">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        {/* Compact page header */}
        <div className="shrink-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Dashboard
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            New Reservation
          </h1>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
          {/* Main form — scrolls if needed */}
          <form
            id="new-booking-form"
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur z-10">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Guest details</h2>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-xs">
                    First name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-xs">
                    Last name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Doe"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">
                    Phone <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+234..."
                    className="h-9"
                  />
                </div>
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
                  <span className="bg-white px-2 text-slate-400 font-medium">Emergency contact</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emer_first_name" className="text-xs">
                    First name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emer_first_name"
                    required
                    value={formData.emer_first_name}
                    onChange={(e) => setFormData({ ...formData, emer_first_name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emer_last_name" className="text-xs">
                    Last name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emer_last_name"
                    required
                    value={formData.emer_last_name}
                    onChange={(e) => setFormData({ ...formData, emer_last_name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emer_phone" className="text-xs">
                    Phone <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emer_phone"
                    required
                    value={formData.emer_phone}
                    onChange={(e) => setFormData({ ...formData, emer_phone: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-y border-slate-100 flex items-center gap-2 bg-slate-50/60">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Stay details</h2>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="check_in_date" className="text-xs">
                    Check-in <span className="text-rose-500">*</span>
                  </Label>
                  <Flatpickr
                    id="check_in_date"
                    value={formData.check_in_date}
                    onChange={([date]) => {
                      if (date) {
                        const offset = date.getTimezoneOffset()
                        const adjustedDate = new Date(date.getTime() - offset * 60 * 1000)
                        setFormData({
                          ...formData,
                          check_in_date: adjustedDate.toISOString().split("T")[0],
                        })
                      }
                    }}
                    options={{
                      minDate: "today",
                      dateFormat: "Y-m-d",
                      disableMobile: true,
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Select date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="check_out_date" className="text-xs">
                    Check-out <span className="text-rose-500">*</span>
                  </Label>
                  <Flatpickr
                    id="check_out_date"
                    value={formData.check_out_date}
                    onChange={([date]) => {
                      if (date) {
                        const offset = date.getTimezoneOffset()
                        const adjustedDate = new Date(date.getTime() - offset * 60 * 1000)
                        setFormData({
                          ...formData,
                          check_out_date: adjustedDate.toISOString().split("T")[0],
                        })
                      }
                    }}
                    options={{
                      minDate: formData.check_in_date || "today",
                      dateFormat: "Y-m-d",
                      disableMobile: true,
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Select date"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="room_type_id" className="text-xs">
                    Room type <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.room_type_id}
                    onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}
                    disabled={
                      loadingRoomTypes ||
                      !formData.check_in_date ||
                      !formData.check_out_date
                    }
                  >
                    <SelectTrigger className="w-full bg-white h-9">
                      <SelectValue
                        placeholder={
                          !formData.check_in_date || !formData.check_out_date
                            ? "Select dates first"
                            : loadingRoomTypes
                              ? "Loading…"
                              : "Select room type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((roomType) => (
                        <SelectItem key={roomType.id} value={roomType.id.toString()}>
                          <span className="font-medium mr-2">{roomType.name}</span>
                          <span className="text-slate-500 text-xs">
                            ₦{roomType.price.toLocaleString()} · {roomType.available_rooms} left
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.check_in_date &&
                    formData.check_out_date &&
                    roomTypes.length === 0 &&
                    !loadingRoomTypes && (
                      <p className="text-xs text-rose-600 font-medium">No rooms available for these dates</p>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Adults</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-9"
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Children</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-9"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rooms</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-9"
                    value={formData.number_of_rooms}
                    onChange={(e) => setFormData({ ...formData, number_of_rooms: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Summary sidebar */}
          <aside className="lg:w-72 xl:w-80 shrink-0 flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
            </div>

            <div className="flex-1 p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Room</span>
                <span className="font-medium text-right text-slate-900 truncate">
                  {selectedRoom?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Rate</span>
                <span className="font-medium tabular-nums">
                  {selectedRoom ? `₦${roomPrice.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Rooms × nights</span>
                <span className="font-medium tabular-nums">
                  {selectedRoom && nights > 0
                    ? `${formData.number_of_rooms} × ${nights}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Guests</span>
                <span className="font-medium tabular-nums">
                  {formData.guests} adult{formData.guests === "1" ? "" : "s"}
                  {Number(formData.children) > 0 ? `, ${formData.children} child` : ""}
                </span>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-end gap-3">
                  <span className="text-sm font-semibold text-slate-900">Total due</span>
                  <span className="text-2xl font-semibold tabular-nums text-indigo-600 leading-none">
                    {totalDue != null ? `₦${totalDue.toLocaleString()}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger className="w-full bg-white h-9">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">POS Terminal</SelectItem>
                    <SelectItem value="3">Cash Payment</SelectItem>
                    <SelectItem value="4">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
                onClick={() => {
                  const form = document.getElementById("new-booking-form") as HTMLFormElement | null
                  form?.requestSubmit()
                }}
              >
                {isLoading ? (
                  <LoadingSpinner size={18} className="text-white" />
                ) : (
                  "Confirm Reservation"
                )}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}
