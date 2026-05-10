import type { Ticket, TicketStatus } from "@/src/types";

/** Not shown as a public listing detail URL (Browse already hides these). */
const DETAIL_PAGE_BLOCKED_FOR_PUBLIC: TicketStatus[] = ["flagged", "rejected", "pending"];

/**
 * When true, anonymous buyers must not see this listing’s detail page — only seller or admin may.
 */
export function isTicketDetailHiddenFromPublicBuyer(
  ticket: Pick<Ticket, "status" | "sellerId">,
  viewerUid: string | null,
  viewerIsAdmin: boolean,
): boolean {
  if (!DETAIL_PAGE_BLOCKED_FOR_PUBLIC.includes(ticket.status)) return false;
  if (viewerIsAdmin) return false;
  if (viewerUid !== null && viewerUid === ticket.sellerId) return false;
  return true;
}
