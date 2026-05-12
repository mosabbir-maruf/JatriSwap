import { doc, getDoc } from "firebase/firestore";
import type { User } from "@/src/types";
import { accountMaySellTickets, normalizeUserAccountStatus } from "@/src/lib/userAccountStatus";
import { getUser } from "@/src/lib/firebase/users";
import { db } from "@/src/lib/firebase/firebase";

/** Thrown before Firestore when `users/{uid}` blocks seller listing writes (suspended/banned). */
export class ListingWriteBlockedError extends Error {
  constructor() {
    super("LISTING_WRITE_BLOCKED");
    this.name = "ListingWriteBlockedError";
  }
}

/**
 * No `users/{uid}` row and no eligible `admins/{uid}` row — client guard used to fail here even
 * when rules could allow staff; see `sellerMayMutateListings` in `firestore.rules`.
 */
export class SellerProfileMissingError extends Error {
  constructor() {
    super("SELLER_PROFILE_MISSING");
    this.name = "SellerProfileMissingError";
  }
}

/**
 * Resolves the profile used for listing-write checks: `users/{uid}` first, then `admins/{uid}`
 * when `role == 'admin'` (matches security rules / `isAdmin()` shape).
 */
export async function loadProfileForSellerListingWrite(userId: string): Promise<User | null> {
  const fromUsers = await getUser(userId);
  if (fromUsers) return fromUsers;

  const adminSnap = await getDoc(doc(db, "admins", userId));
  if (!adminSnap.exists()) return null;
  const data = adminSnap.data();
  const role = typeof data.role === "string" ? data.role : "";
  if (role === "admin") {
    return { id: adminSnap.id, ...data } as User;
  }
  return null;
}

/** Uses live Firestore profile — safe against stale React auth state or forged client payloads. */
export function assertSellerMayPostListing(profile: User | null): void {
  if (!profile) {
    throw new SellerProfileMissingError();
  }
  if (!accountMaySellTickets(normalizeUserAccountStatus(profile.status))) {
    throw new ListingWriteBlockedError();
  }
}
