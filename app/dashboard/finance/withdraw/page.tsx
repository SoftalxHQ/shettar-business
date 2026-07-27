"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { logout as logoutAction, selectUser, selectBusinessId } from "@/lib/store/slices/authSlice"
import { logout as storageLogout } from "@/lib/storage"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 h-7 -ml-2 px-2 text-xs text-slate-500 hover:text-slate-800"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Finance
            </Button>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Withdraw funds</h1>
            <p className="text-xs text-slate-500">Transfer to a verified company account</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available balance</p>
                <Wallet className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{fmt(balance)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Ready for immediate withdrawal</p>
            </div>

            <form onSubmit={handleWithdraw} className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {isOtpStep ? "Verify withdrawal" : "Withdrawal details"}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {isOtpStep
                    ? "Enter the 6-digit code sent to your email."
                    : "Select a destination account and amount"}
                </p>
              </div>
              <div className="space-y-4 p-4">
                {!isOtpStep ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600">Company account</Label>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 text-sm">
                          <SelectValue placeholder="Select verified bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium">{acc.bank_name}</span>
                                <span className="text-xs text-slate-400">• {acc.account_number.slice(-4)}</span>
                              </div>
                            </SelectItem>
                          ))}
                          {bankAccounts.length === 0 && (
                            <div className="p-2 text-center text-xs text-slate-400">No bank accounts found</div>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedAccount && (
                        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bank</p>
                              <p className="font-medium text-slate-700">{selectedAccount.bank_name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Account</p>
                              <p className="font-mono font-medium text-slate-700">{selectedAccount.account_number}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Name</p>
                              <p className="font-medium text-slate-700">{selectedAccount.account_name}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-xs text-slate-600">Amount (₦)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        className="h-9 rounded-lg border-slate-200 text-sm tabular-nums"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      {amount && !isNaN(Number(amount)) && Number(amount) > balance && (
                        <p className="text-xs font-medium text-red-600">Amount exceeds available balance</p>
                      )}
                    </div>

                    {(preview || previewLoading) && parseFloat(amount) > 0 && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Breakdown
                        </p>
                        {previewLoading ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                            Calculating…
                          </div>
                        ) : preview && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Withdrawal amount</span>
                              <span className="font-medium tabular-nums text-slate-800">{fmt(preview.amount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Commission ({preview.commission_rate}%)</span>
                              <span className="font-medium tabular-nums text-rose-600">
                                − {fmt(preview.commission_amount - (preview.flat_fee ?? 0))}
                              </span>
                            </div>
                            {(preview.flat_fee ?? 0) > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Paystack transfer fee</span>
                                <span className="font-medium tabular-nums text-rose-600">− {fmt(preview.flat_fee)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-slate-200 pt-2 text-xs">
                              <span className="font-semibold text-slate-800">You will receive</span>
                              <span className="font-semibold tabular-nums text-emerald-700">{fmt(preview.net_amount)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 py-1">
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="block text-center text-xs text-slate-600">
                        Verification code
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="••••••"
                        className="h-11 rounded-lg border-slate-200 bg-slate-50 text-center text-lg font-semibold tracking-[0.35em] focus:bg-white"
                        value={otp}
                        maxLength={6}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        autoFocus
                      />
                    </div>
                    {preview && (
                      <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Withdrawal amount</span>
                          <span className="font-medium tabular-nums">{fmt(preview.amount)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Commission ({preview.commission_rate}%)</span>
                          <span className="font-medium tabular-nums text-rose-600">
                            − {fmt(preview.commission_amount - (preview.flat_fee ?? 0))}
                          </span>
                        </div>
                        {(preview.flat_fee ?? 0) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Paystack transfer fee</span>
                            <span className="font-medium tabular-nums text-rose-600">− {fmt(preview.flat_fee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-xs">
                          <span className="font-semibold">You will receive</span>
                          <span className="font-semibold tabular-nums text-emerald-700">{fmt(preview.net_amount)}</span>
                        </div>
                        <p className="pt-1 text-center text-[10px] text-slate-400">
                          Sending to {selectedAccount?.bank_name} — {selectedAccount?.account_number}
                        </p>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full text-xs text-slate-400 hover:text-indigo-600"
                      onClick={() => {
                        setIsOtpStep(false)
                        setOtp("")
                      }}
                    >
                      Go back and edit details
                    </Button>
                  </div>
                )}

                <Alert className="rounded-lg border-slate-200 bg-slate-50 text-slate-700">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                  <AlertTitle className="text-xs font-semibold">Important</AlertTitle>
                  <AlertDescription className="text-[11px] text-slate-500">
                    {isOtpStep
                      ? "Never share your verification code. Our staff will never ask for it."
                      : "Withdrawals process instantly via Paystack. Confirm account details before submitting."}
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  size="sm"
                  className="h-9 w-full rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700"
                  disabled={
                    loading ||
                    !selectedAccountId ||
                    !amount ||
                    Number(amount) > balance ||
                    (isOtpStep && otp.length < 6)
                  }
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Processing…
                    </div>
                  ) : isOtpStep ? (
                    "Verify & confirm"
                  ) : (
                    "Initiate withdrawal"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
