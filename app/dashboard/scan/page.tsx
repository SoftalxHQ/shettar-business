"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { QrCode, Check, X, Printer, ArrowLeft } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { isTauri, nativeScan } from "@/lib/tauri"
import { reservationGuestName } from "@/lib/reservation-guest"
import {
  BookingReceiptBusiness,
  PAYMENT_METHOD_LABELS,
  buildBookingReceiptHtml,
  printBookingReceipt,
} from "@/lib/booking-receipt"

interface Reservation {
  id: number
  booking_id: string
  client_name?: string
  first_name?: string
  last_name?: string
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
  qr_code_url?: string
  checked_in_at?: string
  checked_out_at?: string
  checked_in_by_name?: string
  checked_out_by_name?: string
}

import { useSearchParams } from "next/navigation"

import { Suspense } from "react"

function ScanContent() {
  const { user, businessId, businessName, logout } = useAuth()
  const searchParams = useSearchParams()
  const [code, setCode] = useState((searchParams.get("code") || "").toUpperCase())
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [businessDetails, setBusinessDetails] = useState<BookingReceiptBusiness | null>(null)
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [checkoutNotes, setCheckoutNotes] = useState("")
  const autoVerifiedCode = useRef<string | null>(null)

  const codeFromUrl = searchParams.get("code")

  // Fetch business details
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

  const verifyBooking = async (bookingCode: string, options?: { showSuccessToast?: boolean }) => {
    if (!businessId || !bookingCode.trim()) return
    const showSuccessToast = options?.showSuccessToast ?? true

    try {
      setIsLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reservations/${bookingCode.trim()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (response.ok && data.status?.code === 200) {
        setResult("success")
        setReservation(data.data)
        if (showSuccessToast) {
          toast.success("Booking found successfully!")
        }
      } else {
        if (response.status === 401) {
          if (
            data.errors?.[0]?.id === 'expiration' ||
            data.errors?.[0]?.message === 'Token has expired' ||
            data.message === 'Signature has expired' ||
            data.status?.message === 'Signature has expired'
          ) {
            logout(true)
            return
          }
        }
        setResult("error")
        setReservation(null)
        toast.error(data.status?.message || "Booking not found")
      }
    } catch (error) {
      console.error("Failed to fetch booking:", error)
      setResult("error")
      setReservation(null)
      toast.error("Failed to verify booking code")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-verify once when opened with ?code= (e.g. from dashboard search)
  useEffect(() => {
    if (!codeFromUrl || !businessId) return
    if (autoVerifiedCode.current === codeFromUrl) return
    autoVerifiedCode.current = codeFromUrl
    void verifyBooking(codeFromUrl, { showSuccessToast: true })
  }, [businessId, codeFromUrl])

  const handleScan = () => {
    if (!businessId) {
      toast.error("Business information not found. Please try logging in again.")
      return
    }

    if (!code.trim()) {
      toast.error("Please enter a booking code")
      return
    }

    verifyBooking(code, { showSuccessToast: true })
  }

  const handleNativeScan = async () => {
    const scannnedCode = await nativeScan();
    if (scannnedCode) {
      setCode(scannnedCode);
      verifyBooking(scannnedCode, { showSuccessToast: true });
    }
  }

  const handleReset = () => {
    autoVerifiedCode.current = null
    setCode("")
    setResult(null)
    setReservation(null)
  }

  const handleCheckIn = async () => {
    if (!reservation || !businessId) return

    try {
      setIsLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reservations/${reservation.booking_id}/check_in`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (response.ok && data.status?.code === 200) {
        setReservation(data.data) // Update with new data including check-in timestamp
        toast.success(data.status.message || "Guest checked in successfully!")
      } else {
        toast.error(data.status?.message || "Failed to check in guest")
      }
    } catch (error) {
      console.error("Failed to check in:", error)
      toast.error("An unexpected error occurred during check-in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!reservation || !businessId) return

    try {
      setIsLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reservations/${reservation.booking_id}/check_out`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: checkoutNotes.trim() || undefined }),
        }
      )

      const data = await response.json()

      if (response.ok && data.status?.code === 200) {
        setReservation(data.data)
        setCheckoutDialogOpen(false)
        setCheckoutNotes("")
        toast.success(data.status.message || "Guest checked out successfully!")
      } else {
        toast.error(data.status?.message || data.error || "Failed to check out guest")
      }
    } catch (error) {
      console.error("Failed to check out:", error)
      toast.error("An unexpected error occurred during check-out")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!reservation) return

    const receiptHtml = buildBookingReceiptHtml({
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
      detailed: true,
      footerMessage: "Thank you for your stay!",
    })

    printBookingReceipt(receiptHtml)
  }

  const isWithinReservationWindow = () => {
    if (!reservation) return false

    const now = new Date()
    const startDate = new Date(reservation.start_date)
    const endDate = new Date(reservation.end_date)

    // Check-in is only allowed during the reservation window
    return now >= startDate && now <= endDate
  }

  const getStatusBadge = () => {
    if (!reservation) return null

    if (reservation.cancelled) return <Badge variant="destructive">Cancelled</Badge>
    if (reservation.checked_out_at) return <Badge variant="secondary">Past</Badge>

    const now = new Date()
    const startDate = new Date(reservation.start_date)
    const endDate = new Date(reservation.end_date)

    if (reservation.status === "past" || now > endDate) return <Badge variant="secondary">Past</Badge>
    if (reservation.status === "active" || (now >= startDate && now <= endDate)) {
      return <Badge className="bg-green-600">Active</Badge>
    }
    if (reservation.status === "upcoming" || now < startDate) return <Badge className="bg-blue-600">Upcoming</Badge>
    return <Badge variant="secondary">Past</Badge>
  }

  return (
    <DashboardLayout activeTab="scancode">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 pb-20 rounded-b-3xl">
        <div className="absolute inset-x-0 bottom-0 h-full bg-grid-white/[0.1] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 text-center">
          <Link href="/dashboard" className="inline-flex items-center text-indigo-100 hover:text-white mb-6 transition-colors bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
            <ArrowLeft className="w-3 h-3 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Scan Booking Code
          </h1>
          <p className="text-indigo-100 text-base max-w-xl mx-auto">
            Scan the guest's QR code or enter the booking ID manually to verify and manage the check-in process.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 pb-12">
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          {!result && (
            <CardHeader className="text-center pt-6 pb-2">
              <CardTitle className="text-xl font-bold text-slate-900">Verify Reservation</CardTitle>
              <CardDescription className="text-sm">
                Use your scanner or type the code below
              </CardDescription>
            </CardHeader>
          )}

          <CardContent className="p-6 space-y-6">
            {/* Initial State: Scanner & Input */}
            {result === null && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Visual Scanner Area */}
                <div
                  className="relative group cursor-pointer"
                  onClick={isTauri() ? handleNativeScan : undefined}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="relative bg-slate-50 border-2 border-dashed border-indigo-200 rounded-xl p-6 flex flex-col items-center justify-center text-indigo-400 group-hover:border-indigo-400 group-hover:text-indigo-600 transition-all">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="font-medium text-sm">
                      {isTauri() ? "Tap to Scan QR Code" : "Ready to Scan"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isTauri() ? "Use device camera" : "Point scanner at QR code"}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 text-slate-500 font-medium">Or enter manually</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="sr-only">Booking Code</Label>
                    <Input
                      id="code"
                      placeholder="e.g., SSH-123-ABC-456"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && !isLoading && handleScan()}
                      className="text-center text-base h-11 font-mono uppercase tracking-wider border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    onClick={handleScan}
                    disabled={!code || isLoading}
                    className="w-full h-11 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md"
                    size="lg"
                  >
                    {isLoading ? <LoadingSpinner size={18} className="text-white" /> : "Verify Booking Code"}
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR State */}
            {result === "error" && (
              <div className="text-center py-8 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <X className="w-10 h-10 text-rose-600" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Booking Not Found</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  We couldn't locate a reservation with the code <span className="font-mono font-bold text-slate-900">{code}</span>. Please check the code and try again.
                </p>
                <Button onClick={handleReset} variant="outline" size="lg" className="h-12 px-8 min-w-[200px]">
                  Try Again
                </Button>
              </div>
            )}

            {/* SUCCESS State */}
            {result === "success" && reservation && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Success Header */}
                <div className="text-center pb-6 border-b border-slate-100">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Verified Reservation</h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {getStatusBadge()}
                    <span className="text-sm text-slate-500 font-mono">{reservation.booking_id}</span>
                  </div>
                </div>

                {/* Guest & Room Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      Guest Information
                      <span className="h-px bg-slate-200 flex-1"></span>
                    </h3>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold">{reservationGuestName(reservation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-medium">{reservation.other_phone_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-xs truncate max-w-[150px]">{reservation.other_email_address}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      Stay Details
                      <span className="h-px bg-slate-200 flex-1"></span>
                    </h3>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Room Type</span>
                        <span className="font-semibold">{reservation.room_type_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Room No.</span>
                        <span className="font-semibold">{reservation.room_number || "Not Assigned"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Duration</span>
                        <span className="font-medium text-xs">
                          {new Date(reservation.start_date).toLocaleDateString()} - {new Date(reservation.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="text-center md:text-left">
                      <p className="font-semibold text-indigo-900 text-sm">Action Required</p>
                      <p className="text-xs text-indigo-600">
                        {!reservation.checked_in_at ? "Guest is ready for check-in" : !reservation.checked_out_at ? "Guest is checked in" : "Stay completed"}
                      </p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {!reservation.checked_in_at ? (
                        <Button
                          onClick={handleCheckIn}
                          disabled={isLoading || !isWithinReservationWindow()}
                          className="flex-1 md:flex-none h-10 bg-indigo-600 hover:bg-indigo-700 text-sm"
                        >
                          {isLoading ? <LoadingSpinner className="text-white" /> : "Check In Guest"}
                        </Button>
                      ) : !reservation.checked_out_at ? (
                        <Button
                          onClick={() => setCheckoutDialogOpen(true)}
                          disabled={isLoading}
                          className="flex-1 md:flex-none h-10 bg-rose-600 hover:bg-rose-700 text-sm"
                        >
                          Check Out Guest
                        </Button>
                      ) : (
                        <Button disabled variant="outline" className="flex-1 md:flex-none h-10 text-sm">Completed</Button>
                      )}

                      <Button onClick={handlePrintReceipt} variant="outline" className="h-10 bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Button onClick={handleReset} variant="ghost" className="text-slate-500 hover:text-slate-800">
                    Scan Another Code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        title="Check out guest"
        description={`Check out ${reservationGuestName(reservation)} from room ${reservation?.room_number}?`}
        confirmText="Confirm check-out"
        isDestructive
        loading={isLoading}
        onConfirm={handleCheckOut}
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="checkout-notes">Checkout notes</Label>
          <Textarea
            id="checkout-notes"
            value={checkoutNotes}
            onChange={(e) => setCheckoutNotes(e.target.value)}
            placeholder="Room condition, minibar, damages, etc."
            rows={4}
          />
        </div>
      </ConfirmDialog>
    </DashboardLayout>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={32} /></div>}>
      <ScanContent />
    </Suspense>
  )
}
