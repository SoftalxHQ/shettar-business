"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { logout as logoutAction, selectUser, selectBusinessId } from "@/lib/store/slices/authSlice"
import { logout as storageLogout } from "@/lib/storage"
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

interface CommissionPreview {
  amount: number
  commission_rate: number
  flat_fee: number
  commission_amount: number
  net_amount: number
}

export default function WithdrawalPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const businessId = useAppSelector(selectBusinessId)
  const logout = () => { dispatch(logoutAction()); storageLogout(); router.push("/login") }
  const router = useRouter()
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [preview, setPreview] = useState<CommissionPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
    "Content-Type": "application/json",
    "X-Business-Id": businessId!
  }), [businessId])

  useEffect(() => {
    if (user && user.role !== 'admin' && !user.permissions?.finance?.withdraw) {
      toast.error("You do not have permission to withdraw funds.")
      router.push("/dashboard/finance")
      return
    }

    const fetchData = async () => {
      if (!businessId) return
      try {
        const businessRes = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, { headers: getHeaders() })
        if (businessRes.status === 401) { logout(); return }
        if (businessRes.ok) {
          const data = await businessRes.json()
          setBalance(parseFloat(data.withdrawable_balance || "0"))
        }
        const bankRes = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts`, { headers: getHeaders() })
        if (bankRes.ok) {
          const data = await bankRes.json()
          setBankAccounts(data.data || data)
        }
      } catch (error) {
        console.error("Failed to fetch withdrawal data:", error)
      }
    }

    fetchData()
  }, [user, router, businessId])

  // Live commission preview as user types
  useEffect(() => {
    const num = parseFloat(amount)
    if (!businessId || isNaN(num) || num <= 0) { setPreview(null); return }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const res = await fetch(
          `${API_URL}/api/v1/user_businesses/${businessId}/commission_preview?amount=${num}`,
          { headers: getHeaders() }
        )
        if (res.ok) setPreview(await res.json())
      } catch { /* silent */ } finally {
        setPreviewLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [amount, businessId])

  const selectedAccount = bankAccounts.find(acc => String(acc.id) === selectedAccountId)

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount || !amount) { toast.error("Please select an account and enter an amount"); return }
    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) { toast.error("Please enter a valid amount"); return }
    if (withdrawAmount > balance) { toast.error("Insufficient funds"); return }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/withdraw`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ amount: withdrawAmount, bank_account_id: selectedAccountId, otp: isOtpStep ? otp : undefined })
      })
      if (response.status === 401) { logout(); return }
      const data = await response.json()
      if (response.ok) {
        if (data.status === "otp_required") { setIsOtpStep(true); toast.success(data.message) }
        else { toast.success(data.message || "Withdrawal successful"); router.push("/dashboard/finance") }
      } else {
        toast.error(data.error || "Withdrawal failed")
      }
    } catch (error) {
      console.error("Withdrawal error:", error)
      toast.error("An error occurred during withdrawal")
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
            <div className="text-3xl font-bold text-slate-900">{fmt(balance)}</div>
            <p className="text-sm text-muted-foreground mt-1">Funds available for immediate withdrawal</p>
          </CardContent>
        </Card>

        <form onSubmit={handleWithdraw}>
          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur">
            <CardHeader>
              <CardTitle>{isOtpStep ? "Verify Withdrawal" : "Withdrawal Details"}</CardTitle>
              <CardDescription>
                {isOtpStep ? "Enter the 6-digit code sent to your email to confirm this transaction." : "Select a destination account and amount"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isOtpStep ? (
                <>
                  <div className="space-y-3">
                    <Label>Select Company Account</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className="h-12 border-slate-200">
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
                          <div className="p-2 text-center text-xs text-muted-foreground">No bank accounts found</div>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedAccount && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Bank Name</p>
                            <p className="font-semibold text-slate-700">{selectedAccount.bank_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Account Number</p>
                            <p className="font-semibold text-slate-700 font-mono">{selectedAccount.account_number}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Account Name</p>
                            <p className="font-semibold text-slate-700">{selectedAccount.account_name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-slate-900">Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="h-12 text-lg border-slate-200 rounded-xl"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {amount && !isNaN(Number(amount)) && Number(amount) > balance && (
                      <p className="text-xs text-red-600 font-medium">Amount exceeds available balance</p>
                    )}
                  </div>

                  {/* Live commission breakdown */}
                  {(preview || previewLoading) && parseFloat(amount) > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">Transaction Breakdown</p>
                      {previewLoading ? (
                        <div className="flex items-center gap-2 text-sm text-indigo-500">
                          <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          Calculating...
                        </div>
                      ) : preview && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Withdrawal amount</span>
                            <span className="font-semibold">{fmt(preview.amount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Commission ({preview.commission_rate}%)</span>
                            <span className="font-semibold text-red-600">− {fmt(preview.commission_amount - (preview.flat_fee ?? 0))}</span>
                          </div>
                          {(preview.flat_fee ?? 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Paystack transfer fee</span>
                              <span className="font-semibold text-red-600">− {fmt(preview.flat_fee)}</span>
                            </div>
                          )}
                          <div className="border-t border-indigo-200 pt-2 flex justify-between text-sm">
                            <span className="font-bold text-slate-800">You will receive</span>
                            <span className="font-bold text-green-700 text-base">{fmt(preview.net_amount)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-slate-900 text-center block">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      className="h-14 text-2xl text-center font-bold tracking-[0.5em] border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all"
                      value={otp}
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                    />
                  </div>
                  {preview && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Withdrawal amount</span>
                        <span className="font-semibold">{fmt(preview.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Commission ({preview.commission_rate}%)</span>
                        <span className="font-semibold text-red-600">− {fmt(preview.commission_amount - (preview.flat_fee ?? 0))}</span>
                      </div>
                      {(preview.flat_fee ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Paystack transfer fee</span>
                          <span className="font-semibold text-red-600">− {fmt(preview.flat_fee)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                        <span className="font-bold">You will receive</span>
                        <span className="font-bold text-green-700">{fmt(preview.net_amount)}</span>
                      </div>
                      <p className="text-xs text-slate-400 text-center pt-1">
                        Sending to {selectedAccount?.bank_name} — {selectedAccount?.account_number}
                      </p>
                    </div>
                  )}
                  <Button type="button" variant="ghost" className="w-full text-xs text-slate-400 hover:text-indigo-600"
                    onClick={() => { setIsOtpStep(false); setOtp("") }}>
                    Wait, go back and edit details
                  </Button>
                </div>
              )}

              <Alert className="bg-blue-50 text-blue-800 border-blue-200 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-blue-800" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  {isOtpStep
                    ? "Never share your verification code with anyone. Our staff will never ask for it."
                    : "Withdrawals are processed instantly via Paystack. Please ensure your account details are correct."}
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
                disabled={loading || !selectedAccountId || !amount || Number(amount) > balance || (isOtpStep && otp.length < 6)}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (isOtpStep ? "Verify & Confirm Withdrawal" : "Initiate Withdrawal")}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
