/**
 * True when the main app shell should hide public-only chrome (e.g. WhatsApp CTA)
 * for `/admin` and nested admin routes. Does not match unrelated paths like `/administration`.
 */
export function isAdminAppRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
