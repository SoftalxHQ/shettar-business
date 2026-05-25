/** Mirrors API masking: center 5 chars replaced with *****. */
export function maskBookingId(code: string | null | undefined): string {
  const str = (code ?? "").trim();
  if (!str || str.length <= 5) return str;
  const maskStart = Math.floor((str.length - 5) / 2);
  return `${str.slice(0, maskStart)}*****${str.slice(maskStart + 5)}`;
}

export type BookingIdDisplayInput = {
  booking_id?: string | null;
  booking_id_revealed?: boolean;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
};

/** Prefer API `booking_id` (already masked when needed). Fallback for legacy payloads. */
export function displayBookingId(
  reservation: BookingIdDisplayInput,
  fullBookingId?: string | null
): string {
  if (reservation.booking_id) return reservation.booking_id;
  const full = fullBookingId ?? reservation.booking_id;
  if (!full) return "—";
  if (reservation.booking_id_revealed || reservation.checked_in_at || reservation.checked_out_at) {
    return full;
  }
  return maskBookingId(full);
}

export function isBookingIdRevealed(reservation: BookingIdDisplayInput): boolean {
  return !!(
    reservation.booking_id_revealed ||
    reservation.checked_in_at ||
    reservation.checked_out_at
  );
}
