import { isTauri, printHtml } from "@/lib/tauri"
import { getAuthToken } from "@/lib/storage"

export const PAYMENT_METHOD_LABELS: Record<number, string> = {
  0: "Wallet",
  1: "Card",
  2: "POS",
  3: "Cash",
  4: "Transfer",
}

export type BookingReceiptBusiness = {
  name?: string
  logo_url?: string
  check_in?: string
  check_out?: string
  address?: string
  city?: string
  state?: string
}

export function businessReceiptContext(
  businessName: string | null | undefined,
  businessDetails: BookingReceiptBusiness | null | undefined
): BookingReceiptBusiness {
  return {
    name: businessName || businessDetails?.name,
    logo_url: businessDetails?.logo_url,
    check_in: businessDetails?.check_in,
    check_out: businessDetails?.check_out,
    address: businessDetails?.address,
    city: businessDetails?.city,
    state: businessDetails?.state,
  }
}

export async function fetchBusinessReceiptDetails(
  businessId: string
): Promise<BookingReceiptBusiness | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      return data as BookingReceiptBusiness
    }
  } catch (error) {
    console.error("Failed to fetch business details:", error)
  }

  return null
}

export type BookingReceiptReservation = {
  booking_id: string
  start_date: string
  end_date: string
  guests?: number
  children?: number
  total_amount?: number
  room_type_name?: string
  room_number?: string | number
  other_email_address?: string
  other_phone_number?: string
  client_email?: string
  client_phone?: string
  checked_in_at?: string
  checked_out_at?: string
  checked_in_by_name?: string
  checked_out_by_name?: string
}

export type BookingReceiptOptions = {
  reservation: BookingReceiptReservation
  business: BookingReceiptBusiness
  guestName: string
  paymentMethodLabel: string
  /** Include room number and actual check-in/out audit fields (scan/checkout flow). */
  detailed?: boolean
  footerMessage?: string
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatTime(timeStr: string | undefined, fallback: string): string {
  if (!timeStr) return fallback
  try {
    if (/am|pm/i.test(timeStr)) return timeStr
    const today = new Date().toISOString().split("T")[0]
    const timeDate = new Date(`${today}T${timeStr.includes("T") ? timeStr.split("T")[1] : timeStr}`)
    if (!isNaN(timeDate.getTime())) {
      return timeDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }
  } catch {
    // fall through
  }
  return timeStr
}

function calcNights(start: string, end: string): number {
  const a = new Date(start)
  const b = new Date(end)
  const nights = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  return nights > 0 ? nights : 1
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

function businessLogoHtml(business: BookingReceiptBusiness): string {
  const name = business.name || "Hotel"
  if (business.logo_url) {
    return `<img src="${escapeHtml(business.logo_url)}" alt="Logo" class="hotel-logo" />`
  }
  return `<div class="hotel-logo-fallback">${escapeHtml(name.charAt(0).toUpperCase())}</div>`
}

/** Ticket-style receipt scaled for 58mm thermal printers. */
export const THERMAL_RECEIPT_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    width: 58mm;
    max-width: 58mm;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #1e293b;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: 58mm auto;
    margin: 2mm 1mm;
  }
  .receipt {
    width: 100%;
    background: #fff;
    overflow: hidden;
  }
  .ticket-header {
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
    color: #fff;
    padding: 10px 8px;
  }
  .ticket-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.8;
    margin-bottom: 3px;
  }
  .ticket-id {
    font-size: 13px;
    font-weight: 900;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: 0.3px;
    word-break: break-all;
  }
  .perforated {
    display: flex;
    gap: 4px;
    padding: 0 6px;
    margin: -5px 0;
    position: relative;
    z-index: 2;
  }
  .perforated-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    flex-shrink: 0;
  }
  .body { padding: 8px 6px 6px; }
  .hotel-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f4f6fb;
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 10px;
  }
  .hotel-logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .hotel-logo-fallback {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(79, 70, 229, 0.12);
    color: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .hotel-name {
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 2px;
    word-break: break-word;
  }
  .hotel-address {
    font-size: 8px;
    color: #64748b;
    line-height: 1.3;
    word-break: break-word;
  }
  .dates-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    background: #f4f6fb;
    border-left: 3px solid #4f46e5;
    border-radius: 8px;
    padding: 8px 6px;
    margin-bottom: 10px;
  }
  .date-col { flex: 1; min-width: 0; }
  .date-col.right { text-align: right; }
  .date-label {
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #4f46e5;
    margin-bottom: 2px;
  }
  .date-value {
    font-size: 8px;
    font-weight: 700;
    margin-bottom: 1px;
    word-break: break-word;
  }
  .date-time {
    font-size: 7px;
    font-weight: 700;
    color: #4f46e5;
  }
  .night-badge {
    text-align: center;
    background: rgba(79, 70, 229, 0.1);
    border-radius: 8px;
    padding: 4px 5px;
    flex-shrink: 0;
  }
  .night-badge-label {
    font-size: 7px;
    font-weight: 800;
    color: #4f46e5;
    white-space: nowrap;
  }
  .section-title {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #64748b;
    margin: 0 0 5px;
  }
  .summary-box {
    background: #f4f6fb;
    border-radius: 8px;
    padding: 7px;
    margin-bottom: 10px;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 5px;
    font-size: 8px;
  }
  .summary-row:last-child { margin-bottom: 0; }
  .summary-label {
    color: #64748b;
    font-weight: 500;
    flex-shrink: 0;
    max-width: 45%;
  }
  .summary-value {
    color: #1e293b;
    font-weight: 600;
    text-align: right;
    word-break: break-word;
    flex: 1;
  }
  .summary-row-total {
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    padding-top: 6px;
    margin-top: 3px;
    margin-bottom: 0;
  }
  .summary-row-total .summary-label {
    color: #1e293b;
    font-size: 9px;
    font-weight: 700;
  }
  .summary-row-total .summary-value {
    color: #4f46e5;
    font-size: 11px;
    font-weight: 900;
  }
  .footer {
    text-align: center;
    padding: 0 6px 8px;
    color: #64748b;
    font-size: 8px;
    line-height: 1.45;
  }
  .footer-brand {
    margin-top: 6px;
    font-size: 7px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 5px;
  }
  @media print {
    html, body {
      width: 58mm;
      max-width: 58mm;
    }
    .receipt { box-shadow: none; }
    .ticket-header {
      background: #4f46e5 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .perforated { display: none; }
  }
`

export function buildBookingReceiptHtml(options: BookingReceiptOptions): string {
  const { reservation, business, guestName, paymentMethodLabel, detailed, footerMessage } = options
  const nights = calcNights(reservation.start_date, reservation.end_date)
  const businessName = business.name || "Reservation Receipt"
  const address = [business.address, business.city, business.state].filter(Boolean).join(", ")
  const email = reservation.client_email || reservation.other_email_address || ""
  const phone = reservation.client_phone || reservation.other_phone_number || ""
  const checkInTime = formatTime(business.check_in, "2:00 PM")
  const checkOutTime = formatTime(business.check_out, "11:00 AM")
  const total = reservation.total_amount != null ? `₦${Number(reservation.total_amount).toLocaleString()}` : "—"
  const guestLine =
    reservation.guests != null
      ? `${reservation.guests} Adult${reservation.guests === 1 ? "" : "s"}${
          reservation.children && reservation.children > 0
            ? `, ${reservation.children} Child${reservation.children === 1 ? "" : "ren"}`
            : ""
        }`
      : ""

  const guestRows = [
    summaryRow("Name", guestName),
    summaryRow("Email", email),
    summaryRow("Phone", phone),
  ].join("")

  const bookingRows = [
    summaryRow("Room Type", reservation.room_type_name),
    detailed ? summaryRow("Room No.", reservation.room_number) : "",
    summaryRow("Guests", guestLine),
    summaryRow("Payment", paymentMethodLabel),
  ].join("")

  const auditRows = detailed
    ? [
        reservation.checked_in_at
          ? summaryRow("Actual Check-in", new Date(reservation.checked_in_at).toLocaleString())
          : "",
        reservation.checked_in_by_name
          ? summaryRow("Checked in by", reservation.checked_in_by_name)
          : "",
        reservation.checked_out_at
          ? summaryRow("Actual Check-out", new Date(reservation.checked_out_at).toLocaleString())
          : "",
        reservation.checked_out_by_name
          ? summaryRow("Checked out by", reservation.checked_out_by_name)
          : "",
      ].join("")
    : ""

  const perforated = Array.from({ length: 16 })
    .map(() => `<div class="perforated-dot"></div>`)
    .join("")

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=58mm, initial-scale=1" />
    <title>Receipt - ${escapeHtml(reservation.booking_id)}</title>
    <style>${THERMAL_RECEIPT_STYLES}</style>
  </head>
  <body>
    <div class="receipt">
      <div class="ticket-header">
        <div class="ticket-label">Reservation Number</div>
        <div class="ticket-id">${escapeHtml(reservation.booking_id)}</div>
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

        <div class="dates-strip">
          <div class="date-col">
            <div class="date-label">Check-in</div>
            <div class="date-value">${escapeHtml(formatDate(reservation.start_date))}</div>
            <div class="date-time">${escapeHtml(checkInTime)}</div>
          </div>
          <div class="night-badge">
            <div class="night-badge-label">${nights} ${nights === 1 ? "Night" : "Nights"}</div>
          </div>
          <div class="date-col right">
            <div class="date-label">Check-out</div>
            <div class="date-value">${escapeHtml(formatDate(reservation.end_date))}</div>
            <div class="date-time">${escapeHtml(checkOutTime)}</div>
          </div>
        </div>

        <h3 class="section-title">Guest Information</h3>
        <div class="summary-box">${guestRows}</div>

        <h3 class="section-title">Booking Summary</h3>
        <div class="summary-box">
          ${bookingRows}
          ${summaryRow("Total Paid", total, true)}
        </div>

        ${
          auditRows
            ? `<h3 class="section-title">Stay Record</h3><div class="summary-box">${auditRows}</div>`
            : ""
        }
      </div>

      <div class="footer">
        <p>${escapeHtml(footerMessage || "Thank you for staying with us!")}</p>
        <p>Printed on ${escapeHtml(new Date().toLocaleString())}</p>
        <div class="footer-brand">Powered by Shettar</div>
      </div>
    </div>
  </body>
</html>`
}

export function printBookingReceipt(html: string): void {
  printThermalReceipt(html)
}

export function printThermalReceipt(html: string): void {
  if (isTauri()) {
    void printHtml(html)
    return
  }

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "none"
  iframe.style.visibility = "hidden"
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const triggerPrint = () => {
    try {
      win?.focus()
      win?.print()
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1000)
    }
  }

  const images = Array.from(doc.images)
  if (images.length === 0) {
    setTimeout(triggerPrint, 200)
    return
  }

  void Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  ).then(() => setTimeout(triggerPrint, 200))
}
