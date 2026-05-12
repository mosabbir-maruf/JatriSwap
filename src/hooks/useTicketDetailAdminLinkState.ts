import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  type TicketDetailLocationState,
  ticketDetailStateForAdminReferrer,
} from "@/src/lib/ticketDetailAdminReturn";

/** Memoized `<Link state>` for opening `/ticket/:id` from admin routes (single source vs duplicating `useLocation` + `useMemo`). */
export function useTicketDetailAdminLinkState(): TicketDetailLocationState | undefined {
  const { pathname, search } = useLocation();
  return useMemo(() => ticketDetailStateForAdminReferrer(pathname, search), [pathname, search]);
}
