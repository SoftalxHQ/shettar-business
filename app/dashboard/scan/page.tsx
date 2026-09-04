"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { QrCode, Check, X, Printer, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { toast } from "sonner"
import { isTauri, nativeScan } from "@/lib/tauri"
import {
  reservationGuestEmail,
  reservationGuestName,
  reservationGuestPhone,
} from "@/lib/reservation-guest"
import {
  BookingReceiptBusiness,
  PAYMENT_METHOD_LABELS,
  printBookingReceiptSmart,
} from "@/lib/booking-receipt"

interface Reservation {
  id: number
  booking_id: string
  client_name?: string
  client_email?: string
  client_phone?: string
  first_name?: string
  last_name?: string
  other_first_name: string
  other_last_name: string
  other_phone_number: string
  other_email_address: string
  phone_number?: string
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
  status?: string
}

function ScanContent() {
  const { businessId, businessName, logout } = useAuth()
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

    void fetchBusinessDetails()
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
            data.errors?.[0]?.id === "expiration" ||
            data.errors?.[0]?.message === "Token has expired" ||
            data.message === "Signature has expired" ||
            data.status?.message === "Signature has expired"
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

    void verifyBooking(code, { showSuccessToast: true })
  }

  const handleNativeScan = async () => {
    const scannnedCode = await nativeScan()
    if (scannnedCode) {
      setCode(scannnedCode)
      void verifyBooking(scannnedCode, { showSuccessToast: true })
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
        setReservation(data.data)
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
    if (!checkoutNotes.trim()) {
      toast.error("Checkout notes are required")
      return
    }

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
          body: JSON.stringify({ notes: checkoutNotes.trim() }),
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

    void printBookingReceiptSmart({
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
  }

  const isWithinReservationWindow = () => {
    if (!reservation) return false

    const checkIn = businessDetails?.check_in || "14:00"
    const checkOut = businessDetails?.check_out || "11:00"
    const [ciH, ciM = 0] = String(checkIn).split(":").map(Number)
    const [coH, coM = 0] = String(checkOut).split(":").map(Number)

    const startDay = new Date(reservation.start_date)
    const endDay = new Date(reservation.end_date)
    const windowStart = new Date(
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate(),
      ciH,
      ciM,
      0,
      0,
    )
    const windowEnd = new Date(
      endDay.getFullYear(),
      endDay.getMonth(),
      endDay.getDate(),
      coH,
      coM,
      0,
      0,
    )

    const now = new Date()
    return now >= windowStart && now <= windowEnd
  }

  const checkInOpensAtLabel = () => {
    if (!reservation) return null
    const checkIn = businessDetails?.check_in || "14:00"
    const [ciH, ciM = 0] = String(checkIn).split(":").map(Number)
    const startDay = new Date(reservation.start_date)
    const opensAt = new Date(
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate(),
      ciH,
      ciM,
      0,
      0,
    )
    if (new Date() >= opensAt) return null
    return opensAt.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Dashboard
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Scan booking</h1>
            <p className="text-xs text-slate-500">
              Scan a QR code or enter a booking ID to check guests in or out
            </p>
          </div>
          {result !== null && (
            <Button onClick={handleReset} variant="outline" size="sm" className="h-9 rounded-xl shrink-0">
              Scan another
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {result === null && (
            <div className="max-w-xl mx-auto w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={isTauri() ? () => void handleNativeScan() : undefined}
                className={
                  isTauri()
                    ? "shrink-0 rounded-2xl border border-dashed border-indigo-200 bg-white p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    : "shrink-0 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center cursor-default"
                }
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <QrCode className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {isTauri() ? "Tap to scan QR code" : "Ready for scanner input"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isTauri()
                    ? "Opens the device camera"
                    : "Focus the field below and scan, or type the code"}
                </p>
              </button>

              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs">
                    Booking code
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g. SSH-123-ABC-456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && !isLoading && handleScan()}
                    className="h-10 font-mono uppercase tracking-wider text-sm"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleScan}
                  disabled={!code || isLoading}
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  {isLoading ? <LoadingSpinner size={18} className="text-white" /> : "Verify booking"}
                </Button>
              </div>
            </div>
          )}

          {result === "error" && (
            <div className="max-w-md mx-auto w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <X className="h-6 w-6 text-rose-600" strokeWidth={3} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Booking not found</h2>
              <p className="text-sm text-slate-500 mt-2">
                No reservation matched{" "}
                <span className="font-mono font-semibold text-slate-800">{code}</span>. Check the
                code and try again.
              </p>
              <Button onClick={handleReset} variant="outline" className="mt-5 h-10 rounded-xl">
                Try again
              </Button>
            </div>
          )}

          {result === "success" && reservation && (
            <div className="h-full min-h-[24rem] flex flex-col lg:flex-row gap-3">
              <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 sticky top-0 bg-white/95 backdrop-blur z-10">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {reservationGuestName(reservation)}
                      </p>
                      <p className="text-xs font-mono text-slate-500 uppercase truncate">
                        {reservation.booking_id}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge()}</div>
                </div>

                <div className="p-4 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Guest
                    </p>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-medium text-right">
                        {reservationGuestPhone(reservation)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 shrink-0">Email</span>
                      <span
                        className="font-medium text-xs truncate max-w-[160px] text-right"
                        title={reservationGuestEmail(reservation)}
                      >
                        {reservationGuestEmail(reservation)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Guests</span>
                      <span className="font-medium tabular-nums">
                        {reservation.guests} adult{reservation.guests === 1 ? "" : "s"}
                        {reservation.children > 0
                          ? `, ${reservation.children} child${reservation.children === 1 ? "" : "ren"}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Stay
                    </p>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Room type</span>
                      <span className="font-semibold text-right">{reservation.room_type_name}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Room no.</span>
                      <span className="font-semibold">
                        {reservation.room_number || "Not assigned"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Dates</span>
                      <span className="font-medium text-xs text-right">
                        {new Date(reservation.start_date).toLocaleDateString()} –{" "}
                        {new Date(reservation.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {(reservation.checked_in_at || reservation.checked_out_at) && (
                    <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 space-y-2 text-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Stay record
                      </p>
                      {reservation.checked_in_at && (
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Checked in</span>
                          <span className="font-medium text-right text-xs">
                            {new Date(reservation.checked_in_at).toLocaleString()}
                            {reservation.checked_in_by_name
                              ? ` · ${reservation.checked_in_by_name}`
                              : ""}
                          </span>
                        </div>
                      )}
                      {reservation.checked_out_at && (
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Checked out</span>
                          <span className="font-medium text-right text-xs">
                            {new Date(reservation.checked_out_at).toLocaleString()}
                            {reservation.checked_out_by_name
                              ? ` · ${reservation.checked_out_by_name}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <aside className="lg:w-64 xl:w-72 shrink-0 flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {!reservation.checked_in_at
                      ? "Guest is ready for check-in"
                      : !reservation.checked_out_at
                        ? "Guest is currently checked in"
                        : "Stay completed"}
                  </p>
                </div>

                <div className="flex-1 p-4 space-y-2">
                  {!reservation.checked_in_at ? (
                    <Button
                      onClick={handleCheckIn}
                      disabled={isLoading || !isWithinReservationWindow()}
                      className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
                    >
                      {isLoading ? (
                        <LoadingSpinner size={16} className="text-white" />
                      ) : (
                        "Check in guest"
                      )}
                    </Button>
                  ) : !reservation.checked_out_at ? (
                    <Button
                      onClick={() => setCheckoutDialogOpen(true)}
                      disabled={isLoading}
                      className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold"
                    >
                      Check out guest
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="w-full h-10 rounded-xl">
                      Completed
                    </Button>
                  )}

                  {!reservation.checked_in_at && !isWithinReservationWindow() && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2">
                      {checkInOpensAtLabel()
                        ? `Check-in opens at ${checkInOpensAtLabel()}.`
                        : "Check-in is only available during the reservation window."}
                    </p>
                  )}

                  <Button
                    onClick={handlePrintReceipt}
                    variant="outline"
                    className="w-full h-10 rounded-xl"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print receipt
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full h-10 rounded-xl lg:hidden"
                  >
                    Scan another
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        title="Check out guest"
        description={`Check out ${reservationGuestName(reservation)} from room ${reservation?.room_number}?`}
        confirmText="Confirm check-out"
        isDestructive
        loading={isLoading}
        confirmDisabled={!checkoutNotes.trim()}
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
    <Suspense
      fallback={
        <DashboardLayout activeTab="scancode">
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        </DashboardLayout>
      }
    >
      <ScanContent />
    </Suspense>
  )
}
