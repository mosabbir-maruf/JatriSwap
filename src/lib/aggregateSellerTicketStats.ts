import type { Ticket } from "@/src/types";

/** Rollups derived from a ticket batch (e.g. admin `getTickets` cap). */
export type SellerTicketStatsRollup = {
  ticketsPosted: number;
  /** Listings currently `available`. */
  activeAvailable: number;
  sold: number;
};

/** Group ticket counts by `sellerId` for admin summaries. */
export function aggregateSellerTicketStatsFromTickets(tickets: Ticket[]): Map<string, SellerTicketStatsRollup> {
  const m = new Map<string, SellerTicketStatsRollup>();
  for (const t of tickets) {
    const sid = typeof t.sellerId === "string" ? t.sellerId.trim() : "";
    if (!sid) continue;
    let row = m.get(sid);
    if (!row) {
      row = { ticketsPosted: 0, activeAvailable: 0, sold: 0 };
      m.set(sid, row);
    }
    row.ticketsPosted += 1;
    if (t.status === "available") row.activeAvailable += 1;
    if (t.status === "sold") row.sold += 1;
  }
  return m;
}
