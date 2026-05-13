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

let lastPageViewKey: string | null = null;
let skippedInitialAutoPageView = false;

/** GA4 `page_view` for SPA navigations; initial page view is sent by the static gtag snippet. */
export function trackGoogleAnalyticsPageView(): void {
  if (!GA4_MEASUREMENT_ID || typeof window.gtag !== "function") return;

  const key = `${window.location.href}\0${document.title}`;
  if (!skippedInitialAutoPageView) {
    skippedInitialAutoPageView = true;
    lastPageViewKey = key;
    return;
  }

  if (lastPageViewKey === key) return;
  lastPageViewKey = key;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}
