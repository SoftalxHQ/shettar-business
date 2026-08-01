import { describe, expect, it } from "vitest"
import { compareSemver } from "@/lib/hooks/useUpdater"

describe("compareSemver", () => {
  it("orders dotted versions", () => {
    expect(compareSemver("0.1.49", "0.1.48")).toBeGreaterThan(0)
    expect(compareSemver("0.1.48", "0.1.49")).toBeLessThan(0)
    expect(compareSemver("0.1.48", "0.1.48")).toBe(0)
  })

  it("ignores v prefix and channel suffix", () => {
    expect(compareSemver("v0.1.49-staging", "0.1.48")).toBeGreaterThan(0)
    expect(compareSemver("0.1.49-production", "v0.1.49")).toBe(0)
  })
})
