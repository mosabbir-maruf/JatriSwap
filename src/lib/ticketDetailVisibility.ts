import type { Ticket, TicketStatus } from "@/src/types";
import { isTicketExpired } from "@/src/lib/ticketExpiration";

/** Not shown as a public listing detail URL (Browse already hides these). */
const DETAIL_PAGE_BLOCKED_FOR_PUBLIC: TicketStatus[] = ["flagged", "rejected", "pending"];

/**
 * When true, anonymous buyers must not see this listing’s detail page — only seller or admin may.
 *
 * Hides:
 *   - listings in moderation states (flagged/rejected/pending),
 *   - listings whose Dhaka departure has passed (derived via `isTicketExpired`),
 *   - listings already stored as `expired`.
 * Sellers and admins always see their own / all listings for management & history.
 */
export function isTicketDetailHiddenFromPublicBuyer(
  ticket: Pick<Ticket, "status" | "sellerId" | "date" | "departureTime">,
  viewerUid: string | null,
  viewerIsAdmin: boolean,
): boolean {
  const isPrivileged =
    viewerIsAdmin || (viewerUid !== null && viewerUid === ticket.sellerId);
  if (isPrivileged) return false;
  if (DETAIL_PAGE_BLOCKED_FOR_PUBLIC.includes(ticket.status)) return true;
  if (isTicketExpired(ticket)) return true;
  return false;
}
