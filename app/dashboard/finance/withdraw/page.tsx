"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowLeft, Wallet, Building2, ChevronRight } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

// Mock company accounts - this should ideally come from an API
const MOCK_ACCOUNTS = [
  { id: "1", bankName: "Access Bank", accountNumber: "0012345678", accountName: "Abri Hotel Ventures", type: "Corporate" },
  { id: "2", bankName: "GTBank", accountNumber: "0123456789", accountName: "Abri Hotel Ventures", type: "Regular" },
  { id: "3", bankName: "Zenith Bank", accountNumber: "2034567890", accountName: "Abri Hotel Ventures", type: "Savings" },
]

export default function WithdrawalPage() {
  const { user, businessId } = useAuth()
  const router = useRouter()
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number>(0) // Withdrawable balance

  // Permissions Check & Fetch current withdrawal balance
  useEffect(() => {
    // Permission Check
    if (user && user.role !== 'admin' && !user.permissions?.finance?.withdraw) {
      toast.error("You do not have permission to withdraw funds.")
      router.push("/dashboard/finance")
      return
    }

    // In a real app, fetch from API. For now, mocking or passing via previous page state would be better, 
    // but here we'll just simulate fetching or use a default since we don't have global state for this yet.
    // Ideally this call is similar to the FinancePage fetch.
    setBalance(500000) // Mock balance for demo if fetch fails or is not implemented here yet
  }, [user, router])

  const selectedAccount = MOCK_ACCOUNTS.find(acc => acc.id === selectedAccountId)

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAccount || !amount) {
      toast.error("Please select an account and enter an amount")
      return
    }

    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (withdrawAmount > balance) {
      toast.error("Insufficient funds")
      return
    }

    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      alert(`Withdrawal Request Successful!\n\nAmount: ₦${withdrawAmount.toLocaleString()}\nTo: ${selectedAccount.bankName} - ${selectedAccount.accountNumber}`)
      router.push("/dashboard/finance")
      toast.success("Withdrawal request submitted successfully")
    }, 1500)
  }

  return (
    <DashboardLayout activeTab="finance">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Finance
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Withdraw Funds</h1>
          <p className="text-muted-foreground">Transfer funds to your verified company account</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-600" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦{balance.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Funds available for immediate withdrawal</p>
          </CardContent>
        </Card>

        <form onSubmit={handleWithdraw}>
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Details</CardTitle>
              <CardDescription>Select a destination account and amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-3">
                <Label>Select Company Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select verified bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_ACCOUNTS.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{acc.bankName}</span>
                          <span className="text-muted-foreground text-xs">• {acc.accountNumber.slice(-4)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedAccount && (
                  <div className="bg-slate-50 border rounded-lg p-4 mt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Name</p>
                        <p className="font-medium">{selectedAccount.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="font-medium font-mono">{selectedAccount.accountNumber}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-medium">{selectedAccount.accountName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="h-12 text-lg"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amount && !isNaN(Number(amount)) && Number(amount) > balance && (
                  <p className="text-xs text-red-600 font-medium">Amount exceeds available balance</p>
                )}
              </div>

              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-800" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  Withdrawals are processed within 24 hours. Please ensure your account details are correct to avoid delays.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700"
                disabled={loading || !selectedAccountId || !amount || Number(amount) > balance}
              >
                {loading ? "Processing..." : "Withdraw Funds"}
              </Button>

            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
