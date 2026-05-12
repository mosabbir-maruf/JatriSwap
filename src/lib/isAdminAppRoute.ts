/**
 * True for `/admin` and nested staff routes (`/admin/...`). False for unrelated paths like `/administration`.
 * Used by: floating WhatsApp CTA, document meta / robots (`getRouteSeo`), and other staff-only UI gates.
 */
export function isAdminAppRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

const PATHS_WITHOUT_FLOATING_WHATSAPP = new Set(["/login", "/register"]);

/** Single gate for the floating WhatsApp CTA in AppLayout (O(1) pathname check). */
export function shouldShowFloatingWhatsAppHelp(pathname: string): boolean {
  if (isAdminAppRoute(pathname)) return false;
  return !PATHS_WITHOUT_FLOATING_WHATSAPP.has(pathname);
}
