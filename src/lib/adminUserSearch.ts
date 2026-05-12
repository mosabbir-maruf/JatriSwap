import type { AdminUserRow } from "@/src/types";

export const ADMIN_USER_MANAGEMENT_SEARCH_PLACEHOLDER =
  "Search name, profile, ID, email, phone…";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function normalizeAdminUserManagementSearch(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * User Management table filter. `queryNormalized` must be {@link normalizeAdminUserManagementSearch}'s output.
 * Matches: user id, profile display name, email, phone (substring or digit-only overlap when query has ≥3 digits).
 */
export function adminUserRowMatchesManagementSearch(user: AdminUserRow, queryNormalized: string): boolean {
  if (queryNormalized.length === 0) return true;

  const hay = (value: string | undefined | null) => (value ?? "").toLowerCase();
  const q = queryNormalized;
  const qDigits = digitsOnly(q);

  if (hay(user.id).includes(q)) return true;
  if (hay(user.name).includes(q)) return true;
  if (hay(user.email).includes(q)) return true;
  if (hay(user.phone).includes(q)) return true;

  const userPhoneDigits = digitsOnly(user.phone ?? "");
  if (qDigits.length >= 3 && userPhoneDigits.length > 0 && userPhoneDigits.includes(qDigits)) return true;

  return false;
}
