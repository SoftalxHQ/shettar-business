import { getAuthToken } from "@/lib/storage"

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")

export type PartnerAgreement = {
  version: string
  signed_at: string | null
  signed_by_name: string | null
  signed_by_role: string | null
  signed: boolean
  needs_signer_details?: boolean
  commission_rate?: number | null
  commission_rate_custom?: boolean
  maximum_withdrawal_commission?: number | null
  primary_contact_name?: string | null
  primary_contact_title?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
}

export type BusinessWithPartnerAgreement = {
  id: number
  name: string
  address?: string | null
  business_unique_id?: string | null
  partner_agreement?: PartnerAgreement
}

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function fetchBusinessPartnerAgreement(
  businessId: string | number
): Promise<BusinessWithPartnerAgreement> {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
    headers: authHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to load business")
  }
  return (data.business || data) as BusinessWithPartnerAgreement
}

export async function acceptPartnerAgreement(
  businessId: string | number,
  payload: { full_name: string; role: string }
): Promise<PartnerAgreement> {
  const res = await fetch(
    `${API_URL}/api/v1/user_businesses/${businessId}/partner_agreement/accept`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        full_name: payload.full_name,
        role: payload.role,
        signer_name: payload.full_name,
        signer_role: payload.role,
      }),
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to accept partner agreement")
  }
  return data.partner_agreement as PartnerAgreement
}

export const PARTNER_AGREEMENT_UPDATED_EVENT = "shettar:partner-agreement-updated"

export function notifyPartnerAgreementUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(PARTNER_AGREEMENT_UPDATED_EVENT))
}
