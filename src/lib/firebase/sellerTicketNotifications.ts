import { createNotification } from "@/src/lib/firebase/notifications";
import type { Notification } from "@/src/types";
import { clientLogger } from "@/src/lib/runtime/clientLogger";

/** Keep in sync with seller dashboard Alerts highlighting. */
export const SELLER_PURCHASE_REQUEST_NOTIFICATION_TITLE = "Purchase request";

export function isSellerPurchaseRequestNotification(n: Pick<Notification, "title">): boolean {
  return (n.title ?? "").trim() === SELLER_PURCHASE_REQUEST_NOTIFICATION_TITLE;
}

/** Fire-and-forget; never throws to callers (logs on failure). */
function safeNotify(label: string, fn: () => Promise<void>): void {
  void fn().catch((err: unknown) => {
    clientLogger.error("seller-ticket-notifications.enqueue", err, { label });
  });
}

const LISTING_TITLE_NOTIFY_MAX = 80;

function truncateListingTitleForSellerNotify(transportName: string, maxLen = LISTING_TITLE_NOTIFY_MAX): string {
  const t = transportName.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
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

  const shortName = truncateListingTitleForSellerNotify(transportName);
  const msg = `${buyerLabel} requested to buy "${shortName}" (${ticketId}). They messaged via WhatsApp — check your business inbox.`;

  safeNotify("purchaseRequest", () =>
    createNotification(sellerUserId, "info", SELLER_PURCHASE_REQUEST_NOTIFICATION_TITLE, msg.slice(0, 1000)),
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

  const shortName = truncateListingTitleForSellerNotify(transportName);

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
