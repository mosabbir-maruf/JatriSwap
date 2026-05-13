import { toast } from "sonner";
import { FirestoreServiceError, firebaseErrorCode } from "@/src/lib/firebase/errors";
import { normalizeUserAccountStatus, sellListingBlockedMessage } from "@/src/lib/userAccountStatus";
import { clientLogger } from "@/src/lib/runtime/clientLogger";

/** Sell + EditTicketDialog — single source for seller-profile verification failures. */
export const LISTING_SELLER_PROFILE_MISSING_MESSAGE =
  "We couldn't verify your seller profile. Refresh the page or contact support if this keeps happening.";

/** Shell `users.status` may lag server; still better UX than a generic error when guard blocks. */
export function toastSellListingBlockedFromShell(shellStatus?: unknown): void {
  toast.error(sellListingBlockedMessage(normalizeUserAccountStatus(shellStatus)));
}

/**
 * Firestore failures during listing create/update — shared toast copy + logging.
 * Returns true if `error` was a handled Firestore failure (toast already shown).
 */
export function toastFirestoreListingSaveFailure(error: unknown): boolean {
  if (!(error instanceof FirestoreServiceError)) return false;
  const code = firebaseErrorCode(error.causeUnknown);
  if (code === "permission-denied") {
    toast.error(
      "Couldn't save your listing (permission denied). Sign out and back in, or contact support if you're sure your account should allow posting.",
    );
    return true;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    toast.error("Service is temporarily unavailable. Try again in a moment.");
    return true;
  }
  clientLogger.error("listing-save.firestore", error.causeUnknown ?? error);
  toast.error("Couldn't save your listing. Check your connection and try again.");
  return true;
}

export function toastListingSaveUnexpectedError(error: unknown): void {
  clientLogger.error("listing-save.unexpected", error);
  toast.error("Couldn't submit your listing. Try again or contact support.");
}
