"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Check, Printer, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { toast } from "sonner"
import { reservationGuestName } from "@/lib/reservation-guest"
import {
  BookingReceiptBusiness,
  BookingReceiptReservation,
  PAYMENT_METHOD_LABELS,
  businessReceiptContext,
  fetchBusinessReceiptDetails,
  printBookingReceiptSmart,
} from "@/lib/booking-receipt"
import { BookingReceiptCard } from "@/components/booking-receipt-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type Reservation = BookingReceiptReservation & {
  client_name?: string
  first_name?: string
  last_name?: string
  other_first_name?: string
  other_last_name?: string
  other_email_address?: string
  other_phone_number?: string
  guests: number
  children: number
  payment_method: number
}

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking_id")
  const { businessId, businessName } = useAuth()

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [businessDetails, setBusinessDetails] = useState<BookingReceiptBusiness | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false)

  const fetchReservationDetails = useCallback(async (): Promise<Reservation | null> => {
    if (!businessId || !bookingId || bookingId === "undefined") return null

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reservations/${encodeURIComponent(bookingId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const record = data.data as Reservation | undefined
        if (record) {
          setReservation(record)
          return record
        }
      }
    } catch (error) {
      console.error("Failed to fetch reservation:", error)
    }

    return null
  }, [businessId, bookingId])

  useEffect(() => {
    if (!businessId || !bookingId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchReservationDetails(),
        businessId
          ? fetchBusinessReceiptDetails(businessId).then((data) => {
              if (!cancelled && data) setBusinessDetails(data)
            })
          : Promise.resolve(),
      ])
      if (!cancelled) setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [businessId, bookingId, fetchReservationDetails])

  const handlePrint = async () => {
    if (isPrinting) return

    setIsPrinting(true)
    try {
      let target = reservation
      if (!target) {
        target = await fetchReservationDetails()
      }
      if (!target) {
        toast.error("Booking details are not ready yet. Please try again.")
        return
      }

      await printBookingReceiptSmart({
        reservation: target,
        business: businessReceiptContext(businessName, businessDetails),
        guestName: reservationGuestName(target),
        paymentMethodLabel: PAYMENT_METHOD_LABELS[target.payment_method] || "Unknown",
        detailed: Boolean(target.room_number),
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const canPrint = Boolean(reservation) && !isLoading

  return (
    <DashboardLayout activeTab="bookings">
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
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-tight">
                  Booking confirmed
                </h1>
                <p className="text-xs text-slate-500">
                  {bookingId ? (
                    <>
                      Ref{" "}
                      <span className="font-mono font-medium text-slate-700 uppercase">
                        {bookingId}
                      </span>
                    </>
                  ) : (
                    "Reservation created successfully"
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl">
              <Link href="/dashboard/bookings/new">New booking</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl">
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-1.5" />
                Home
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-sm">
            {isLoading ? (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 p-6">
                <LoadingSpinner size={28} />
                <p className="text-sm text-slate-500">Loading receipt details…</p>
              </div>
            ) : reservation ? (
              <div className="flex justify-center p-4 sm:p-6">
                <BookingReceiptCard
                  className="w-full max-w-sm shadow-md"
                  reservation={reservation}
                  business={businessReceiptContext(businessName, businessDetails)}
                  guestName={reservationGuestName(reservation)}
                  paymentMethodLabel={
                    PAYMENT_METHOD_LABELS[reservation.payment_method] || "Unknown"
                  }
                />
              </div>
            ) : (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Booking reference
                </p>
                <p className="text-2xl font-semibold font-mono text-indigo-600 tracking-tight">
                  {bookingId || "—"}
                </p>
                <p className="text-sm text-slate-500 max-w-sm">
                  Receipt details could not be loaded. You can still print from the bookings list.
                </p>
              </div>
            )}
          </div>

          <aside className="lg:w-64 xl:w-72 shrink-0 flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Next steps</h2>
              <p className="text-xs text-slate-500 mt-0.5">Print a slip or continue at the desk</p>
            </div>

            <div className="flex-1 p-4 space-y-2">
              <Button
                onClick={() => void handlePrint()}
                disabled={!canPrint || isPrinting}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold disabled:opacity-60"
              >
                {isPrinting ? (
                  <>
                    <LoadingSpinner size={16} className="mr-2" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Print receipt
                  </>
                )}
              </Button>

              <Button asChild variant="outline" className="w-full h-10 rounded-xl">
                <Link href="/dashboard/bookings">View all bookings</Link>
              </Button>

              <Button asChild variant="outline" className="w-full h-10 rounded-xl sm:hidden">
                <Link href="/dashboard/bookings/new">New booking</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-10 rounded-xl sm:hidden">
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout activeTab="bookings">
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        </DashboardLayout>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
