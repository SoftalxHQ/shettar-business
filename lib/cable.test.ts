import { describe, expect, it } from "vitest"
import { CABLE_JWT_PROTOCOL_PREFIX, cableProtocols, isUsableJwt } from "@/lib/cable"

describe("cable JWT subprotocol", () => {
  it("adds jwt.<token> when the token looks like a JWT", () => {
    const token = "abc.def.ghi"
    expect(isUsableJwt(token)).toBe(true)
    expect(cableProtocols(token)).toEqual([
      "actioncable-v1-json",
      "actioncable-unsupported",
      `${CABLE_JWT_PROTOCOL_PREFIX}${token}`,
    ])
  })

  it("omits jwt subprotocol when the token is missing", () => {
    expect(isUsableJwt("")).toBe(false)
    expect(isUsableJwt(null)).toBe(false)
    expect(cableProtocols("")).toEqual(["actioncable-v1-json", "actioncable-unsupported"])
  })
})
