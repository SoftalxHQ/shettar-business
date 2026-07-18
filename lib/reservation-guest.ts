export type ReservationGuestFields = {
  client_name?: string | null;
  other_first_name?: string | null;
  other_last_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  client_email?: string | null;
  other_email_address?: string | null;
  client_phone?: string | null;
  other_phone_number?: string | null;
  phone_number?: string | null;
  emer_first_name?: string | null;
  emer_last_name?: string | null;
  emer_phone_number?: string | null;
};

/** Display name for a reservation guest (self-booking, book-for-other, or account). */
export function reservationGuestName(
  reservation: ReservationGuestFields | null | undefined
): string {
  if (!reservation) return "Guest";

  const client = reservation.client_name?.trim();
  if (client) return client;

  const other = `${reservation.other_first_name || ""} ${reservation.other_last_name || ""}`.trim();
  if (other) return other;

  const self = `${reservation.first_name || ""} ${reservation.last_name || ""}`.trim();
  if (self) return self;

  return "Guest";
}

/** Guest email — prefers API client_email (covers self-bookings and book-for-other). */
export function reservationGuestEmail(
  reservation: ReservationGuestFields | null | undefined
): string {
  if (!reservation) return "N/A";
  const email =
    reservation.client_email?.trim() ||
    reservation.other_email_address?.trim() ||
    "";
  return email || "N/A";
}

/** Guest phone — prefers API client_phone (covers self-bookings and book-for-other). */
export function reservationGuestPhone(
  reservation: ReservationGuestFields | null | undefined
): string {
  if (!reservation) return "N/A";
  const phone =
    reservation.client_phone?.trim() ||
    reservation.phone_number?.trim() ||
    reservation.other_phone_number?.trim() ||
    "";
  return phone || "N/A";
}

/** Emergency contact name from the reservation. */
export function reservationEmergencyName(
  reservation: ReservationGuestFields | null | undefined
): string {
  if (!reservation) return "";
  return `${reservation.emer_first_name || ""} ${reservation.emer_last_name || ""}`.trim();
}

/** Emergency contact phone from the reservation. */
export function reservationEmergencyPhone(
  reservation: ReservationGuestFields | null | undefined
): string {
  if (!reservation) return "";
  return reservation.emer_phone_number?.trim() || "";
}

export function reservationHasEmergencyContact(
  reservation: ReservationGuestFields | null | undefined
): boolean {
  return Boolean(reservationEmergencyName(reservation) || reservationEmergencyPhone(reservation));
}
