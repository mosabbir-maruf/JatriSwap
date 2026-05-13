/** Trim, strip trailing slashes; empty or non-string → `""`. Shared by runtime SEO and Vite sitemap build. */
export function normalizePublicSiteUrl(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

/** Production marketing origin from env (no trailing slash). Used for canonicals and JSON-LD. */
export function getPublicSiteOrigin(): string | null {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL;
  const t = normalizePublicSiteUrl(typeof raw === "string" ? raw : undefined);
  return t.length > 0 ? t : null;
}

/** Absolute base for SEO URLs in the browser (prefers configured production origin). */
export function resolveSeoOrigin(): string {
  return getPublicSiteOrigin() ?? (typeof window !== "undefined" ? window.location.origin : "");
}
