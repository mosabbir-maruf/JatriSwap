import type { Ticket, TicketStatus } from "@/src/types";

/**
 * Bangladesh / `Asia/Dhaka` — fixed UTC+6 offset (no DST). All trip
 * date/time math in this module pins to this offset so seller `date` +
 * `departureTime` mean the same instant for every viewer regardless of
 * the browser's locale or the server's clock.
 */
export const DHAKA_TIMEZONE = "Asia/Dhaka" as const;
export const DHAKA_UTC_OFFSET_MINUTES = 6 * 60;
const MS_PER_MIN = 60_000;

const CLOCK_24 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Parse a stored `HH:mm`/`HH:mm:ss` clock string → minutes since midnight. */
function clockStringToMinutes(raw: string | undefined | null): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = CLOCK_24.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Extract the seller's chosen calendar day from a stored `ticket.date`.
 *
 * `Sell.tsx` writes `new Date("YYYY-MM-DD").toISOString()` which is
 * `YYYY-MM-DDT00:00:00.000Z` (date-only ISO strings are parsed as UTC
 * by spec). So the UTC components of the parsed `Date` recover exactly
 * the calendar day the seller picked, with no browser-TZ drift.
 */
function dhakaCalendarFromStoredDate(
  rawDate: string | undefined | null,
): { year: number; month: number; day: number } | null {
  const s = (rawDate ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * UTC millisecond instant when this ticket's trip departs in Dhaka time.
 * Returns `null` when either `date` or `departureTime` cannot be parsed —
 * callers should treat that as "unknown, do not auto-expire".
 */
export function ticketDepartureDhakaMs(
  ticket: Pick<Ticket, "date" | "departureTime">,
): number | null {
  const cal = dhakaCalendarFromStoredDate(ticket.date);
  if (!cal) return null;
  const minutes = clockStringToMinutes(ticket.departureTime);
  if (minutes === null) return null;
  const midnightUtcMs = Date.UTC(cal.year, cal.month - 1, cal.day);
  return midnightUtcMs + (minutes - DHAKA_UTC_OFFSET_MINUTES) * MS_PER_MIN;
}

/**
 * `true` once the trip departs in Dhaka time (or status is already
 * `'expired'`). `sold` is **not** an expired state — commerce outcome
 * wins. Unknown dates are never marked expired here.
 */
export function isTicketExpired(
  ticket: Pick<Ticket, "date" | "departureTime" | "status">,
  now: number = Date.now(),
): boolean {
  if (ticket.status === "expired") return true;
  if (ticket.status === "sold") return false;
  const departure = ticketDepartureDhakaMs(ticket);
  if (departure === null) return false;
  return now >= departure;
}

/**
 * Derived status for badges/UI. Sold beats expired; any non-`available`
 * stored status (`pending` / `flagged` / `rejected`) is returned as-is.
 */
export function ticketDisplayStatus(
  ticket: Pick<Ticket, "status" | "date" | "departureTime">,
  now: number = Date.now(),
): TicketStatus {
  if (ticket.status === "sold") return "sold";
  if (isTicketExpired(ticket, now)) return "expired";
  return ticket.status;
}

/**
 * Public marketplace gate — home/browse/discovery surfaces must use this
 * (or `filterPubliclyListedTickets`) so a single rule controls visibility.
 */
export function isTicketPubliclyListed(
  ticket: Pick<Ticket, "status" | "date" | "departureTime">,
  now: number = Date.now(),
): boolean {
  if (ticket.status !== "available") return false;
  return !isTicketExpired(ticket, now);
}

/**
 * Drop expired / non-`available` listings — Home/Browse/discovery use this so a
 * single rule controls what reaches the public marketplace.
 */
export function filterPubliclyListedTickets(
  tickets: Ticket[],
  now: number = Date.now(),
): Ticket[] {
  return tickets.filter((t) => isTicketPubliclyListed(t, now));
}
