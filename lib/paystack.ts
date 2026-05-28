/** Paystack card fee — gross charge so the platform receives the target amount after fees. */

export type PaystackCardFeeBreakdown = {
  target_amount: number
  charge_amount: number
  paystack_fee: number
}

export function calculatePaystackCardFee(targetAmount: number): PaystackCardFeeBreakdown {
  const target = Math.max(0, Number(targetAmount) || 0)
  let gross: number
  if (target < 2500) {
    gross = target / (1 - 0.015)
  } else {
    gross = (target + 100) / (1 - 0.015)
    if (gross - target > 2000) gross = target + 2000
  }
  gross = Math.round(gross * 100) / 100
  const fee = Math.round((gross - target) * 100) / 100
  return { target_amount: target, charge_amount: gross, paystack_fee: fee }
}

export type PaystackInitResponse = {
  reference: string
  target_amount: number
  charge_amount: number
  paystack_fee: number
  email: string
  metadata: Record<string, unknown>
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string
        email: string
        amount: number
        ref: string
        metadata?: Record<string, unknown>
        onClose?: () => void
        callback?: (response: { reference: string }) => void
      }) => { openIframe: () => void }
    }
  }
}

export function openPaystackCardCheckout(
  init: PaystackInitResponse,
  options: {
    email: string
    onClose?: () => void
    onSuccess: (reference: string) => void | Promise<void>
  }
) {
  const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
  if (!key) {
    throw new Error("Paystack is not configured. Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.")
  }
  if (!window.PaystackPop) {
    throw new Error("Paystack is still loading. Please try again in a moment.")
  }

  const chargeAmount = init.charge_amount || init.target_amount
  const handler = window.PaystackPop.setup({
    key,
    email: options.email || init.email,
    amount: Math.round(chargeAmount * 100),
    ref: init.reference,
    metadata: init.metadata,
    onClose: options.onClose,
    callback: (response) => {
      void options.onSuccess(response.reference)
    },
  })
  handler.openIframe()
}
