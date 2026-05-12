/** Production marketing origin from env (no trailing slash). Used for canonicals and JSON-LD. */
export function getPublicSiteOrigin(): string | null {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof raw !== "string") return null;
  const t = raw.trim().replace(/\/+$/, "");
  return t.length > 0 ? t : null;
}

/** Absolute base for SEO URLs in the browser (prefers configured production origin). */
export function resolveSeoOrigin(): string {
  return getPublicSiteOrigin() ?? (typeof window !== "undefined" ? window.location.origin : "");
}
