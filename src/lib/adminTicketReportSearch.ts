import type { AdminUserRow, TicketReport } from "@/src/types";
import { adminUserRowById } from "@/src/lib/adminUserSearch";
import { ANONYMOUS_REPORTER_ID } from "@/src/lib/firebase/ticketReports";
import { adminSearchDigitsOnly } from "@/src/lib/adminSearchText";

export const ADMIN_TICKET_REPORT_SEARCH_PLACEHOLDER =
  "Search report ID, ticket ID, email, phone…";

/**
 * Scam reports tab filter. Pass `normalizeAdminSearchQuery(raw)` as `queryNormalized`.
 * Matches: report id, ticket id, seller/reporter emails and phones from the report doc + linked `users` rows (digit overlap when query has ≥3 digits).
 */
export function ticketReportMatchesAdminSearch(
  report: TicketReport,
  queryNormalized: string,
  userById: Map<string, AdminUserRow>,
): boolean {
  if (queryNormalized.length === 0) return true;

  const hay = (value: string | undefined | null) => (value ?? "").toLowerCase();
  const q = queryNormalized;
  const qDigits = adminSearchDigitsOnly(q);

  if (hay(report.id).includes(q)) return true;
  if (hay(report.ticketId).includes(q)) return true;

  const sellerRow = adminUserRowById(userById, report.sellerId);
  const reporterUser =
    report.reporterId !== ANONYMOUS_REPORTER_ID ? adminUserRowById(userById, report.reporterId) : undefined;

  if (hay(sellerRow?.email).includes(q)) return true;
  if (hay(reporterUser?.email).includes(q)) return true;

  if (hay(report.sellerPhone).includes(q)) return true;
  if (hay(sellerRow?.phone).includes(q)) return true;
  if (hay(reporterUser?.phone).includes(q)) return true;

  if (qDigits.length >= 3) {
    const phoneSources = [report.sellerPhone, sellerRow?.phone, reporterUser?.phone] as const;
    for (const p of phoneSources) {
      const d = adminSearchDigitsOnly(p ?? "");
      if (d.length > 0 && d.includes(qDigits)) return true;
    }
  }

  return false;
}
