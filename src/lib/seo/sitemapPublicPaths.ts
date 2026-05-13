/**
 * URLs emitted to `dist/sitemap.xml` at build (see `vite.config.ts` for origin resolution).
 * Staff and account-only surfaces are intentionally omitted.
 */
/** Production origin used for sitemap `<loc>` and `robots.txt` `Sitemap:` when `VITE_PUBLIC_SITE_URL` is unset on Vercel Production. */
export const SITEMAP_DEFAULT_PRODUCTION_ORIGIN = "https://jatriswap.vercel.app";

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
