import type { User } from "@/src/types";
import { accountMaySellTickets, normalizeUserAccountStatus } from "@/src/lib/userAccountStatus";

/** Thrown before Firestore when `users/{uid}` blocks seller listing writes (suspended/banned). */
export class ListingWriteBlockedError extends Error {
  constructor() {
    super("LISTING_WRITE_BLOCKED");
    this.name = "ListingWriteBlockedError";
  }
}

/** Uses live Firestore profile — safe against stale React auth state or forged client payloads. */
export function throwIfSellerListingWriteBlocked(profile: User | null): void {
  if (!profile || !accountMaySellTickets(normalizeUserAccountStatus(profile.status))) {
    throw new ListingWriteBlockedError();
  }
}
