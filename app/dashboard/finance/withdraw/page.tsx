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
import { AlertCircle, ArrowLeft, Wallet, Building2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { getAuthToken } from "@/lib/storage"

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  account_name: string
  is_active: boolean
}

export default function WithdrawalPage() {
  const { user, businessId } = useAuth()
  const router = useRouter()
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number>(0)

  // Permissions Check & Fetch current withdrawal balance
  useEffect(() => {
    // Permission Check
    if (user && user.role !== 'admin' && !user.permissions?.finance?.withdraw) {
      toast.error("You do not have permission to withdraw funds.")
      router.push("/dashboard/finance")
      return
    }

    const fetchData = async () => {
      if (!businessId) return

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId
        }

        // Fetch Business (for balance)
        const businessRes = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, { headers })
        if (businessRes.ok) {
          const businessData = await businessRes.json()
          setBalance(parseFloat(businessData.withdrawable_balance || "0"))
        }

        // Fetch Bank Accounts
        const bankAccountsRes = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts`, { headers })
        if (bankAccountsRes.ok) {
          const bankAccountsData = await bankAccountsRes.json()
          setBankAccounts(bankAccountsData)
        }
      } catch (error) {
        console.error("Failed to fetch withdrawal data:", error)
      }
    }

    fetchData()
  }, [user, router, businessId])

  const selectedAccount = bankAccounts.find(acc => String(acc.id) === selectedAccountId)

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

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/withdraw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId!
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          bank_account_id: selectedAccountId
        })
      })

      if (response.ok) {
        toast.success("Withdrawal request submitted successfully")
        router.push("/dashboard/finance")
      } else {
        const data = await response.json()
        toast.error(data.error || "Withdrawal failed")
      }
    } catch (error) {
      console.error("Withdrawal error:", error)
      toast.error("An error occurred during withdrawal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout activeTab="finance">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Finance
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Withdraw Funds</h1>
          <p className="text-muted-foreground">Transfer funds to your verified company account</p>
        </div>

        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-600" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">₦{balance.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Funds available for immediate withdrawal</p>
          </CardContent>
        </Card>

        <form onSubmit={handleWithdraw}>
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur">
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
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{acc.bank_name}</span>
                          <span className="text-muted-foreground text-xs">• {acc.account_number.slice(-4)}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {bankAccounts.length === 0 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No bank accounts found
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {selectedAccount && (
                  <div className="bg-slate-50 border rounded-lg p-4 mt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Name</p>
                        <p className="font-medium">{selectedAccount.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="font-medium font-mono">{selectedAccount.account_number}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-medium">{selectedAccount.account_name}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="amount text-slate-900">Amount (₦)</Label>
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
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
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
