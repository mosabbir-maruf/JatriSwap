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
