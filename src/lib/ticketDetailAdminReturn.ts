import { isAdminAppRoute } from "@/src/lib/isAdminAppRoute";

const MAX_ADMIN_RETURN_LEN = 384;

/** Passed on `<Link to="/ticket/:id" state={…} />` when opening a listing from an admin screen. */
export type TicketDetailLocationState = {
  adminReturnPath: string;
};

/** Single back control on `/ticket/:id` (dashboard query vs admin state vs marketplace). */
export type TicketDetailBackNav = { readonly href: string; readonly label: string };

const BACK_DASHBOARD: TicketDetailBackNav = { href: "/dashboard", label: "Back to Dashboard" };
const BACK_LISTINGS: TicketDetailBackNav = { href: "/browse", label: "Back to listings" };

/** Validates a path+search string for an in-app admin return (built from `location` or parsed from `state`). */
function validateAdminReturnPath(path: string): string | null {
  if (path.length === 0 || path.length > MAX_ADMIN_RETURN_LEN) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const q = path.indexOf("?");
  const pathname = q === -1 ? path : path.slice(0, q);
  if (!isAdminAppRoute(pathname)) return null;
  return path;
}

export function ticketDetailStateForAdminReferrer(
  pathname: string,
  search: string,
): TicketDetailLocationState | undefined {
  const validated = validateAdminReturnPath(`${pathname}${search}`);
  if (validated === null) return undefined;
  return { adminReturnPath: validated };
}

function parseTicketDetailAdminReturn(state: unknown): string | null {
  if (state == null || typeof state !== "object") return null;
  const raw = (state as Partial<TicketDetailLocationState>).adminReturnPath;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return validateAdminReturnPath(trimmed);
}

export function resolveTicketDetailBackNav(listingSearch: string, locationState: unknown): TicketDetailBackNav {
  if (new URLSearchParams(listingSearch).get("from") === "dashboard") return BACK_DASHBOARD;
  const adminPath = parseTicketDetailAdminReturn(locationState);
  if (adminPath != null) return { href: adminPath, label: "Back to admin" };
  return BACK_LISTINGS;
}
