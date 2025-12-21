"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { QrCode, Check, X, Printer, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { MOCK_BOOKINGS } from "@/lib/mock-data"
import Link from "next/link"

export default function ScanPage() {
  const [code, setCode] = useState("")
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [booking, setBooking] = useState<any>(null)

  const handleScan = () => {
    // Simulate scanning - check if code matches any booking ID
    const foundBooking = MOCK_BOOKINGS.find((b) => b.id === code || b.roomNumber === code)

    if (foundBooking) {
      setResult("success")
      setBooking(foundBooking)
    } else {
      setResult("error")
      setBooking(null)
    }
  }

  const handleReset = () => {
    setCode("")
    setResult(null)
    setBooking(null)
  }

  const handleCheckIn = () => {
    alert("Check-in successful! (This would update the booking status in a real app)")
    handleReset()
  }

  const handlePrintReceipt = () => {
    alert("Printing receipt... (This would trigger a print dialog in a real app)")
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
                  placeholder="Enter booking ID or room number (e.g., 1, 2, 102, 202)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  className="text-lg h-12"
                  disabled={result !== null}
                />
                <p className="text-xs text-muted-foreground">
                  Demo: Try entering "1", "2", "3", "4", or "5" or room numbers like "102", "202"
                </p>
              </div>

              {result === null && (
                <Button onClick={handleScan} disabled={!code} className="w-full h-11" size="lg">
                  <QrCode className="w-5 h-5 mr-2" />
                  Scan / Verify Code
                </Button>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className="pt-4 border-t">
                {result === "success" ? (
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
                        <h3 className="font-semibold text-lg">{booking.guestName}</h3>
                        <Badge>{booking.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Room Number</p>
                          <p className="font-medium">{booking.roomNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Room Type</p>
                          <p className="font-medium">{booking.roomType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Check-in</p>
                          <p className="font-medium">{booking.checkInDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Check-out</p>
                          <p className="font-medium">{booking.checkOutDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Guests</p>
                          <p className="font-medium">{booking.guests} guests</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-medium">₦{booking.totalAmount}</p>
                        </div>
                      </div>

                      {booking.specialRequests && (
                        <div>
                          <p className="text-muted-foreground text-sm">Special Requests</p>
                          <p className="text-sm mt-1">{booking.specialRequests}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button onClick={handleCheckIn} className="flex-1 h-11" size="lg">
                        Complete Check-in
                      </Button>
                      <Button onClick={handlePrintReceipt} variant="outline" className="h-11 bg-transparent">
                        <Printer className="w-5 h-5" />
                      </Button>
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
