"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, Printer, Home } from "lucide-react"
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
  buildBookingReceiptHtml,
  businessReceiptContext,
  fetchBusinessReceiptDetails,
  printBookingReceipt,
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
        businessId ? fetchBusinessReceiptDetails(businessId).then((data) => {
          if (!cancelled && data) setBusinessDetails(data)
        }) : Promise.resolve(),
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

      const receiptHtml = buildBookingReceiptHtml({
        reservation: target,
        business: businessReceiptContext(businessName, businessDetails),
        guestName: reservationGuestName(target),
        paymentMethodLabel: PAYMENT_METHOD_LABELS[target.payment_method] || "Unknown",
        detailed: Boolean(target.room_number),
      })

      printBookingReceipt(receiptHtml)
    } finally {
      setIsPrinting(false)
    }
  }

  const canPrint = Boolean(reservation) && !isLoading

  return (
    <DashboardLayout activeTab="bookings">
      <div className="relative min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-600/5 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />

        <Card className="relative max-w-lg w-full border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm z-10">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-in zoom-in duration-300">
              <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</CardTitle>
            <CardDescription className="text-lg text-slate-600">
              The reservation has been successfully created.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10 space-y-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <LoadingSpinner size={28} />
                <p className="text-sm text-slate-500">Loading receipt details…</p>
              </div>
            ) : reservation ? (
              <BookingReceiptCard
                reservation={reservation}
                business={businessReceiptContext(businessName, businessDetails)}
                guestName={reservationGuestName(reservation)}
                paymentMethodLabel={PAYMENT_METHOD_LABELS[reservation.payment_method] || "Unknown"}
              />
            ) : (
              <div className="bg-white border-2 border-dashed border-indigo-100 rounded-xl p-6 text-center">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Booking Reference
                </p>
                <p className="text-4xl font-black text-indigo-600 tracking-tight">{bookingId}</p>
                <p className="text-sm text-slate-500 mt-3">
                  Receipt details could not be loaded. You can still print from the bookings list.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => void handlePrint()}
                disabled={!canPrint || isPrinting}
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPrinting ? (
                  <>
                    <LoadingSpinner size={18} className="mr-2" />
                    Preparing print…
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5 mr-2" />
                    Print Receipt
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/bookings/new" className="block">
                  <Button variant="outline" className="w-full h-12 border-slate-200 hover:bg-slate-50 hover:text-indigo-600">
                    New Booking
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full h-12 border-slate-200 hover:bg-slate-50">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size={32} />
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
