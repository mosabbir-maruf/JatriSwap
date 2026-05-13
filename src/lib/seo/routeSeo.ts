import { isAdminAppRoute } from "../isAdminAppRoute";

const BRAND = "JatriSwap";

const DEFAULT_DESCRIPTION =
  "The premier marketplace to buy and sell unused train & bus tickets. Your unused ticket deserves a traveler - JatriSwap";

const STAFF_ONLY_DESCRIPTION =
  "JatriSwap staff tools for authorized team members only. Not indexed for public search.";

export type RouteSeo = { title: string; description: string };

/**
 * Staff `/admin` crawl policy: `<meta name="robots">` and Vercel `X-Robots-Tag` (keep values identical).
 */
export const CRAWL_BLOCK_ROBOTS = "noindex, nofollow, noarchive";

export const NOT_FOUND_SEO: RouteSeo = {
  title: `Page Not Found - ${BRAND}`,
  description: "The page you requested is not available on JatriSwap.",
};

type StaticRouteSeo = RouteSeo & { indexable: boolean };

const STATIC_ROUTES: Record<string, StaticRouteSeo> = {
  "/": {
    title: `Buy & Sell Train & Bus Tickets - ${BRAND}`,
    description: DEFAULT_DESCRIPTION,
    indexable: true,
  },
  "/browse": {
    title: `Browse Train & Bus Listings - ${BRAND}`,
    description:
      "Search available train and bus tickets by route, date, and mode. Find verified listings from sellers on JatriSwap.",
    indexable: true,
  },
  "/sell": {
    title: `List Your Transit Ticket - ${BRAND}`,
    description:
      "Sell an unused train or bus ticket safely. List your route, date, and price so buyers can find you on JatriSwap.",
    indexable: true,
  },
  "/contact": {
    title: `Contact Support - ${BRAND}`,
    description:
      "Reach JatriSwap support for help with listings, purchases, account access, or safety concerns.",
    indexable: true,
  },
  "/faq": {
    title: `Help & FAQ - ${BRAND}`,
    description:
      "Answers about how JatriSwap works, verification, fees, escrow, refunds, and receiving your ticket after purchase.",
    indexable: true,
  },
  "/transit": {
    title: `Transit directory - ${BRAND}`,
    description:
      "Stations, train names, and bus operators used in JatriSwap search and listings across Bangladesh.",
    indexable: true,
  },
  "/terms": {
    title: `Terms of Service - ${BRAND}`,
    description: "Terms of Service for using the JatriSwap marketplace and related policies.",
    indexable: true,
  },
  "/privacy": {
    title: `Privacy Policy - ${BRAND}`,
    description: "How JatriSwap collects, uses, and protects your personal information.",
    indexable: true,
  },
  "/cookie": {
    title: `Cookie Policy - ${BRAND}`,
    description: "Information about cookies and similar technologies used on JatriSwap.",
    indexable: true,
  },
  "/login": {
    title: `Log In - ${BRAND}`,
    description: "Sign in to your JatriSwap account to manage listings, alerts, and purchases.",
    indexable: false,
  },
  "/register": {
    title: `Create Account - ${BRAND}`,
    description: "Register for JatriSwap to list tickets, set alerts, and connect with buyers and sellers.",
    indexable: false,
  },
  "/forgot-password": {
    title: `Forgot Password - ${BRAND}`,
    description: "Reset your JatriSwap account password using your registered email address.",
    indexable: false,
  },
  "/verify-email": {
    title: `Verify Email - ${BRAND}`,
    description: "Confirm your email address to finish setting up your JatriSwap account.",
    indexable: false,
  },
  "/dashboard": {
    title: `Dashboard - ${BRAND}`,
    description: "Manage your JatriSwap listings, profile, and buyer activity from your dashboard.",
    indexable: false,
  },
  "/alerts": {
    title: `Alerts - ${BRAND}`,
    description: "Manage ticket alerts and notifications on JatriSwap.",
    indexable: false,
  },
  "/unauthorized": {
    title: `Unauthorized - ${BRAND}`,
    description: "You do not have access to this JatriSwap page.",
    indexable: false,
  },
};

function ticketPathSeo(): RouteSeo {
  return {
    title: `Transit Ticket Listing - ${BRAND}`,
    description:
      "View route, schedule, seat class, and seller contact options for this JatriSwap listing.",
  };
}

function staffPageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/users/")) return `Admin user profile - ${BRAND}`;
  if (pathname.startsWith("/admin/login")) return `Admin sign in - ${BRAND}`;
  if (pathname.startsWith("/admin/register")) return `Admin registration - ${BRAND}`;
  return `Admin dashboard - ${BRAND}`;
}

function adminStaffPathSeo(pathname: string): RouteSeo {
  return { title: staffPageTitle(pathname), description: STAFF_ONLY_DESCRIPTION };
}

/** SEO defaults before listing-specific overrides load. */
export function getRouteSeo(pathname: string): RouteSeo {
  if (pathname.startsWith("/ticket/")) {
    return ticketPathSeo();
  }
  if (isAdminAppRoute(pathname)) {
    return adminStaffPathSeo(pathname);
  }
  return STATIC_ROUTES[pathname] ?? NOT_FOUND_SEO;
}

export function isPrivateAppRoute(pathname: string): boolean {
  return STATIC_ROUTES[pathname]?.indexable === false;
}

export function indexableStaticRoutePaths(): readonly string[] {
  return Object.entries(STATIC_ROUTES)
    .filter(([, seo]) => seo.indexable)
    .map(([pathname]) => pathname);
}

export { DEFAULT_DESCRIPTION, BRAND };
