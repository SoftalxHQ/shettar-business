import { describe, expect, it } from "vitest"
import { buildBookingReceiptHtml, SHETTAR_SITE_URL } from "@/lib/booking-receipt"
import { buildRestaurantOrderReceiptHtml } from "@/lib/restaurant-order-receipt"
import type { RestaurantOrder } from "@/lib/restaurant-api"

const bookingHtml = () =>
  buildBookingReceiptHtml({
    reservation: {
      booking_id: "abc123",
      start_date: "2026-08-26",
      end_date: "2026-08-27",
    },
    business: { name: "Demo Hotel" },
    guestName: "Ada Lovelace",
    paymentMethodLabel: "Cash",
  })

const orderHtml = () =>
  buildRestaurantOrderReceiptHtml({
    order: {
      id: 1,
      order_number: "#1",
      status: "served",
      source: "staff",
      subtotal: 2500,
      items: [],
      created_at: "2026-08-26T12:00:00Z",
      updated_at: "2026-08-26T12:00:00Z",
    } as RestaurantOrder,
    business: { name: "Demo Hotel" },
  })

function expectShettarFooter(html: string) {
  expect(html).toContain("Powered by Shettar")
  expect(html).toContain(SHETTAR_SITE_URL)
  expect(html).toContain("<svg")
  expect(html).toContain("footer-brand-qr")
}

describe("receipt footer brand", () => {
  it("includes the Shettar URL and QR on booking receipts", () => {
    expectShettarFooter(bookingHtml())
  })

  it("includes the Shettar URL and QR on restaurant order receipts", () => {
    expectShettarFooter(orderHtml())
  })
})
