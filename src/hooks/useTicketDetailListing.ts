import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { getTicket, incrementTicketViews } from "@/src/lib/firebase/tickets";
import { auth } from "@/src/lib/firebase/firebase";
import { redactSellerPhoneForViewer } from "@/src/lib/ticketPrivacy";
import type { Ticket } from "@/src/types";
import { useTicketSellerPrivacy } from "@/src/hooks/useTicketSellerPrivacy";

const ticketViewSessionKey = (ticketId: string) => `ticketDetailView:${ticketId}`;

export function useTicketDetailListing(ticketId: string | undefined): {
  ticket: Ticket | null;
  isLoading: boolean;
  viewerUid: string | null;
} {
  const listingViewer = useTicketSellerPrivacy();
  const ticketFullRef = useRef<Ticket | null>(null);
  const [ticketPrivacyEpoch, bumpTicketPrivacyEpoch] = useReducer((x: number) => x + 1, 0);
  const [isLoading, setIsLoading] = useState(true);

  const ticket = useMemo(() => {
    const full = ticketFullRef.current;
    return full ? redactSellerPhoneForViewer(full, listingViewer) : null;
  }, [ticketPrivacyEpoch, listingViewer]);

  useEffect(() => {
    const resetSnapshot = () => {
      ticketFullRef.current = null;
      bumpTicketPrivacyEpoch();
    };

    if (!ticketId) {
      setIsLoading(false);
      resetSnapshot();
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    resetSnapshot();

    void getTicket(ticketId)
      .then((fetched) => {
        if (cancelled) return;
        ticketFullRef.current = fetched ?? null;
        bumpTicketPrivacyEpoch();

        if (!fetched) return;

        void auth.authStateReady().then(() => {
          if (cancelled) return;

          const viewerAuthUid = auth.currentUser?.uid ?? null;
          if (viewerAuthUid && viewerAuthUid === fetched.sellerId) return;

          try {
            const key = ticketViewSessionKey(ticketId);
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, "1");
          } catch {
            // sessionStorage unavailable; still attempt server bump
          }

          void incrementTicketViews(ticketId).catch(console.error);
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load ticket", err);
          resetSnapshot();
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  return { ticket, isLoading, viewerUid: listingViewer.viewerUid };
}
