import { format, isValid, parseISO } from "date-fns";
import type { Ticket } from "@/src/types";
import { ticketPostedAtMs } from "@/src/lib/firebase/tickets";

/** Fixed locale so date+time always use 12-hour clock with AM/PM (not browser locale 24h). */
const DISPLAY_LOCALE = "en-US";

export function formatMediumDateTimeAmPm(isoOrMs: string | number | Date | undefined | null): string {
  if (isoOrMs == null) return "—";
  if (typeof isoOrMs === "string" && isoOrMs.trim() === "") return "—";
  try {
    const d =
      typeof isoOrMs === "object" && isoOrMs instanceof Date
        ? isoOrMs
        : typeof isoOrMs === "number"
          ? new Date(isoOrMs)
          : new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(DISPLAY_LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

/** Listing `postedAt` (Firestore Timestamp | ISO | legacy) → medium date + short time with AM/PM. */
export function formatTicketPostedAtAmPm(postedAt: Ticket["postedAt"]): string {
  const ms = ticketPostedAtMs({ postedAt });
  if (!ms) return "—";
  return formatMediumDateTimeAmPm(ms);
}

/** Plain `{ seconds, nanoseconds }` when Timestamp loses prototype (e.g. some reads). */
function dateFromFirestoreSecondsNanos(raw: object): Date | null {
  const sec = (raw as { seconds?: unknown }).seconds;
  if (typeof sec !== "number" || !Number.isFinite(sec)) return null;
  const nsRaw = (raw as { nanoseconds?: unknown }).nanoseconds;
  const ns = typeof nsRaw === "number" && Number.isFinite(nsRaw) ? nsRaw : 0;
  return new Date(sec * 1000 + Math.floor(ns / 1e6));
}

/**
 * `users.joinedAt` (Firestore Timestamp, plain seconds map, ISO string, or date-only string).
 * Safe for React text nodes.
 */
export function formatJoinedAtDisplay(raw: unknown): string {
  if (raw == null || raw === "") return "—";
  if (typeof raw === "object" && raw !== null) {
    if (typeof (raw as { toDate?: () => Date }).toDate === "function") {
      try {
        const d = (raw as { toDate: () => Date }).toDate();
        return isValid(d) ? formatMediumDateTimeAmPm(d) : "—";
      } catch {
        /* fall through */
      }
    }
    const fromPlain = dateFromFirestoreSecondsNanos(raw);
    if (fromPlain && isValid(fromPlain)) return formatMediumDateTimeAmPm(fromPlain);
  }
  if (typeof raw === "string") {
    const p = parseISO(raw.includes("T") ? raw : `${raw}T00:00:00`);
    return isValid(p) ? format(p, "MMM d, yyyy") : raw;
  }
  return String(raw);
}
