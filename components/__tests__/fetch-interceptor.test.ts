import { describe, expect, it } from "vitest"
import { isDeviseJwtFailure } from "@/lib/devise-jwt-failure"

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("isDeviseJwtFailure", () => {
  it("matches Devise JWT expiration", async () => {
    const response = jsonResponse(401, {
      status: { code: 401, message: "Token has expired" },
      errors: [{ id: "expiration", status: 401, message: "Token has expired" }],
    })
    expect(await isDeviseJwtFailure(response)).toBe(true)
    expect(await response.json()).toMatchObject({ status: { message: "Token has expired" } })
  })

  it("matches invalid_token and Signature has expired", async () => {
    expect(
      await isDeviseJwtFailure(
        jsonResponse(401, {
          errors: [{ id: "invalid_token", message: "Invalid session" }],
        }),
      ),
    ).toBe(true)
    expect(
      await isDeviseJwtFailure(jsonResponse(401, { status: { message: "Signature has expired" } })),
    ).toBe(true)
  })

  it("does not treat invalid_business_id as session expiry", async () => {
    expect(
      await isDeviseJwtFailure(
        jsonResponse(401, { error: "Invalid business ID", code: "invalid_business_id" }),
      ),
    ).toBe(false)
  })
})
