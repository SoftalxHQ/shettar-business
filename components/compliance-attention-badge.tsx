"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectBusinessId } from "@/lib/store/slices/authSlice"
import { fetchBusinessPartnerAgreement, PARTNER_AGREEMENT_UPDATED_EVENT } from "@/lib/partner-agreement"
import { cn } from "@/lib/utils"

/** Amber attention mark when the partner agreement is still unsigned. */
export function ComplianceAttentionBadge({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  const businessId = useAppSelector(selectBusinessId)
  const pathname = usePathname()
  const [needsAttention, setNeedsAttention] = useState(false)

  const refresh = useCallback(async () => {
    if (!businessId) {
      setNeedsAttention(false)
      return
    }
    try {
      const business = await fetchBusinessPartnerAgreement(businessId)
      const pa = business.partner_agreement
      const incomplete =
        !pa?.signed ||
        !!pa?.needs_signer_details ||
        !pa?.signed_by_name?.trim() ||
        !pa?.signed_by_role?.trim()
      setNeedsAttention(incomplete)
    } catch {
      /* keep previous state on transient failures */
    }
  }, [businessId])

  useEffect(() => {
    void refresh()
  }, [refresh, pathname])

  useEffect(() => {
    const onUpdate = () => {
      void refresh()
    }
    window.addEventListener(PARTNER_AGREEMENT_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(PARTNER_AGREEMENT_UPDATED_EVENT, onUpdate)
  }, [refresh])

  if (!needsAttention) return null

  if (collapsed) {
    return (
      <span
        className={cn(
          "absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white",
          className
        )}
        aria-label="Agreement needs attention"
      />
    )
  }

  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800",
        className
      )}
    >
      Action
    </span>
  )
}
