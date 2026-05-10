import type { TicketStatus } from "@/src/types";

/** Admin moderation — seller cannot edit, delete, open detail link (flagged/rejected), or change status until cleared. */
export function isSellerListingModerationLocked(status: TicketStatus | string | undefined): boolean {
  return status === "pending" || status === "flagged" || status === "rejected";
}

/** Seller may open Edit Ticket and change listing fields (when also `available`). */
export function canSellerEditListingFields(status: TicketStatus | string | undefined): boolean {
  return status === "available" || status === "active";
}

/** Seller may mark listing as sold (only while active). */
export function canSellerMarkSold(status: TicketStatus | string | undefined): boolean {
  return status === "available" || status === "active";
}

/** Seller may delete own listing (blocked while pending/flagged). */
export function canSellerDeleteListing(status: TicketStatus | string | undefined): boolean {
  return !isSellerListingModerationLocked(status);
}

