import { createNotification } from "@/src/lib/firebase/notifications";

/** Fire-and-forget; never throws to callers (logs on failure). */
function safeNotify(label: string, fn: () => Promise<void>): void {
  void fn().catch((err) => console.error(`[sellerTicketNotifications] ${label}`, err));
}

/**
 * Buyer tapped Request to buy (WhatsApp opened). Requires verified sign-in per Firestore notification rules.
 * Anonymous buyers cannot create notifications — seller still gets WhatsApp via platform number.
 */
export function enqueueSellerPurchaseRequestNotification(input: {
  sellerUserId: string;
  ticketId: string;
  transportName: string;
  buyerUserId: string;
  buyerLabel: string;
}): void {
  const { sellerUserId, ticketId, transportName, buyerUserId, buyerLabel } = input;
  if (!sellerUserId || !buyerUserId || buyerUserId === sellerUserId) return;

  const shortName = transportName.length > 80 ? `${transportName.slice(0, 77)}…` : transportName;
  const msg = `${buyerLabel} requested to buy "${shortName}" (${ticketId}). They messaged via WhatsApp — check your business inbox.`;

  safeNotify("purchaseRequest", () =>
    createNotification(sellerUserId, "info", "Purchase request", msg.slice(0, 1000)),
  );
}

export type SellerTicketAdminChangeKind = "deleted" | "edited" | "status";

export function enqueueSellerAdminTicketNotification(input: {
  sellerUserId: string;
  ticketId: string;
  transportName: string;
  kind: SellerTicketAdminChangeKind;
  /** Present when kind === "status" */
  statusLabel?: string;
}): void {
  const { sellerUserId, ticketId, transportName, kind, statusLabel } = input;
  if (!sellerUserId) return;

  const shortName = transportName.length > 80 ? `${transportName.slice(0, 77)}…` : transportName;

  let title: string;
  let message: string;

  if (kind === "deleted") {
    title = "Listing removed";
    message = `An administrator removed your listing "${shortName}" (${ticketId}).`;
  } else if (kind === "edited") {
    title = "Listing updated by admin";
    message = `An administrator updated your listing "${shortName}" (${ticketId}). Check My Listings on your dashboard.`;
  } else {
    title = "Listing status changed";
    message = `Your listing "${shortName}" (${ticketId}) status was set to ${statusLabel ?? "updated"} by an administrator.`;
  }

  safeNotify(`admin:${kind}`, () =>
    createNotification(sellerUserId, "alert", title, message.slice(0, 1000)),
  );
}
