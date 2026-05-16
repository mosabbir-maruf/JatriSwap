import { trackGoogleAnalyticsPageView } from "@/src/lib/analytics/googleAnalytics";

export type DocumentMetaInput = {
  title: string;
  description: string;
  canonicalUrl: string | null;
  /** e.g. noindex for staff-only surfaces */
  robots?: string;
};

function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLinkRel(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeMetaByName(name: string) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

/**
 * Updates document head for SPA SEO (title, description, canonical, robots).
 * Open Graph and Twitter tags remain static in index.html for crawler consistency.
 */
export function applyDocumentMeta(input: DocumentMetaInput) {
  const { title, description, canonicalUrl, robots } = input;
  document.title = title;

  upsertMetaByName("description", description);

  if (robots !== undefined && robots.length > 0) {
    upsertMetaByName("robots", robots);
  } else {
    removeMetaByName("robots");
  }

  if (canonicalUrl) {
    upsertLinkRel("canonical", canonicalUrl);
  } else {
    document.querySelector('link[rel="canonical"]')?.remove();
  }

  trackGoogleAnalyticsPageView();
}
