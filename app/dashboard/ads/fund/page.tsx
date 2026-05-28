"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId, selectUser } from "@/lib/store/slices/authSlice"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  const businessId = useAppSelector(selectBusinessId)
  const user = useAppSelector(selectUser)
  const [amount, setAmount] = useState("")
  const [transferLoading, setTransferLoading] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
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
        <p className="text-muted-foreground">You do not have permission to fund ads.</p>
      </DashboardLayout>
    )
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
    setShowTransferConfirm(true)
  }

  const handleTransfer = async () => {
    if (!businessId) return
    setTransferLoading(true)
    try {
      const updated = await transferToAdsWallet(businessId, numericAmount)
      setAccount((prev) => ({ ...prev!, ...updated }))
      toast.success("Transferred to ads wallet")
      setAmount("")
      setShowTransferConfirm(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transfer failed")
    } finally {
      setTransferLoading(false)
    }
  }

  const verifyPayment = async (reference: string) => {
    if (!businessId) return
    setCardLoading(true)
    try {
      const result = await verifyAdsTopup(businessId, reference)
      setAccount((prev) => ({ ...prev!, ...result.ad_account }))
      toast.success(result.message || "Ads wallet funded successfully")
      setAmount("")
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
      <div className="max-w-lg space-y-6">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href="/dashboard/ads">
            <ArrowLeft className="h-4 w-4" /> Back to ads
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Fund ads wallet</CardTitle>
            <CardDescription>
              Ads balance: ₦{(account?.ads_balance ?? 0).toLocaleString()} · Withdrawable: ₦
              {(account?.withdrawable_balance ?? 0).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to add (₦)</Label>
              <Input
                id="amount"
                type="number"
                min={MIN_TOPUP}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                disabled={isBusy}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum ₦{MIN_TOPUP}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => setAmount(String(value))}
                >
                  ₦{value.toLocaleString()}
                </Button>
              ))}
            </div>

            {feeBreakdown && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 space-y-2 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">Card payment breakdown</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ads wallet credit</span>
                  <span>₦{feeBreakdown.target_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paystack processing fee</span>
                  <span className="text-destructive">+₦{feeBreakdown.paystack_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>You will be charged</span>
                  <span>₦{feeBreakdown.charge_amount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleCardTopup}
              disabled={isBusy || !amount || numericAmount < MIN_TOPUP}
              className="w-full gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {cardLoading ? "Processing…" : "Pay with card (Paystack)"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              onClick={handleTransferClick}
              disabled={isBusy || !amount || numericAmount < MIN_TOPUP}
              variant="outline"
              className="w-full gap-2"
            >
              <Wallet className="h-4 w-4" />
              Transfer from withdrawable balance
            </Button>

            <p className="text-xs text-muted-foreground">
              Card payments open Paystack securely in a popup. Your ads balance is credited after payment
              verification.
            </p>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showTransferConfirm}
        onOpenChange={setShowTransferConfirm}
        title="Confirm transfer"
        description="This will move funds from your withdrawable balance into your ads wallet. This action cannot be undone."
        confirmText="Confirm transfer"
        isDestructive={false}
        loading={transferLoading}
        onConfirm={handleTransfer}
      >
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transfer amount</span>
            <span className="font-semibold">₦{numericAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current withdrawable</span>
            <span>₦{(account?.withdrawable_balance ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current ads balance</span>
            <span>₦{(account?.ads_balance ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>New ads balance</span>
            <span className="text-emerald-600">
              ₦{((account?.ads_balance ?? 0) + numericAmount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Remaining withdrawable</span>
            <span>₦{Math.max(0, (account?.withdrawable_balance ?? 0) - numericAmount).toLocaleString()}</span>
          </div>
        </div>
      </ConfirmDialog>
    </DashboardLayout>
  )
}
