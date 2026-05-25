import type { RestaurantOrder } from "@/lib/restaurant-api"
import {
  BookingReceiptBusiness,
  THERMAL_RECEIPT_STYLES,
  printThermalReceipt,
} from "@/lib/booking-receipt"

export type RestaurantOrderReceiptOptions = {
  order: RestaurantOrder
  business: BookingReceiptBusiness
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partial refund",
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  wallet: "Wallet",
  card: "Card",
  offline: "Offline",
}

const ORDER_RECEIPT_EXTRA_STYLES = `
  .meta-strip {
    background: #f4f6fb;
    border-left: 3px solid #4f46e5;
    border-radius: 8px;
    padding: 8px 6px;
    margin-bottom: 10px;
  }
  .meta-line {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    font-size: 8px;
    margin-bottom: 3px;
  }
  .meta-line:last-child { margin-bottom: 0; }
  .meta-label {
    color: #64748b;
    font-weight: 600;
    flex-shrink: 0;
  }
  .meta-value {
    font-weight: 700;
    text-align: right;
    word-break: break-word;
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 5px;
    font-size: 8px;
  }
  .item-row:last-child { margin-bottom: 0; }
  .item-name {
    flex: 1;
    word-break: break-word;
    font-weight: 600;
  }
  .item-amount {
    flex-shrink: 0;
    font-weight: 700;
    text-align: right;
  }
`

function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function displayValue(value: string | number | null | undefined): string {
  if (value == null) return ""
  return String(value).trim()
}

function summaryRow(
  label: string,
  value: string | number | null | undefined,
  bold = false
): string {
  const text = displayValue(value)
  if (!text) return ""
  return `
    <div class="summary-row${bold ? " summary-row-total" : ""}">
      <span class="summary-label">${escapeHtml(label)}</span>
      <span class="summary-value">${escapeHtml(text)}</span>
    </div>
  `
}

function metaLine(label: string, value: string | number | null | undefined): string {
  const text = displayValue(value)
  if (!text) return ""
  return `
    <div class="meta-line">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(text)}</span>
    </div>
  `
}

function businessLogoHtml(business: BookingReceiptBusiness): string {
  const name = business.name || "Restaurant"
  if (business.logo_url) {
    return `<img src="${escapeHtml(business.logo_url)}" alt="Logo" class="hotel-logo" />`
  }
  return `<div class="hotel-logo-fallback">${escapeHtml(name.charAt(0).toUpperCase())}</div>`
}

function orderLocation(order: RestaurantOrder): string | null {
  if (order.table_label) return `Table ${order.table_label}`
  const room = order.room_number || order.room_label
  if (room) return `Room ${room}`
  return null
}

function formatOrderNumber(order: RestaurantOrder): string {
  return (order.order_number || `#${order.id}`).replace(/\s+/g, "")
}

function paymentMethodLabel(method?: string | null): string | null {
  if (!method) return null
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] || method
}

export function buildRestaurantOrderReceiptHtml(options: RestaurantOrderReceiptOptions): string {
  const { order, business } = options
  const businessName = business.name || "Restaurant Order"
  const address = [business.address, business.city, business.state].filter(Boolean).join(", ")
  const location = orderLocation(order)
  const orderNumber = formatOrderNumber(order)
  const statusLabel = STATUS_LABELS[order.status] || order.status
  const paymentStatusLabel =
    PAYMENT_STATUS_LABELS[order.payment_status || "unpaid"] || order.payment_status || "Unpaid"
  const methodLabel = paymentMethodLabel(order.payment_method)
  const sourceLabel = order.source === "guest" ? "Guest app" : "Staff"

  const itemRows = (order.items || [])
    .map(
      (item) => `
      <div class="item-row">
        <span class="item-name">${escapeHtml(item.quantity)}× ${escapeHtml(item.name)}${item.notes?.trim() ? `<br /><span style="font-size:9px;font-weight:400;color:#64748b;font-style:italic;">↳ ${escapeHtml(item.notes.trim())}</span>` : ""}</span>
        <span class="item-amount">₦${Number(item.line_total).toLocaleString()}</span>
      </div>
    `
    )
    .join("")

  const metaRows = [
    metaLine("Type", order.table_label ? "Dine-in / Table" : location ? "Room service" : "Restaurant"),
    metaLine("Location", location),
    metaLine("Guest", order.guest_name),
    metaLine("Booking", order.booking_id),
    metaLine("Status", statusLabel),
    metaLine("Payment", paymentStatusLabel),
    methodLabel ? metaLine("Method", methodLabel) : "",
    metaLine("Source", sourceLabel),
    metaLine("Placed by", order.placed_by_name),
    metaLine("Time", new Date(order.created_at).toLocaleString()),
  ].join("")

  const perforated = Array.from({ length: 16 })
    .map(() => `<div class="perforated-dot"></div>`)
    .join("")

  const amountDue =
    order.amount_due != null && order.amount_due > 0
      ? `₦${Number(order.amount_due).toLocaleString()}`
      : null
  const amountPaid =
    order.amount_paid != null && order.amount_paid > 0
      ? `₦${Number(order.amount_paid).toLocaleString()}`
      : null

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=58mm, initial-scale=1" />
    <title>Order - ${escapeHtml(orderNumber)}</title>
    <style>${THERMAL_RECEIPT_STYLES}${ORDER_RECEIPT_EXTRA_STYLES}</style>
  </head>
  <body>
    <div class="receipt">
      <div class="ticket-header">
        <div class="ticket-label">Order Number</div>
        <div class="ticket-id">${escapeHtml(orderNumber)}</div>
      </div>

      <div class="perforated">${perforated}</div>

      <div class="body">
        <div class="hotel-row">
          ${businessLogoHtml(business)}
          <div>
            <div class="hotel-name">${escapeHtml(businessName)}</div>
            ${address ? `<div class="hotel-address">${escapeHtml(address)}</div>` : ""}
          </div>
        </div>

        <div class="meta-strip">${metaRows}</div>

        <h3 class="section-title">Order Items</h3>
        <div class="summary-box">${itemRows || `<p class="meta-value">No items</p>`}</div>

        <h3 class="section-title">Totals</h3>
        <div class="summary-box">
          ${order.refunded_amount && Number(order.refunded_amount) > 0 ? summaryRow("Refunded", `₦${Number(order.refunded_amount).toLocaleString()}`) : ""}
          ${amountPaid ? summaryRow("Amount paid", amountPaid) : ""}
          ${amountDue ? summaryRow("Amount due", amountDue) : ""}
          ${summaryRow("Total", `₦${Number(order.subtotal).toLocaleString()}`, true)}
        </div>

        ${order.notes ? `<h3 class="section-title">Notes</h3><div class="summary-box">${summaryRow("Note", order.notes)}</div>` : ""}
      </div>

      <div class="footer">
        <p>Thank you!</p>
        <p>Printed on ${escapeHtml(new Date().toLocaleString())}</p>
        <div class="footer-brand">Powered by Shettar</div>
      </div>
    </div>
  </body>
</html>`
}

export function printRestaurantOrderReceipt(options: RestaurantOrderReceiptOptions): void {
  printThermalReceipt(buildRestaurantOrderReceiptHtml(options))
}

export function orderLocationLabel(order: RestaurantOrder): string | null {
  return orderLocation(order)
}
