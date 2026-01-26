"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { QrCode, Check, X, Printer, ArrowLeft } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getAuthToken } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

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
  qr_code_url?: string
  checked_in_at?: string
  checked_out_at?: string
  checked_in_by_name?: string
  checked_out_by_name?: string
}

export default function ScanPage() {
  const { businessId, logout } = useAuth()
  const { toast } = useToast()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [reservation, setReservation] = useState<Reservation | null>(null)

  const handleScan = async () => {
    if (!businessId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Business information not found. Please try logging in again.",
      })
      return
    }

    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a booking code",
      })
      return
    }

    try {
      setIsLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/reservations/${code.trim()}`,
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
        toast({
          title: "Success",
          description: "Booking found successfully!",
        })
      } else {
        if (response.status === 401) {
          // Check for JWT expired signature pattern if different
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
        toast({
          variant: "destructive",
          title: "Not Found",
          description: data.status?.message || "Booking not found",
        })
      }
    } catch (error) {
      console.error("Failed to fetch booking:", error)
      setResult("error")
      setReservation(null)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify booking code",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
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
        toast({
          title: "Success",
          description: data.status.message || "Guest checked in successfully!",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.status?.message || "Failed to check in guest",
        })
      }
    } catch (error) {
      console.error("Failed to check in:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during check-in",
      })
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
        }
      )

      const data = await response.json()

      if (response.ok && data.status?.code === 200) {
        setReservation(data.data) // Update with new data including check-out timestamp
        toast({
          title: "Success",
          description: data.status.message || "Guest checked out successfully!",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.status?.message || "Failed to check out guest",
        })
      }
    } catch (error) {
      console.error("Failed to check out:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during check-out",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!reservation) return

    // Create a printable receipt
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please allow popups to print receipts",
      })
      return
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${reservation.booking_id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              max-width: 400px;
              margin: 20px auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .section {
              margin: 15px 0;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .label {
              font-weight: bold;
            }
            .total {
              font-size: 18px;
              font-weight: bold;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
            }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RESERVATION RECEIPT</h2>
            <p>Booking ID: ${reservation.booking_id}</p>
          </div>

          <div class="section">
            <h3>Guest Information</h3>
            <div class="row">
              <span class="label">Name:</span>
              <span>${reservation.other_first_name} ${reservation.other_last_name}</span>
            </div>
            <div class="row">
              <span class="label">Email:</span>
              <span>${reservation.other_email_address}</span>
            </div>
            <div class="row">
              <span class="label">Phone:</span>
              <span>${reservation.other_phone_number}</span>
            </div>
          </div>

          <div class="section">
            <h3>Room Details</h3>
            <div class="row">
              <span class="label">Room Number:</span>
              <span>${reservation.room_number}</span>
            </div>
            <div class="row">
              <span class="label">Room Type:</span>
              <span>${reservation.room_type_name}</span>
            </div>
            <div class="row">
              <span class="label">Guests:</span>
              <span>${reservation.guests} adults, ${reservation.children} children</span>
            </div>
          </div>

          <div class="section">
            <h3>Stay Details</h3>
            <div class="row">
              <span class="label">Check-in Date:</span>
              <span>${new Date(reservation.start_date).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span class="label">Check-out Date:</span>
              <span>${new Date(reservation.end_date).toLocaleDateString()}</span>
            </div>
            ${reservation.checked_in_at ? `
            <div class="row">
              <span class="label">Actual Check-in:</span>
              <span>${new Date(reservation.checked_in_at).toLocaleString()}</span>
            </div>
            ${reservation.checked_in_by_name ? `
            <div class="row">
              <span class="label">Checked in by:</span>
              <span>${reservation.checked_in_by_name}</span>
            </div>
            ` : ''}
            ` : ''}
            ${reservation.checked_out_at ? `
            <div class="row">
              <span class="label">Actual Check-out:</span>
              <span>${new Date(reservation.checked_out_at).toLocaleString()}</span>
            </div>
            ${reservation.checked_out_by_name ? `
            <div class="row">
              <span class="label">Checked out by:</span>
              <span>${reservation.checked_out_by_name}</span>
            </div>
            ` : ''}
            ` : ''}
          </div>

          <div class="section">
            <h3>Payment</h3>
            <div class="row">
              <span class="label">Payment Method:</span>
              <span>${paymentMethodLabels[reservation.payment_method]}</span>
            </div>
            <div class="row total">
              <span class="label">Total Amount:</span>
              <span>₦${reservation.total_amount?.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your stay!</p>
            <p>Printed on: ${new Date().toLocaleString()}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(receiptHtml)
    printWindow.document.close()
  }

  const paymentMethodLabels: { [key: number]: string } = {
    0: "Wallet",
    1: "Card",
    2: "POS",
    3: "Cash",
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

    const now = new Date()
    const startDate = new Date(reservation.start_date)
    const endDate = new Date(reservation.end_date)

    if (reservation.cancelled) return <Badge variant="destructive">Cancelled</Badge>
    if (now >= startDate && now <= endDate) return <Badge className="bg-green-600">Active</Badge>
    if (now < startDate) return <Badge className="bg-blue-600">Upcoming</Badge>
    return <Badge variant="secondary">Past</Badge>
  }

  return (
    <DashboardLayout activeTab="scancode">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header with back button for easy navigation */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Scan Booking Code</h1>
            <p className="text-muted-foreground">Scan QR code or enter booking code manually</p>
          </div>
        </div>

        {/* Scanner */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Code Scanner</CardTitle>
            <CardDescription>Enter the booking code or scan the QR code from the guest's confirmation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code visual */}
            <div className="flex justify-center py-8">
              <div className="w-48 h-48 border-4 border-dashed border-purple-300 rounded-lg flex items-center justify-center bg-purple-50">
                <QrCode className="w-24 h-24 text-purple-400" />
              </div>
            </div>

            {/* Manual input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Booking Code</Label>
                <Input
                  id="code"
                  placeholder="Enter booking ID (e.g., SSH123ABC456)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isLoading && handleScan()}
                  className="text-lg h-12"
                  disabled={result !== null || isLoading}
                />
              </div>

              {result === null && (
                <Button
                  onClick={handleScan}
                  disabled={!code || isLoading}
                  className="w-full h-11"
                  size="lg"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  {isLoading ? "Verifying..." : "Scan / Verify Code"}
                </Button>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className="pt-4 border-t">
                {result === "success" && reservation ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold">Booking Found!</p>
                        <p className="text-sm">Guest information verified successfully</p>
                      </div>
                    </div>

                    {/* Booking details */}
                    <div className="space-y-4 bg-muted p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                          {reservation.other_first_name} {reservation.other_last_name}
                        </h3>
                        {getStatusBadge()}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Booking ID</p>
                          <p className="font-medium">{reservation.booking_id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium text-xs">{reservation.other_email_address}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Room Number</p>
                          <p className="font-medium">{reservation.room_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Room Type</p>
                          <p className="font-medium">{reservation.room_type_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Check-in</p>
                          <p className="font-medium">{new Date(reservation.start_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Check-out</p>
                          <p className="font-medium">{new Date(reservation.end_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Guests</p>
                          <p className="font-medium">{reservation.guests} adults, {reservation.children} children</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-medium">₦{reservation.total_amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{paymentMethodLabels[reservation.payment_method]}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium text-xs">{reservation.other_phone_number}</p>
                        </div>
                      </div>

                      {/* Check-in/Check-out Information */}
                      {(reservation.checked_in_at || reservation.checked_out_at) && (
                        <div className="border-t pt-4 mt-4">
                          <p className="text-sm font-semibold mb-3">Stay Status</p>
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            {reservation.checked_in_at && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-green-700 font-medium mb-1">✓ Checked In</p>
                                <p className="text-xs text-green-600">
                                  {new Date(reservation.checked_in_at).toLocaleString()}
                                </p>
                                {reservation.checked_in_by_name && (
                                  <p className="text-xs text-green-600 mt-1">
                                    By: {reservation.checked_in_by_name}
                                  </p>
                                )}
                              </div>
                            )}
                            {reservation.checked_out_at && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-blue-700 font-medium mb-1">✓ Checked Out</p>
                                <p className="text-xs text-blue-600">
                                  {new Date(reservation.checked_out_at).toLocaleString()}
                                </p>
                                {reservation.checked_out_by_name && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    By: {reservation.checked_out_by_name}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      {!reservation.checked_in_at ? (
                        <>
                          {!isWithinReservationWindow() && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-amber-800 text-sm font-medium">
                                {new Date() < new Date(reservation.start_date)
                                  ? `⏰ Check-in available from ${new Date(reservation.start_date).toLocaleString()}`
                                  : `⚠️ Reservation period has ended`}
                              </p>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <Button
                              onClick={handleCheckIn}
                              disabled={isLoading || !isWithinReservationWindow()}
                              className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                              size="lg"
                            >
                              {isLoading ? "Processing..." : "Complete Check-in"}
                            </Button>
                            <Button onClick={handlePrintReceipt} variant="outline" className="h-11 bg-transparent">
                              <Printer className="w-5 h-5" />
                            </Button>
                          </div>
                        </>
                      ) : !reservation.checked_out_at ? (
                        <div className="flex gap-3">
                          <Button
                            onClick={handleCheckOut}
                            disabled={isLoading}
                            className="flex-1 h-11 bg-blue-600 hover:bg-blue-700"
                            size="lg"
                          >
                            {isLoading ? "Processing..." : "Complete Check-out"}
                          </Button>
                          <Button onClick={handlePrintReceipt} variant="outline" className="h-11 bg-transparent">
                            <Printer className="w-5 h-5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <Button
                            disabled
                            className="flex-1 h-11"
                            variant="secondary"
                            size="lg"
                          >
                            Stay Completed
                          </Button>
                          <Button onClick={handlePrintReceipt} variant="outline" className="h-11 bg-transparent">
                            <Printer className="w-5 h-5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <Button onClick={handleReset} variant="ghost" className="w-full">
                      Scan Another Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-lg">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <X className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold">Booking Not Found</p>
                        <p className="text-sm">The code you entered doesn't match any booking</p>
                      </div>
                    </div>

                    <Button onClick={handleReset} variant="outline" className="w-full bg-transparent">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
