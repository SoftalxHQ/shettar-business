"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, CreditCard, Banknote, Globe, TrendingUp, DollarSign, Calendar } from "lucide-react"
import { MOCK_PAYMENTS, MOCK_BOOKINGS, type Payment } from "@/lib/mock-data"

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [newPayment, setNewPayment] = useState({
    bookingId: "",
    amount: "",
    method: "card" as Payment["method"],
  })

  const filteredPayments = payments.filter(
    (payment) =>
      payment.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || payment.bookingId.includes(searchQuery),
  )

  const totalRevenue = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)

  const todayRevenue = payments
    .filter((p) => p.status === "completed" && p.date === new Date().toISOString().split("T")[0])
    .reduce((sum, p) => sum + p.amount, 0)

  const handleAddPayment = () => {
    const booking = MOCK_BOOKINGS.find((b) => b.id === newPayment.bookingId)
    if (!booking) return

    const payment: Payment = {
      id: (payments.length + 1).toString(),
      bookingId: newPayment.bookingId,
      guestName: booking.guestName,
      amount: Number.parseFloat(newPayment.amount),
      date: new Date().toISOString().split("T")[0],
      method: newPayment.method,
      status: "completed",
    }

    setPayments([payment, ...payments])
    setIsAddPaymentOpen(false)
    setNewPayment({
      bookingId: "",
      amount: "",
      method: "card",
    })
  }

  const getMethodIcon = (method: Payment["method"]) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-4 h-4" />
      case "cash":
        return <Banknote className="w-4 h-4" />
      case "online":
        return <Globe className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700"
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "refunded":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getMethodColor = (method: Payment["method"]) => {
    switch (method) {
      case "card":
        return "bg-purple-100 text-purple-700"
      case "cash":
        return "bg-green-100 text-green-700"
      case "online":
        return "bg-blue-100 text-blue-700"
    }
  }

  return (
    <DashboardLayout activeTab="payments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">Track and manage all transactions</p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsAddPaymentOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${todayRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.filter((p) => p.status === "completed").length}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Payment List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${getMethodColor(payment.method)}`}
                      >
                        {getMethodIcon(payment.method)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{payment.guestName}</h3>
                          <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                          <Badge className={getMethodColor(payment.method)} variant="outline">
                            {payment.method}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Booking ID: {payment.bookingId} • {new Date(payment.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">${payment.amount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add Payment Dialog */}
        <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Add a new payment transaction</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="booking">Booking</Label>
                <Select
                  value={newPayment.bookingId}
                  onValueChange={(value) => setNewPayment({ ...newPayment, bookingId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_BOOKINGS.filter((b) => b.status !== "cancelled").map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.guestName} - Room {booking.roomNumber} (${booking.totalAmount - booking.paidAmount}{" "}
                        due)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select
                  value={newPayment.method}
                  onValueChange={(value: Payment["method"]) => setNewPayment({ ...newPayment, method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPayment} className="bg-purple-600 hover:bg-purple-700">
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
