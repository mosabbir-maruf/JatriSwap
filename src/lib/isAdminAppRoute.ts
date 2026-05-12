/**
 * True when the main app shell should hide public-only chrome (e.g. WhatsApp CTA)
 * for `/admin` and nested admin routes. Does not match unrelated paths like `/administration`.
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
