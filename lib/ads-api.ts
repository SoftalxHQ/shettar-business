import { getAuthToken } from "@/lib/storage"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export type AdAccount = {
  ads_balance: number
  lifetime_spend: number
  status: string
  withdrawable_balance: number
}

export type AdGeoTarget = {
  country?: string
  state?: string
  city?: string
}

export type AdCampaign = {
  id: number
  name: string
  status: string
  billing_model: string
  daily_budget?: number
  total_budget?: number
  spent_amount: number
  max_bid: number
  starts_at?: string
  ends_at?: string
  placements: string[]
  complimentary: boolean
  quality_score: number
  rejection_reason?: string
  target_geo?: AdGeoTarget[]
  target_locations?: string[]
}

export type BusinessLocation = {
  city: string
  state: string
  display: string
}

export function formatGeoTargets(targets?: AdGeoTarget[]): string {
  if (!targets?.length) return "Nationwide (Nigeria)"
  return targets
    .map((t) => {
      if (t.city && t.state) return `${t.city}, ${t.state}`
      if (t.state) return t.state
      return t.country || "Nigeria"
    })
    .join("; ")
}

export async function fetchBusinessLocations(): Promise<BusinessLocation[]> {
  const res = await fetch(`${API_URL}/api/v1/businesses/locations`)
  if (!res.ok) throw new Error("Failed to load locations")
  return res.json()
}

function businessHeaders(businessId: string) {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    "Content-Type": "application/json",
    "X-Business-Id": businessId,
  }
}

export async function fetchAdAccount(businessId: string) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_account`, {
    headers: businessHeaders(businessId),
  })
  if (!res.ok) throw new Error("Failed to load ads account")
  const data = await res.json()
  return data.ad_account as AdAccount
}

export async function fetchAdCampaigns(businessId: string) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_campaigns`, {
    headers: businessHeaders(businessId),
  })
  if (!res.ok) throw new Error("Failed to load campaigns")
  const data = await res.json()
  return (data.campaigns || []) as AdCampaign[]
}

export async function fetchAdCampaign(businessId: string, campaignId: string) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_campaigns/${campaignId}`, {
    headers: businessHeaders(businessId),
  })
  if (!res.ok) throw new Error("Failed to load campaign")
  const data = await res.json()
  return data.campaign as AdCampaign
}

export async function fetchCampaignStats(businessId: string, campaignId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const res = await fetch(
    `${API_URL}/api/v1/user_businesses/${businessId}/ad_campaigns/${campaignId}/stats?${params}`,
    { headers: businessHeaders(businessId) }
  )
  if (!res.ok) throw new Error("Failed to load stats")
  return res.json()
}

export async function createAdCampaign(businessId: string, campaign: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_campaigns`, {
    method: "POST",
    headers: businessHeaders(businessId),
    body: JSON.stringify({ campaign }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create campaign")
  return data.campaign as AdCampaign
}

export async function updateAdCampaign(
  businessId: string,
  campaignId: string,
  payload: Record<string, unknown>
) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_campaigns/${campaignId}`, {
    method: "PATCH",
    headers: businessHeaders(businessId),
    body: JSON.stringify({ campaign: payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update campaign")
  return data.campaign as AdCampaign
}

export async function transferToAdsWallet(businessId: string, amount: number) {
  const res = await fetch(
    `${API_URL}/api/v1/user_businesses/${businessId}/ad_account/transfer_from_withdrawable`,
    {
      method: "POST",
      headers: businessHeaders(businessId),
      body: JSON.stringify({ amount }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Transfer failed")
  return data.ad_account as AdAccount
}

export async function initializeAdsTopup(
  businessId: string,
  amount: number,
  paymentMethod: "card" | "dva" = "card"
) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_account/initialize_topup`, {
    method: "POST",
    headers: businessHeaders(businessId),
    body: JSON.stringify({ amount, payment_method: paymentMethod }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to initialize top-up")
  return data
}

export async function verifyAdsTopup(businessId: string, reference: string) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ad_account/verify_topup`, {
    method: "POST",
    headers: businessHeaders(businessId),
    body: JSON.stringify({ reference }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Verification failed")
  return data as { message?: string; ad_account: AdAccount }
}
