export type ReservationGuestFields = {
  client_name?: string | null;
  other_first_name?: string | null;
  other_last_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
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
