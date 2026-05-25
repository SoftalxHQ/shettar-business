"use client"

import { Building2, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BookingReceiptBusiness, BookingReceiptReservation } from "@/lib/booking-receipt"

type Props = {
  reservation: BookingReceiptReservation
  business: BookingReceiptBusiness
  guestName: string
  paymentMethodLabel: string
  detailed?: boolean
  className?: string
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
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
  const nights = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  )
  return nights > 0 ? nights : 1
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string
  value?: string | number | null
  bold?: boolean
}) {
  const text = value == null ? "" : String(value).trim()
  if (!text) return null
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm",
        bold && "border-t border-slate-200 pt-3 mt-1"
      )}
    >
      <span className={cn("text-slate-500", bold && "text-slate-800 font-semibold text-base")}>
        {label}
      </span>
      <span
        className={cn(
          "font-semibold text-slate-800 text-right",
          bold && "text-indigo-600 text-2xl font-black"
        )}
      >
        {text}
      </span>
    </div>
  )
}

export function BookingReceiptCard({
  reservation,
  business,
  guestName,
  paymentMethodLabel,
  detailed,
  className,
}: Props) {
  const nights = calcNights(reservation.start_date, reservation.end_date)
  const address = [business.address, business.city, business.state].filter(Boolean).join(", ")
  const email = reservation.client_email || reservation.other_email_address
  const phone = reservation.client_phone || reservation.other_phone_number
  const total =
    reservation.total_amount != null
      ? `₦${Number(reservation.total_amount).toLocaleString()}`
      : "—"
  const guestLine =
    reservation.guests != null
      ? `${reservation.guests} Adult${reservation.guests === 1 ? "" : "s"}${
          reservation.children && reservation.children > 0
            ? `, ${reservation.children} Child${reservation.children === 1 ? "" : "ren"}`
            : ""
        }`
      : null

  return (
    <div className={cn("rounded-[22px] overflow-hidden bg-white shadow-lg border border-slate-100", className)}>
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-5 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 mb-1">
          Reservation Number
        </p>
        <p className="text-2xl font-black font-mono tracking-wide">{reservation.booking_id}</p>
      </div>

      <div className="flex gap-2 px-4 -mt-2.5 relative z-[1]">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="w-5 h-5 rounded-full bg-slate-50 shrink-0" />
        ))}
      </div>

      <div className="p-5 pt-3 space-y-5">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo_url}
              alt=""
              className="w-12 h-12 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 truncate">{business.name || "Hotel"}</p>
            {address ? <p className="text-xs text-slate-500 truncate">{address}</p> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 border-l-4 border-indigo-600 p-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-600 mb-1">
              Check-in
            </p>
            <p className="text-sm font-bold text-slate-900">{formatDate(reservation.start_date)}</p>
            <p className="text-xs font-bold text-indigo-600">
              {formatTime(business.check_in, "2:00 PM")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2">
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-extrabold text-indigo-600">
              {nights} {nights === 1 ? "Night" : "Nights"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-600 mb-1">
              Check-out
            </p>
            <p className="text-sm font-bold text-slate-900">{formatDate(reservation.end_date)}</p>
            <p className="text-xs font-bold text-indigo-600">
              {formatTime(business.check_out, "11:00 AM")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Guest Information
          </p>
          <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2.5">
            <SummaryRow label="Name" value={guestName} />
            <SummaryRow label="Email" value={email} />
            <SummaryRow label="Phone" value={phone} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Booking Summary
          </p>
          <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2.5">
            <SummaryRow label="Room Type" value={reservation.room_type_name} />
            {detailed ? <SummaryRow label="Room No." value={reservation.room_number} /> : null}
            <SummaryRow label="Guests" value={guestLine} />
            <SummaryRow label="Payment" value={paymentMethodLabel} />
            <SummaryRow label="Total Paid" value={total} bold />
          </div>
        </div>

        {detailed &&
        (reservation.checked_in_at ||
          reservation.checked_out_at ||
          reservation.checked_in_by_name ||
          reservation.checked_out_by_name) ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Stay Record
            </p>
            <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2.5">
              {reservation.checked_in_at ? (
                <SummaryRow
                  label="Actual Check-in"
                  value={new Date(reservation.checked_in_at).toLocaleString()}
                />
              ) : null}
              <SummaryRow label="Checked in by" value={reservation.checked_in_by_name} />
              {reservation.checked_out_at ? (
                <SummaryRow
                  label="Actual Check-out"
                  value={new Date(reservation.checked_out_at).toLocaleString()}
                />
              ) : null}
              <SummaryRow label="Checked out by" value={reservation.checked_out_by_name} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
