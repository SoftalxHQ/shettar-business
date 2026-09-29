const JWT_FAILURE_IDS = new Set(["expiration", "invalid_token"])
const JWT_FAILURE_MESSAGES = ["Token has expired", "Signature has expired", "revoked token"]

export function isSessionAuthMessage(message: string): boolean {
  return JWT_FAILURE_MESSAGES.some((needle) => message.includes(needle))
}

type FailureBody = {
  status?: { message?: unknown }
  message?: unknown
  errors?: Array<{ id?: unknown; message?: unknown }>
}

/** Devise JWT expiry, invalid, or revoked token — not invalid_business_id or other 401s. */
export async function isDeviseJwtFailure(response: Response): Promise<boolean> {
  try {
    const body = (await response.clone().json()) as FailureBody
    const errors = Array.isArray(body.errors) ? body.errors : []
    if (errors.some((err) => typeof err?.id === "string" && JWT_FAILURE_IDS.has(err.id))) {
      return true
    }

    const messages = [body.status?.message, body.message, ...errors.map((err) => err?.message)].filter(
      (message): message is string => typeof message === "string",
    )

    return messages.some((message) => isSessionAuthMessage(message))
  } catch {
    return false
  }
}
