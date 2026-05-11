/** Rate-limit / dedupe tuning — server-only (not duplicated on the client). */

export const CONTACT_RATE_WINDOW_MS = 60 * 60 * 1000;

export const CONTACT_MAX_SUBMISSIONS_PER_WINDOW = 5;

export const CONTACT_DEDUPE_MS = 15 * 60 * 1000;

export const CONTACT_STALE_RESERVATION_MS = 120 * 1000;
