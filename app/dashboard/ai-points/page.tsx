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
import { ArrowLeft, CreditCard, Sparkles, Wallet } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  fetchAiPoints,
  initializeAiPointsTopup,
  transferAiPointsFromWithdrawable,
  verifyAiPointsTopup,
  type AiPointsBalance,
} from "@/lib/ai-points-api"
import { calculatePaystackCardFee, openPaystackCardCheckout, type PaystackInitResponse } from "@/lib/paystack"

const QUICK_POINTS = [5, 10, 20, 50]

export default function BuyAiPointsPage() {
  const router = useRouter()
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [points, setPoints] = useState("10")
  const [cardLoading, setCardLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [balance, setBalance] = useState<AiPointsBalance | null>(null)

  const canBuy =
    user?.role === "admin" ||
    user?.permissions?.ai_analyzer?.run ||
    user?.permissions?.finance?.view

  const numericPoints = parseInt(points, 10) || 0
  const pricePerPoint = balance?.config.point_price_naira ?? 50
  const welcomeFree = balance?.config.monthly_free_points ?? 5
  const withdrawable = balance?.withdrawable_balance ?? 0
  const targetAmount = numericPoints * pricePerPoint
  const feeBreakdown = useMemo(() => {
    if (numericPoints < 1) return null
    return calculatePaystackCardFee(targetAmount)
  }, [numericPoints, targetAmount])

  useEffect(() => {
    if (!businessId) return
    fetchAiPoints(businessId).then(setBalance).catch(() => {})
  }, [businessId])

  if (!canBuy) {
    return (
      <DashboardLayout activeTab="settings">
        <p className="text-xs text-slate-500">You do not have permission to buy AI points.</p>
      </DashboardLayout>
    )
  }

  const resetTransferFlow = () => {
    setIsOtpStep(false)
    setOtp("")
    setShowTransferConfirm(false)
  }

  const handleTransferClick = () => {
    if (numericPoints < 1) {
      toast.error("Buy at least 1 point")
      return
    }
    if (targetAmount > withdrawable) {
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
      const result = await transferAiPointsFromWithdrawable(businessId, numericPoints, withOtp)
      if (result.status === "otp_required") {
        setShowTransferConfirm(false)
        setIsOtpStep(true)
        toast.success(result.message || "Verification code sent to your email")
        return
      }

      if (result.ai_points) setBalance(result.ai_points)
      toast.success(result.message || "AI points funded from withdrawable balance")
      setPoints("10")
      resetTransferFlow()
      router.push("/dashboard/finance")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed")
    } finally {
      setTransferLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit verification code")
      return
    }
    await requestOrConfirmTransfer(otp)
  }

  const verifyPayment = async (reference: string) => {
    if (!businessId) return
    setCardLoading(true)
    try {
      const result = await verifyAiPointsTopup(businessId, reference)
      setBalance(result.ai_points)
      toast.success(result.message || "AI points credited")
      setPoints("10")
      router.push("/dashboard/finance")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment verification failed")
    } finally {
      setCardLoading(false)
    }
  }

  const handleCardPurchase = async () => {
    if (!businessId) return
    if (numericPoints < 1) {
      toast.error("Buy at least 1 point")
      return
    }
    if (!user?.email) {
      toast.error("Your account email is required for Paystack checkout")
      return
    }

    setCardLoading(true)
    try {
      const init = (await initializeAiPointsTopup(businessId, numericPoints)) as PaystackInitResponse
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
    <DashboardLayout activeTab="settings">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden max-w-lg">
        <div className="shrink-0">
          <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 mb-1 gap-1.5 px-2 text-xs text-slate-500">
            <Link href="/dashboard/finance">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to finance
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            {isOtpStep ? "Verify transfer" : "Buy AI points"}
          </h1>
          <p className="text-xs text-slate-500">
            {isOtpStep
              ? `Enter the 6-digit code sent to ${user?.email || "your email"} to confirm funding ₦${targetAmount.toLocaleString()} (${numericPoints} points).`
              : `Balance: ${balance?.total ?? "—"} (${balance?.free ?? 0} free · ${balance?.purchased ?? 0} purchased) · Withdrawable: ₦${withdrawable.toLocaleString()} · ₦${pricePerPoint}/point`}
          </p>
          {!isOtpStep && (
            <Link href="/dashboard/ai-history" className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline">
              View AI history
            </Link>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
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
                    className="h-14 text-2xl text-center font-bold tracking-[0.5em] rounded-lg border-slate-200"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={transferLoading}
                    autoFocus
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Points</span>
                    <span className="font-semibold text-slate-900">{numericPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transfer amount</span>
                    <span className="font-semibold text-slate-900">₦{targetAmount.toLocaleString()}</span>
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
                  onClick={() => void requestOrConfirmTransfer()}
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
                  Cancel and edit points
                </Button>
              </form>
            ) : (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs text-indigo-950 space-y-1.5">
                  <p className="font-semibold text-indigo-900">How AI points work</p>
                  <p>
                    New businesses receive{" "}
                    <span className="font-semibold">{welcomeFree} free welcome points</span> once at
                    registration. Free points are not refilled monthly — when they run out, buy more
                    below. Purchased points never expire and are kept separately.
                  </p>
                  <p className="text-indigo-800/80">
                    Analyzer runs spend free points first, then purchased points.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-xs text-slate-600">
                    Points to buy
                  </Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    disabled={isBusy}
                    className="h-11 rounded-lg border-slate-200"
                  />
                  <div className="flex flex-wrap gap-2">
                    {QUICK_POINTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setPoints(String(n))}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {n} pts · ₦{(n * pricePerPoint).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {feeBreakdown && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Points</span>
                      <span className="font-semibold tabular-nums">{numericPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="tabular-nums">₦{feeBreakdown.target_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paystack fee (card only)</span>
                      <span className="tabular-nums text-rose-600">+₦{feeBreakdown.paystack_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Card charge</span>
                      <span className="tabular-nums">₦{feeBreakdown.charge_amount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={isBusy || numericPoints < 1}
                  onClick={handleCardPurchase}
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {cardLoading ? "Processing…" : "Pay with card"}
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
                  type="button"
                  variant="outline"
                  disabled={isBusy || numericPoints < 1}
                  onClick={handleTransferClick}
                  className="w-full h-10 rounded-xl border-slate-200"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {transferLoading ? "Processing…" : `Transfer ₦${targetAmount.toLocaleString()} from withdrawable`}
                </Button>
                <p className="text-[11px] text-slate-500 text-center">
                  Withdrawable transfers have no Paystack fee. Available: ₦{withdrawable.toLocaleString()}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showTransferConfirm}
        onOpenChange={setShowTransferConfirm}
        title="Fund AI points from withdrawable?"
        description={`Transfer ₦${targetAmount.toLocaleString()} from your withdrawable balance for ${numericPoints} AI point${numericPoints === 1 ? "" : "s"}. A verification code will be sent to your email.`}
        confirmText="Send code"
        onConfirm={() => void requestOrConfirmTransfer()}
        loading={transferLoading}
      />
    </DashboardLayout>
  )
}
