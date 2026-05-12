const SCRIPT_ATTR = "data-jatriswap-ga-measurement-id";

const GA4_MEASUREMENT_ID: string | null = (() => {
  const raw = import.meta.env.VITE_PUBLIC_GA_MEASUREMENT_ID;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return id.length > 0 ? id : null;
})();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Injects gtag.js once when `VITE_PUBLIC_GA_MEASUREMENT_ID` is set. Uses `send_page_view: false`;
 * page views are sent from `trackGoogleAnalyticsPageView` after the document title is updated.
 */
export function loadGoogleAnalytics(): void {
  if (!GA4_MEASUREMENT_ID) return;
  if (document.head.querySelector(`script[${SCRIPT_ATTR}="${GA4_MEASUREMENT_ID}"]`)) return;

  window.dataLayer = window.dataLayer ?? [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
  script.setAttribute(SCRIPT_ATTR, GA4_MEASUREMENT_ID);
  document.head.appendChild(script);
}

let lastPageViewKey: string | null = null;

/** GA4 `page_view` after `document.title` reflects the current screen (deduped for identical URL + title). */
export function trackGoogleAnalyticsPageView(): void {
  if (!GA4_MEASUREMENT_ID || typeof window.gtag !== "function") return;

  const key = `${window.location.href}\0${document.title}`;
  if (lastPageViewKey === key) return;
  lastPageViewKey = key;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}
