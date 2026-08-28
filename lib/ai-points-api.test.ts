import { describe, expect, it, vi } from "vitest"
import { AI_POINTS_BALANCE_EVENT, emitAiPointsBalanceChanged, type AiPointsBalance } from "@/lib/ai-points-api"

const sampleBalance: AiPointsBalance = {
  free: 2,
  purchased: 3,
  total: 5,
  config: {
    monthly_free_points: 5,
    point_price_naira: 50,
    points_per_request: 1,
  },
}

describe("emitAiPointsBalanceChanged", () => {
  it("dispatches the shared balance event", () => {
    const listener = vi.fn()
    window.addEventListener(AI_POINTS_BALANCE_EVENT, listener)
    emitAiPointsBalanceChanged(sampleBalance)
    window.removeEventListener(AI_POINTS_BALANCE_EVENT, listener)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent)
    expect((listener.mock.calls[0][0] as CustomEvent<AiPointsBalance>).detail).toEqual(sampleBalance)
  })
})
