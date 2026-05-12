/** Shared admin list filter: trim + lowercase (single definition for User Management, Scam reports, etc.). */
export function normalizeAdminSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Digits only — phone / ID fragment matching across admin search modules. */
export function adminSearchDigitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}
