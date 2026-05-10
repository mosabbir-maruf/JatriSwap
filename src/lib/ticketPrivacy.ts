import type { Ticket } from "@/src/types";

/** Viewer context for listing/ticket-detail seller-phone redaction (aligned with `useTicketSellerPrivacy`). */
export interface ListingPrivacyViewer {
  viewerUid: string | null;
  viewerIsAdmin: boolean;
}

/**
 * Removes seller phone from listing data for viewers who are not the seller or an admin.
 *
 * Firestore still allows `get`/`list` on tickets today, so a determined client can read the raw document
 * (e.g. Network tab or calling `getDoc` themselves). To hide `sellerPhone` at rest you’d split public vs private fields or gate reads server-side.
 */
export function redactSellerPhoneFromTicket(
  ticket: Ticket,
  viewerUid: string | null | undefined,
  viewerIsAdmin: boolean,
): Ticket {
  if (viewerIsAdmin || (viewerUid && viewerUid === ticket.sellerId)) return ticket;
  return { ...ticket, sellerPhone: "" };
}

export function redactSellerPhoneForViewer(ticket: Ticket, viewer: ListingPrivacyViewer): Ticket {
  return redactSellerPhoneFromTicket(ticket, viewer.viewerUid, viewer.viewerIsAdmin);
}

export function redactSellerPhonesForViewer(tickets: Ticket[], viewer: ListingPrivacyViewer): Ticket[] {
  return tickets.map((t) => redactSellerPhoneForViewer(t, viewer));
}
