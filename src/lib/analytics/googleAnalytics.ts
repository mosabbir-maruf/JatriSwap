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
 * Ensures gtag is available when `VITE_PUBLIC_GA_MEASUREMENT_ID` is set.
 * Production builds receive the official snippet from `vite.config.ts`; this is a fallback for
 * environments that serve `index.html` without Vite's HTML transform.
 */
export function loadGoogleAnalytics(): void {
  if (!GA4_MEASUREMENT_ID) {
    if (import.meta.env.DEV) {
      console.info(
        "[JatriSwap] Google Analytics is off: set VITE_PUBLIC_GA_MEASUREMENT_ID in .env.local and restart the dev server. On Vercel, add it for Production (and Preview if needed), then redeploy so `vite build` embeds it.",
      );
    }
    return;
  }
  if (document.head.querySelector(`script[${SCRIPT_ATTR}="${GA4_MEASUREMENT_ID}"]`)) return;

  window.dataLayer = window.dataLayer ?? [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA4_MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
  script.setAttribute(SCRIPT_ATTR, GA4_MEASUREMENT_ID);
  document.head.appendChild(script);
}

let lastPageViewKey: string | null = null;
let skippedInitialAutoPageView = false;

/** GA4 `page_view` for SPA navigations after `document.title` reflects the current screen. */
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
