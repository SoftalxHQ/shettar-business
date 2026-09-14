"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CreditCard, Wallet } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { fetchAdAccount, initializeAdsTopup, transferToAdsWallet, verifyAdsTopup } from "@/lib/ads-api"
import { calculatePaystackCardFee, openPaystackCardCheckout, type PaystackInitResponse } from "@/lib/paystack"

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000]
const MIN_TOPUP = 100

export default function AdsFundPage() {
  const router = useRouter()
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [amount, setAmount] = useState("")
  const [transferLoading, setTransferLoading] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [account, setAccount] = useState<{ ads_balance: number; withdrawable_balance: number } | null>(null)

  const canManage = user?.role === "admin" || user?.permissions?.ads?.manage

  const numericAmount = parseFloat(amount) || 0
  const feeBreakdown = useMemo(() => {
    if (numericAmount < MIN_TOPUP) return null
    return calculatePaystackCardFee(numericAmount)
  }, [numericAmount])

  useEffect(() => {
    if (!businessId) return
    fetchAdAccount(businessId).then(setAccount).catch(() => {})
  }, [businessId])

  if (!canManage) {
    return (
      <DashboardLayout activeTab="ads">
        <p className="text-xs text-slate-500">You do not have permission to fund ads.</p>
      </DashboardLayout>
    )
  }

  const resetTransferFlow = () => {
    setIsOtpStep(false)
    setOtp("")
    setShowTransferConfirm(false)
  }

  const handleTransferClick = () => {
    if (numericAmount < MIN_TOPUP) {
      toast.error(`Minimum amount is ₦${MIN_TOPUP}`)
      return
    }
    if (account && numericAmount > account.withdrawable_balance) {
      toast.error("Insufficient withdrawable balance")
      return
    }
    setIsOtpStep(false)
    setOtp("")
    setShowTransferConfirm(true)
  }

  const requestOrConfirmTransfer = async (withOtp?: string) => {
    if (!businessId) return
    setTransferLoading(true)
    try {
      const result = await transferToAdsWallet(businessId, numericAmount, withOtp)
      if (result.status === "otp_required") {
        setShowTransferConfirm(false)
        setIsOtpStep(true)
        toast.success(result.message || "Verification code sent to your email")
        return
      }

      if (result.ad_account) {
        setAccount((prev) => ({ ...prev!, ...result.ad_account }))
      }
      toast.success(result.message || "Transferred to ads wallet")
      setAmount("")
      resetTransferFlow()
      router.push("/dashboard/ads")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed")
    } finally {
      setTransferLoading(false)
    }
  }

  const handleTransfer = async () => {
    await requestOrConfirmTransfer()
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit verification code")
      return
    }
    await requestOrConfirmTransfer(otp)
  }

  const handleResendOtp = async () => {
    setOtp("")
    await requestOrConfirmTransfer()
  }

  const verifyPayment = async (reference: string) => {
    if (!businessId) return
    setCardLoading(true)
    try {
      const result = await verifyAdsTopup(businessId, reference)
      setAccount((prev) => ({ ...prev!, ...result.ad_account }))
      toast.success(result.message || "Ads wallet funded successfully")
      setAmount("")
      router.push("/dashboard/ads")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment verification failed")
    } finally {
      setCardLoading(false)
    }
  }

  const handleCardTopup = async () => {
    if (!businessId) return
    if (numericAmount < MIN_TOPUP) {
      toast.error(`Minimum top-up is ₦${MIN_TOPUP}`)
      return
    }
    if (!user?.email) {
      toast.error("Your account email is required for Paystack checkout")
      return
    }

    setCardLoading(true)
    try {
      const init = (await initializeAdsTopup(businessId, numericAmount, "card")) as PaystackInitResponse

      openPaystackCardCheckout(init, {
        email: user.email,
        onClose: () => setCardLoading(false),
        onSuccess: async (reference) => {
          await verifyPayment(reference)
        },
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment")
      setCardLoading(false)
    }
  }

  const isBusy = transferLoading || cardLoading

  return (
    <DashboardLayout activeTab="ads">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden max-w-lg">
        <div className="shrink-0 min-w-0">
          <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-1 gap-1.5 px-2 text-xs text-slate-500">
            <Link href="/dashboard/ads">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to ads
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
            {isOtpStep ? "Verify transfer" : "Fund ads wallet"}
          </h1>
          <p className="text-xs text-slate-500 break-words">
            {isOtpStep
              ? `Enter the 6-digit code sent to ${user?.email || "your email"} to confirm funding ₦${numericAmount.toLocaleString()}.`
              : `Ads balance: ₦${(account?.ads_balance ?? 0).toLocaleString()} · Withdrawable: ₦${(
                  account?.withdrawable_balance ?? 0
                ).toLocaleString()}`}
          </p>
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3.5 space-y-4">
            {isOtpStep ? (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-center block text-xs text-slate-600">
                    Verification code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit code"
                    className="h-12 sm:h-14 text-xl sm:text-2xl text-center font-bold tracking-[0.35em] sm:tracking-[0.5em] rounded-lg border-slate-200 min-w-0"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={transferLoading}
                    autoFocus
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transfer amount</span>
                    <span className="font-semibold text-slate-900">₦{numericAmount.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm"
                  disabled={transferLoading || otp.length !== 6}
                >
                  {transferLoading ? "Verifying…" : "Confirm funding"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  disabled={transferLoading}
                  onClick={() => void handleResendOtp()}
                >
                  Resend code
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-slate-500"
                  disabled={transferLoading}
                  onClick={resetTransferFlow}
                >
                  Cancel and edit amount
                </Button>
              </form>
            ) : (
              <>
                <div>
                  <Label htmlFor="amount" className="text-xs text-slate-600">Amount to add (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={MIN_TOPUP}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    disabled={isBusy}
                    className="mt-1.5 h-9 rounded-lg border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Minimum ₦{MIN_TOPUP}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      className="h-7 rounded-lg border-slate-200 text-xs"
                      onClick={() => setAmount(String(value))}
                    >
                      ₦{value.toLocaleString()}
                    </Button>
                  ))}
                </div>

                {feeBreakdown && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-2 text-xs">
                    <p className="font-medium text-amber-900 dark:text-amber-100">Card payment breakdown</p>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ads wallet credit</span>
                      <span>₦{feeBreakdown.target_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Paystack processing fee</span>
                      <span className="text-rose-600">+₦{feeBreakdown.paystack_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-200 pt-2 font-medium">
                      <span>You will be charged</span>
                      <span>₦{feeBreakdown.charge_amount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCardTopup}
                  disabled={isBusy || !amount || numericAmount < MIN_TOPUP}
                  className="w-full h-9 gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm"
                >
                  <CreditCard className="h-4 w-4" />
                  {cardLoading ? "Processing…" : "Pay with card (Paystack)"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 text-slate-400">or</span>
                  </div>
                </div>

                <Button
                  onClick={handleTransferClick}
                  disabled={isBusy || !amount || numericAmount < MIN_TOPUP}
                  variant="outline"
                  className="w-full h-9 gap-2 rounded-lg border-slate-200 text-sm"
                >
                  <Wallet className="h-4 w-4" />
                  Transfer from withdrawable balance
                </Button>

                <p className="text-[11px] text-slate-500">
                  Wallet transfers require an email verification code. Card payments open Paystack
                  securely in a popup.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showTransferConfirm}
        onOpenChange={setShowTransferConfirm}
        title="Confirm transfer"
        description="We will email a verification code to confirm moving funds from your withdrawable balance into your ads wallet."
        confirmText="Send verification code"
        isDestructive={false}
        loading={transferLoading}
        onConfirm={handleTransfer}
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Transfer amount</span>
            <span className="font-semibold text-slate-900">₦{numericAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Code will be sent to</span>
            <span className="font-medium truncate max-w-[55%] text-right">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current withdrawable</span>
            <span>₦{(account?.withdrawable_balance ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current ads balance</span>
            <span>₦{(account?.ads_balance ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-medium">
            <span>New ads balance</span>
            <span className="text-emerald-600">
              ₦{((account?.ads_balance ?? 0) + numericAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Remaining withdrawable</span>
            <span>₦{Math.max(0, (account?.withdrawable_balance ?? 0) - numericAmount).toLocaleString()}</span>
          </div>
        </div>
      </ConfirmDialog>
    </DashboardLayout>
  )
}
