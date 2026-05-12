/**
 * URLs emitted to `dist/sitemap.xml` at build when `VITE_PUBLIC_SITE_URL` is set.
 * Staff and account-only surfaces are intentionally omitted.
 */
export const SITEMAP_PUBLIC_PATHS = [
  "/",
  "/browse",
  "/sell",
  "/contact",
  "/faq",
  "/transit",
  "/terms",
  "/privacy",
  "/cookie",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
] as const;
