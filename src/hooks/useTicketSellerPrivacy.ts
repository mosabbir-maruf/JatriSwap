import { useMemo } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import type { ListingPrivacyViewer } from "@/src/lib/ticketPrivacy";

/** Single source for listing privacy (Browse / Home / ticket detail redaction). */
export function useTicketSellerPrivacy(): ListingPrivacyViewer {
  const { firebaseUser, currentUser } = useAuth();
  return useMemo(
    () => ({
      viewerUid: firebaseUser?.uid ?? null,
      viewerIsAdmin: currentUser?.role === "admin",
    }),
    [firebaseUser?.uid, currentUser?.role],
  );
}
