import { getAuthToken } from "@/lib/storage"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export type AiPointsBalance = {
  free: number
  purchased: number
  total: number
  withdrawable_balance?: number
  config: {
    monthly_free_points: number
    point_price_naira: number
    points_per_request: number
  }
}

export type BusinessAiReport = {
  page: string
  query: string | null
  focused_answer: string
  executive_summary: string
  key_findings: string[]
  trends: string
  risks: string[]
  recommendations: string[]
}

function businessHeaders(businessId: string) {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    "Content-Type": "application/json",
    "X-Business-Id": businessId,
  }
}

export async function fetchAiPoints(businessId: string): Promise<AiPointsBalance> {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ai_points`, {
    headers: businessHeaders(businessId),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "Failed to load AI points")
  }
  const data = await res.json()
  return data.ai_points as AiPointsBalance
}

export async function initializeAiPointsTopup(businessId: string, points: number) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ai_points/initialize_topup`, {
    method: "POST",
    headers: businessHeaders(businessId),
    body: JSON.stringify({ points }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Failed to start AI points purchase")
  return data
}

export async function verifyAiPointsTopup(businessId: string, reference: string) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ai_points/verify_topup`, {
    method: "POST",
    headers: businessHeaders(businessId),
    body: JSON.stringify({ reference }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Payment verification failed")
  return data as { message: string; ai_points: AiPointsBalance; already_processed?: boolean; points?: number }
}

export async function transferAiPointsFromWithdrawable(
  businessId: string,
  points: number,
  otp?: string
) {
  const body: { points: number; otp?: string } = { points }
  if (otp) body.otp = otp

  const res = await fetch(
    `${API_URL}/api/v1/user_businesses/${businessId}/ai_points/transfer_from_withdrawable`,
    {
      method: "POST",
      headers: businessHeaders(businessId),
      body: JSON.stringify(body),
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Transfer failed")
  return data as {
    status?: "otp_required"
    message?: string
    amount?: number
    points?: number
    ai_points?: AiPointsBalance
  }
}

export type AnalyzeAiParams = {
  page: "analytics" | "finance" | "bookings" | "activity"
  query?: string
  start_date?: string
  end_date?: string
  range?: string
  status?: string
  action_type?: string
  transaction_type?: string
  date_from?: string
  date_to?: string
}

export async function runBusinessAiAnalyzer(businessId: string, params: AnalyzeAiParams) {
  const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/ai_analyzer/analyze`, {
    method: "POST",
    headers: businessHeaders(businessId),
    body: JSON.stringify(params),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || "Ops, something went wrong. Please try again shortly.") as Error & {
      code?: string
      ai_points?: AiPointsBalance
      status?: number
    }
    err.code = data.code
    err.ai_points = data.ai_points
    err.status = res.status
    throw err
  }
  return data as {
    report: BusinessAiReport
    points: { points_spent: number; balance: { free: number; purchased: number; total: number } }
    ai_points: AiPointsBalance
  }
}
