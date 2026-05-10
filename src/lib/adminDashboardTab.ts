/** Allowed `/admin` dashboard tab ids (Tabs `value`). */
export const ADMIN_DASHBOARD_TAB_IDS = [
  "overview",
  "tickets",
  "users",
  "reports",
  "logs",
  "admins",
] as const;

export type AdminDashboardTab = (typeof ADMIN_DASHBOARD_TAB_IDS)[number];

export const ADMIN_DASHBOARD_TAB_SET = new Set<string>(ADMIN_DASHBOARD_TAB_IDS);

/** Search param on `/admin` for the active tab. */
export const ADMIN_DASHBOARD_TAB_QUERY = "tab";

/** Search param on `/admin/users/:userId` — which dashboard tab “Back” restores. */
export const ADMIN_PROFILE_RETURN_TAB_QUERY = "returnTab";

export function normalizeAdminDashboardTab(raw: string | null | undefined): AdminDashboardTab {
  return raw && ADMIN_DASHBOARD_TAB_SET.has(raw) ? (raw as AdminDashboardTab) : "overview";
}

/** Same allow-list as the dashboard; default matches legacy behavior when param is missing. */
export function resolveAdminProfileReturnTab(raw: string | null | undefined): AdminDashboardTab {
  return raw && ADMIN_DASHBOARD_TAB_SET.has(raw) ? (raw as AdminDashboardTab) : "users";
}

export function adminDashboardPath(tab: AdminDashboardTab): string {
  return tab === "overview"
    ? "/admin"
    : `/admin?${ADMIN_DASHBOARD_TAB_QUERY}=${encodeURIComponent(tab)}`;
}

export function adminUserProfilePath(userId: string, returnTab: AdminDashboardTab): string {
  const base = `/admin/users/${encodeURIComponent(userId)}`;
  if (returnTab === "users") return base;
  return `${base}?${ADMIN_PROFILE_RETURN_TAB_QUERY}=${encodeURIComponent(returnTab)}`;
}
