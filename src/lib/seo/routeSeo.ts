const BRAND = "JatriSwap";

const DEFAULT_DESCRIPTION =
  "Browse, list, and buy or sell verified train and bus tickets on JatriSwap — a peer-to-peer public transit ticket marketplace for Bangladesh.";

export type RouteSeo = { title: string; description: string };

export const NOT_FOUND_SEO: RouteSeo = {
  title: `Page Not Found - ${BRAND}`,
  description: "The page you requested is not available on JatriSwap.",
};

const STATIC_ROUTES: Record<string, RouteSeo> = {
  "/": {
    title: `Buy & Sell Train & Bus Tickets - ${BRAND}`,
    description: DEFAULT_DESCRIPTION,
  },
  "/browse": {
    title: `Browse Train & Bus Listings - ${BRAND}`,
    description:
      "Search available train and bus tickets by route, date, and mode. Find verified listings from sellers on JatriSwap.",
  },
  "/sell": {
    title: `List Your Transit Ticket - ${BRAND}`,
    description:
      "Sell an unused train or bus ticket safely. List your route, date, and price so buyers can find you on JatriSwap.",
  },
  "/contact": {
    title: `Contact Support - ${BRAND}`,
    description:
      "Reach JatriSwap support for help with listings, purchases, account access, or safety concerns.",
  },
  "/faq": {
    title: `Help & FAQ - ${BRAND}`,
    description:
      "Answers about how JatriSwap works, verification, fees, escrow, refunds, and receiving your ticket after purchase.",
  },
  "/terms": {
    title: `Terms of Service - ${BRAND}`,
    description: "Terms of Service for using the JatriSwap marketplace and related policies.",
  },
  "/privacy": {
    title: `Privacy Policy - ${BRAND}`,
    description: "How JatriSwap collects, uses, and protects your personal information.",
  },
  "/cookie": {
    title: `Cookie Policy - ${BRAND}`,
    description: "Information about cookies and similar technologies used on JatriSwap.",
  },
  "/login": {
    title: `Log In - ${BRAND}`,
    description: "Sign in to your JatriSwap account to manage listings, alerts, and purchases.",
  },
  "/register": {
    title: `Create Account - ${BRAND}`,
    description: "Register for JatriSwap to list tickets, set alerts, and connect with buyers and sellers.",
  },
  "/forgot-password": {
    title: `Forgot Password - ${BRAND}`,
    description: "Reset your JatriSwap account password using your registered email address.",
  },
  "/verify-email": {
    title: `Verify Email - ${BRAND}`,
    description: "Confirm your email address to finish setting up your JatriSwap account.",
  },
  "/dashboard": {
    title: `Dashboard - ${BRAND}`,
    description: "Manage your JatriSwap listings, profile, and buyer activity from your dashboard.",
  },
  "/alerts": {
    title: `Alerts - ${BRAND}`,
    description: "Manage ticket alerts and notifications on JatriSwap.",
  },
  "/unauthorized": {
    title: `Unauthorized - ${BRAND}`,
    description: "You do not have access to this JatriSwap page.",
  },
};

function ticketPathSeo(): RouteSeo {
  return {
    title: `Transit Ticket Listing - ${BRAND}`,
    description:
      "View route, schedule, seat class, and seller contact options for this JatriSwap listing.",
  };
}

/** SEO defaults before listing-specific overrides load. */
export function getRouteSeo(pathname: string): RouteSeo {
  if (pathname.startsWith("/ticket/")) {
    return ticketPathSeo();
  }
  return STATIC_ROUTES[pathname] ?? NOT_FOUND_SEO;
}

export function isAdminSeoPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export { DEFAULT_DESCRIPTION, BRAND };
