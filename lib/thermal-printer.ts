/**
 * ESC/POS thermal printing — TypeScript builds receipt ops that mirror the
 * HTML receipt design; Rust turns them into printer bytes.
 */

import type { BookingReceiptOptions } from "@/lib/booking-receipt"
import type { RestaurantOrderReceiptOptions } from "@/lib/restaurant-order-receipt"
import type { RestaurantOrder } from "@/lib/restaurant-api"
import { isTauri } from "@/lib/tauri"

export const PRINTER_STORAGE_KEY = "shettar_printer"

export type PrinterInfo = {
  name: string
  port: string
  printer_type: string
}

export type PrinterPreference = {
  printer: PrinterInfo
  /** Characters per line: 32 for 58mm, 48 for 80mm. */
  width: 32 | 48
}

export type PrintOp =
  | {
      op: "text"
      content: string
      align?: "left" | "center" | "right"
      bold?: boolean
      size?: "normal" | "tall" | "large"
      /** White-on-black ticket header band. */
      reverse?: boolean
      /** Pad to full line width (use with reverse). */
      fill?: boolean
    }
  | { op: "two_col"; left: string; right: string; bold?: boolean }
  | { op: "divider"; char?: string }
  | { op: "perforation" }
  | { op: "feed"; lines?: number }
  | { op: "qr_code"; data: string }
  | { op: "cut" }
  | { op: "open_drawer" }

/** Money for thermal printers — ₦ often missing from printer code pages. */
export function formatThermalMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—"
  return `NGN ${Number(amount).toLocaleString()}`
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
    // Parse HH:MM directly to avoid timezone shifts from `new Date(...)`.
    const raw = timeStr.includes("T") ? timeStr.split("T")[1] : timeStr
    const match = raw.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return timeStr

    const h = Number(match[1])
    const m = match[2]
    if (Number.isNaN(h)) return timeStr

    const ampm = h >= 12 ? "PM" : "AM"
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return `${hour12}:${m} ${ampm}`
  } catch {
    // fall through
  }
  return timeStr
}

function calcNights(start: string, end: string): number {
  const startDatePart = String(start).match(/^(\d{4}-\d{2}-\d{2})/)
  const endDatePart = String(end).match(/^(\d{4}-\d{2}-\d{2})/)

  const a = startDatePart ? new Date(`${startDatePart[1]}T00:00:00Z`) : new Date(start)
  const b = endDatePart ? new Date(`${endDatePart[1]}T00:00:00Z`) : new Date(end)

  const aTime = a.getTime()
  const bTime = b.getTime()
  if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 1

  const diffDays = Math.round((bTime - aTime) / 86_400_000)
  return diffDays > 0 ? diffDays : 1
}

function pushTwoCol(
  ops: PrintOp[],
  left: string,
  right: string | number | null | undefined,
  bold = false
) {
  const value = right == null ? "" : String(right).trim()
  if (!value) return
  ops.push({ op: "two_col", left, right: value, bold })
}

function pushSectionTitle(ops: PrintOp[], title: string) {
  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "text", content: title.toUpperCase(), bold: true, align: "left" })
  ops.push({ op: "divider", char: "-" })
}

/** Dark ticket header band — mirrors the indigo HTML/card header. */
function pushTicketHeader(ops: PrintOp[], label: string, value: string) {
  ops.push({
    op: "text",
    content: " ",
    align: "center",
    reverse: true,
    fill: true,
  })
  ops.push({
    op: "text",
    content: label.toUpperCase(),
    align: "center",
    bold: true,
    reverse: true,
    fill: true,
  })
  ops.push({
    op: "text",
    content: value,
    align: "center",
    bold: true,
    // Tall (double height) — not large — so reverse fill still spans the full paper width.
    size: "tall",
    reverse: true,
    fill: true,
  })
  ops.push({
    op: "text",
    content: " ",
    align: "center",
    reverse: true,
    fill: true,
  })
  ops.push({ op: "perforation" })
  ops.push({ op: "feed", lines: 1 })
}

export function getSavedPrinterPreference(): PrinterPreference | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PRINTER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PrinterPreference
    if (!parsed?.printer?.port || !parsed?.printer?.printer_type) return null
    const width = parsed.width === 48 ? 48 : 32
    return { printer: parsed.printer, width }
  } catch {
    return null
  }
}

export function savePrinterPreference(preference: PrinterPreference | null): void {
  if (typeof window === "undefined") return
  if (!preference) {
    localStorage.removeItem(PRINTER_STORAGE_KEY)
    return
  }
  localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(preference))
}

export function hasConfiguredThermalPrinter(): boolean {
  return isTauri() && getSavedPrinterPreference() != null
}

/** Convert booking receipt options into ESC/POS ops matching the HTML ticket design. */
export function bookingReceiptToOps(
  options: BookingReceiptOptions,
  _width: number = 32
): PrintOp[] {
  const { reservation, business, guestName, paymentMethodLabel, detailed, footerMessage } =
    options
  const nights = calcNights(reservation.start_date, reservation.end_date)
  const businessName = business.name || "Reservation Receipt"
  const address = [business.address, business.city, business.state].filter(Boolean).join(", ")
  const email = reservation.client_email || reservation.other_email_address || ""
  const phone = reservation.client_phone || reservation.other_phone_number || ""
  const checkInTime = formatTime(business.check_in, "2:00 PM")
  const checkOutTime = formatTime(business.check_out, "11:00 AM")
  const total =
    reservation.total_amount != null
      ? formatThermalMoney(reservation.total_amount)
      : "—"
  const guestLine =
    reservation.guests != null
      ? `${reservation.guests} Adult${reservation.guests === 1 ? "" : "s"}${
          reservation.children && reservation.children > 0
            ? `, ${reservation.children} Child${reservation.children === 1 ? "" : "ren"}`
            : ""
        }`
      : ""

  const ops: PrintOp[] = []

  // ── Header (indigo band on HTML / card) ──────────────────────────────────
  pushTicketHeader(ops, "Reservation Number", reservation.booking_id)

  // ── Hotel block ──────────────────────────────────────────────────────────
  ops.push({ op: "text", content: businessName, align: "center", bold: true, size: "tall" })
  if (address) {
    ops.push({ op: "text", content: address, align: "center" })
  }
  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "divider", char: "-" })

  // ── Dates strip (check-in | nights | check-out) ──────────────────────────
  ops.push({ op: "text", content: "CHECK-IN", align: "left", bold: true })
  ops.push({
    op: "text",
    content: `${formatDate(reservation.start_date)}  ${checkInTime}`,
    align: "left",
  })
  ops.push({
    op: "text",
    content: `${nights} ${nights === 1 ? "NIGHT" : "NIGHTS"}`,
    align: "center",
    bold: true,
  })
  ops.push({ op: "text", content: "CHECK-OUT", align: "right", bold: true })
  ops.push({
    op: "text",
    content: `${formatDate(reservation.end_date)}  ${checkOutTime}`,
    align: "right",
  })
  ops.push({ op: "divider", char: "-" })

  // ── Guest Information ────────────────────────────────────────────────────
  pushSectionTitle(ops, "Guest Information")
  pushTwoCol(ops, "Name", guestName)
  pushTwoCol(ops, "Email", email)
  pushTwoCol(ops, "Phone", phone)

  // ── Booking Summary ──────────────────────────────────────────────────────
  pushSectionTitle(ops, "Booking Summary")
  pushTwoCol(ops, "Room Type", reservation.room_type_name)
  if (detailed) {
    pushTwoCol(ops, "Room No.", reservation.room_number)
  }
  pushTwoCol(ops, "Guests", guestLine)
  pushTwoCol(ops, "Payment", paymentMethodLabel)
  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "text", content: "TOTAL PAID", align: "left", bold: true })
  ops.push({
    op: "text",
    content: total,
    align: "right",
    bold: true,
    size: "large",
  })
  ops.push({ op: "divider", char: "=" })

  // ── Stay Record (detailed) ───────────────────────────────────────────────
  if (detailed) {
    const hasAudit =
      reservation.checked_in_at ||
      reservation.checked_in_by_name ||
      reservation.checked_out_at ||
      reservation.checked_out_by_name
    if (hasAudit) {
      pushSectionTitle(ops, "Stay Record")
      if (reservation.checked_in_at) {
        pushTwoCol(ops, "Actual Check-in", new Date(reservation.checked_in_at).toLocaleString())
      }
      if (reservation.checked_in_by_name) {
        pushTwoCol(ops, "Checked in by", reservation.checked_in_by_name)
      }
      if (reservation.checked_out_at) {
        pushTwoCol(ops, "Actual Check-out", new Date(reservation.checked_out_at).toLocaleString())
      }
      if (reservation.checked_out_by_name) {
        pushTwoCol(ops, "Checked out by", reservation.checked_out_by_name)
      }
      ops.push({ op: "divider", char: "-" })
    }
  }

  // ── QR + footer ──────────────────────────────────────────────────────────
  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "qr_code", data: reservation.booking_id })
  ops.push({ op: "feed", lines: 1 })
  ops.push({
    op: "text",
    content: footerMessage || "Thank you for staying with us!",
    align: "center",
  })
  ops.push({
    op: "text",
    content: `Printed on ${new Date().toLocaleString()}`,
    align: "center",
  })
  ops.push({ op: "text", content: "Powered by Shettar", align: "center" })
  ops.push({ op: "cut" })

  return ops
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

function orderLocation(order: RestaurantOrder): string | null {
  if (order.table_label) return `Table ${order.table_label}`
  const room = order.room_number || order.room_label
  if (room) return `Room ${room}`
  return null
}

function formatOrderNumber(order: RestaurantOrder): string {
  return (order.order_number || `#${order.id}`).replace(/\s+/g, "")
}

/** Convert restaurant order receipt into ESC/POS ops matching HTML layout. */
export function restaurantOrderReceiptToOps(
  options: RestaurantOrderReceiptOptions,
  _width: number = 32
): PrintOp[] {
  const { order, business } = options
  const businessName = business.name || "Restaurant Order"
  const address = [business.address, business.city, business.state].filter(Boolean).join(", ")
  const location = orderLocation(order)
  const orderNumber = formatOrderNumber(order)
  const statusLabel = STATUS_LABELS[order.status] || order.status
  const paymentStatusLabel =
    PAYMENT_STATUS_LABELS[order.payment_status || "unpaid"] || order.payment_status || "Unpaid"
  const method =
    order.payment_method
      ? PAYMENT_METHOD_LABELS[order.payment_method.toLowerCase()] || order.payment_method
      : null
  const sourceLabel = order.source === "guest" ? "Guest app" : "Staff"
  const orderType = order.table_label
    ? "Dine-in / Table"
    : location
      ? "Room service"
      : "Restaurant"

  const ops: PrintOp[] = []

  pushTicketHeader(ops, "Order Number", orderNumber)

  ops.push({ op: "text", content: businessName, align: "center", bold: true, size: "tall" })
  if (address) {
    ops.push({ op: "text", content: address, align: "center" })
  }
  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "divider", char: "-" })

  pushTwoCol(ops, "Type", orderType)
  pushTwoCol(ops, "Location", location)
  pushTwoCol(ops, "Guest", order.guest_name)
  pushTwoCol(ops, "Booking", order.booking_id)
  pushTwoCol(ops, "Status", statusLabel)
  pushTwoCol(ops, "Payment", paymentStatusLabel)
  if (method) pushTwoCol(ops, "Method", method)
  pushTwoCol(ops, "Source", sourceLabel)
  pushTwoCol(ops, "Placed by", order.placed_by_name)
  pushTwoCol(ops, "Time", new Date(order.created_at).toLocaleString())

  pushSectionTitle(ops, "Order Items")
  const items = order.items || []
  if (items.length === 0) {
    ops.push({ op: "text", content: "No items" })
  } else {
    for (const item of items) {
      ops.push({
        op: "text",
        content: `${item.quantity}x ${item.name}`,
        bold: true,
      })
      if (item.notes?.trim()) {
        ops.push({ op: "text", content: `  -> ${item.notes.trim()}` })
      }
      ops.push({
        op: "text",
        content: formatThermalMoney(item.line_total),
        align: "right",
      })
    }
  }

  pushSectionTitle(ops, "Totals")
  if (order.refunded_amount && Number(order.refunded_amount) > 0) {
    pushTwoCol(ops, "Refunded", formatThermalMoney(order.refunded_amount))
  }
  if (order.amount_paid != null && order.amount_paid > 0) {
    pushTwoCol(ops, "Amount paid", formatThermalMoney(order.amount_paid))
  }
  if (order.amount_due != null && order.amount_due > 0) {
    pushTwoCol(ops, "Amount due", formatThermalMoney(order.amount_due))
  }
  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "text", content: "TOTAL", align: "left", bold: true })
  ops.push({
    op: "text",
    content: formatThermalMoney(order.subtotal),
    align: "right",
    bold: true,
    size: "large",
  })
  ops.push({ op: "divider", char: "=" })

  if (order.notes) {
    pushSectionTitle(ops, "Notes")
    pushTwoCol(ops, "Note", order.notes)
    ops.push({ op: "divider", char: "-" })
  }

  ops.push({ op: "feed", lines: 1 })
  ops.push({ op: "text", content: "Thank you!", align: "center" })
  ops.push({
    op: "text",
    content: `Printed on ${new Date().toLocaleString()}`,
    align: "center",
  })
  ops.push({ op: "text", content: "Powered by Shettar", align: "center" })
  ops.push({ op: "cut" })

  return ops
}

export async function invokePrintOps(
  preference: PrinterPreference,
  ops: PrintOp[]
): Promise<void> {
  if (!isTauri()) {
    throw new Error("Thermal printing is only available in the desktop app")
  }
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("print_ops", {
    port: preference.printer.port,
    printerType: preference.printer.printer_type,
    width: preference.width,
    ops,
  })
}

/** Print a pre-rendered 1-bit receipt raster (pixel-exact ticket design). */
export async function invokePrintImage(
  preference: PrinterPreference,
  raster: { widthPx: number; heightPx: number; data: string }
): Promise<void> {
  if (!isTauri()) {
    throw new Error("Thermal printing is only available in the desktop app")
  }
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("print_image", {
    port: preference.printer.port,
    printerType: preference.printer.printer_type,
    widthPx: raster.widthPx,
    heightPx: raster.heightPx,
    data: raster.data,
  })
}

export async function discoverPrinters(): Promise<PrinterInfo[]> {
  if (!isTauri()) return []
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<PrinterInfo[]>("get_printers")
}

export async function invokeTestPrint(preference: PrinterPreference): Promise<void> {
  if (!isTauri()) {
    throw new Error("Thermal printing is only available in the desktop app")
  }
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("test_print", {
    port: preference.printer.port,
    printerType: preference.printer.printer_type,
    width: preference.width,
  })
}

export async function invokeOpenCashDrawer(preference: PrinterPreference): Promise<void> {
  if (!isTauri()) {
    throw new Error("Thermal printing is only available in the desktop app")
  }
  const { invoke } = await import("@tauri-apps/api/core")
  await invoke("open_cash_drawer", {
    port: preference.printer.port,
    printerType: preference.printer.printer_type,
  })
}
