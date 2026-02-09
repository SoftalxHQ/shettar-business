"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, Printer, Home } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"

import { toast } from "sonner"

interface Reservation {
  booking_id: string
  other_first_name: string
  other_last_name: string
  other_email_address: string
  other_phone_number: string
  start_date: string
  end_date: string
  guests: number
  children: number
  total_amount: number
  payment_method: number
  room_type_name: string
  room_number?: string
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking_id")
  const { businessId, businessName } = useAuth()

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [businessDetails, setBusinessDetails] = useState<{ logo_url?: string; check_in?: string; check_out?: string } | null>(null)

  useEffect(() => {
    if (businessId && bookingId) {
      // In a real app we might fetch the specific booking details here
      // prioritizing showing the success state first
      fetchReservationDetails()
      fetchBusinessDetails()
    }
  }, [businessId, bookingId])

  const fetchReservationDetails = async () => {
    if (!businessId || !bookingId || bookingId === "undefined") return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      // Note: This endpoint might need adjustment depending on your API structure to get by booking_id
      // Assuming we can find it via the reservations list or a specific endpoint
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/reservations/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setReservation(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch reservation:", error)
    }
  }

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

  const paymentMethodLabels: { [key: number]: string } = {
    0: "Wallet",
    1: "Card",
    2: "POS",
    3: "Cash",
    4: "Transfer",
  }

  const formatDateTime = (dateStr: string, timeStr?: string) => {
    const date = new Date(dateStr)
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })

    if (!timeStr) return formattedDate

    let formattedTime = timeStr
    // Try to parse time if it looks like a time string
    try {
      const today = new Date().toISOString().split('T')[0]
      const timeDate = new Date(`${today}T${timeStr.includes('T') ? timeStr.split('T')[1] : timeStr}`)
      if (!isNaN(timeDate.getTime())) {
        formattedTime = timeDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }
    } catch (e) {
      // fallback to original string if parsing fails
    }

    return `${formattedDate} at ${formattedTime}`
  }

  const handlePrint = () => {
    if (!reservation) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0px'
    iframe.style.height = '0px'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const checkInDisplay = formatDateTime(reservation.start_date, businessDetails?.check_in)
    const checkOutDisplay = formatDateTime(reservation.end_date, businessDetails?.check_out)

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${reservation.booking_id}</title>
          <style>
            body { font-family: 'Courier New', monospace; max-width: 400px; margin: 20px auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .section { margin: 15px 0; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
             ${businessDetails?.logo_url
        ? `<img src="${businessDetails.logo_url}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />`
        : `<div style="width: 60px; height: 60px; background-color: #f3f4f6; border-radius: 50%; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px; font-weight: bold;">${(businessName || "H").charAt(0)}</div>`
      }
            <h2>${businessName || "RESERVATION RECEIPT"}</h2>
            <p>Booking ID: ${reservation.booking_id}</p>
          </div>
          <div class="section">
            <h3>Guest Information</h3>
            <div class="row"><span class="label">Name:</span><span>${reservation.other_first_name} ${reservation.other_last_name}</span></div>
            <div class="row"><span class="label">Email:</span><span>${reservation.other_email_address}</span></div>
            <div class="row"><span class="label">Phone:</span><span>${reservation.other_phone_number}</span></div>
          </div>
          <div class="section">
            <h3>Booking Details</h3>
            <div class="row"><span class="label">Room Type:</span><span>${reservation.room_type_name}</span></div>
            <div class="row"><span class="label">Check-in:</span><span>${checkInDisplay}</span></div>
            <div class="row"><span class="label">Check-out:</span><span>${checkOutDisplay}</span></div>
          </div>
          <div class="section">
            <div class="row"><span class="label">Payment:</span><span>${paymentMethodLabels[reservation.payment_method] || "Unknown"}</span></div>
            <div class="row total"><span class="label">Total:</span><span>₦${reservation.total_amount?.toLocaleString()}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for staying with us!</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(receiptHtml)
      doc.close()

      iframe.onload = () => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 1000)
      }
    }
  }

  return (
    <DashboardLayout activeTab="bookings">
      <div className="relative min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Decorative background elements */}
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
            <div className="bg-white border-2 border-dashed border-indigo-100 rounded-xl p-6 text-center transform transition-all hover:scale-[1.02] hover:border-indigo-200">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Booking Reference</p>
              <p className="text-4xl font-black text-indigo-600 tracking-tight">{bookingId}</p>
            </div>

            {reservation && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500">Guest Name</span>
                  <span className="font-semibold text-slate-800 text-right">{reservation.other_first_name} {reservation.other_last_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500">Dates</span>
                  <div className="text-right">
                    <span className="block font-semibold text-slate-800">{formatDateTime(reservation.start_date).split(' at ')[0]}</span>
                    <span className="text-xs text-slate-400">to {formatDateTime(reservation.end_date).split(' at ')[0]}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100">
                  <span className="text-slate-500">Room Type</span>
                  <span className="font-semibold text-slate-800 text-right">{reservation.room_type_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="font-medium text-slate-700">Total Amount</span>
                  <span className="font-bold text-lg text-emerald-600">₦{reservation.total_amount?.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={handlePrint} className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all bg-indigo-600 hover:bg-indigo-700">
                <Printer className="w-5 h-5 mr-2" />
                Print Receipt
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
