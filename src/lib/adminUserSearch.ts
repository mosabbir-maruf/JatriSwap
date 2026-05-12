import type { AdminUserRow } from "@/src/types";
import { adminSearchDigitsOnly } from "@/src/lib/adminSearchText";

export const ADMIN_USER_MANAGEMENT_SEARCH_PLACEHOLDER =
  "Search name, profile, ID, email, phone…";

/**
 * User Management table filter. Pass `normalizeAdminSearchQuery(raw)` as `queryNormalized`.
 * Matches: user id, profile display name, email, phone (substring or digit-only overlap when query has ≥3 digits).
 */
export function adminUserRowMatchesManagementSearch(user: AdminUserRow, queryNormalized: string): boolean {
  if (queryNormalized.length === 0) return true;

  const hay = (value: string | undefined | null) => (value ?? "").toLowerCase();
  const q = queryNormalized;
  const qDigits = adminSearchDigitsOnly(q);

  if (hay(user.id).includes(q)) return true;
  if (hay(user.name).includes(q)) return true;
  if (hay(user.email).includes(q)) return true;
  if (hay(user.phone).includes(q)) return true;

  const userPhoneDigits = adminSearchDigitsOnly(user.phone ?? "");
  if (qDigits.length >= 3 && userPhoneDigits.length > 0 && userPhoneDigits.includes(qDigits)) return true;

  return false;
}
