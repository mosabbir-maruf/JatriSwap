import type { Notification, UserAccountStatus } from "@/src/types";
import {
  FIRESTORE_MODERATION_ALERT_TITLE_BANNED,
  FIRESTORE_MODERATION_ALERT_TITLE_SUSPENDED,
  normalizeUserAccountStatus,
} from "@/src/lib/userAccountStatus";

function notificationTitleTrimmed(n: Pick<Notification, "title">): string {
  const t = n.title;
  return typeof t === "string" ? t.trim() : "";
}

/** Suspension / ban notices created via admin moderation (matches `createNotification` titles). */
export function isBanOrSuspendAlertNotification(n: Pick<Notification, "title">): boolean {
  const t = notificationTitleTrimmed(n);
  return t === FIRESTORE_MODERATION_ALERT_TITLE_SUSPENDED || t === FIRESTORE_MODERATION_ALERT_TITLE_BANNED;
}

/** Pin at top of Alerts only while the matching sanction is still in effect on the user profile. */
export function shouldPinModerationAlertNotification(
  n: Pick<Notification, "title">,
  accountStatus: UserAccountStatus,
): boolean {
  const t = notificationTitleTrimmed(n);
  if (accountStatus === "suspended" && t === FIRESTORE_MODERATION_ALERT_TITLE_SUSPENDED) return true;
  if (accountStatus === "banned" && t === FIRESTORE_MODERATION_ALERT_TITLE_BANNED) return true;
  return false;
}

function notificationCreatedAtMs(n: Pick<Notification, "createdAt">): number {
  if (!n.createdAt) return 0;
  const ms = Date.parse(n.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}

const byCreatedDesc = (a: Notification, b: Notification) =>
  notificationCreatedAtMs(b) - notificationCreatedAtMs(a);

/** Unread count without allocating intermediate arrays. */
export function unreadNotificationsCount(items: readonly Pick<Notification, "read">[]): number {
  let n = 0;
  for (const x of items) {
    if (!x.read) n += 1;
  }
  return n;
}

/** Profile status → normalized account status → pinned moderation sort (shared by Dashboard + Alerts). */
export function alertsSortedForAccountStatus(items: Notification[], rawProfileStatus: unknown): Notification[] {
  return sortNotificationsWithPinnedModeration(items, normalizeUserAccountStatus(rawProfileStatus));
}

/** Active suspend/ban notices first (newest among pinned, then newest rest). */
export function sortNotificationsWithPinnedModeration(
  items: Notification[],
  accountStatus: UserAccountStatus,
): Notification[] {
  const pinned: Notification[] = [];
  const rest: Notification[] = [];
  for (const n of items) {
    if (shouldPinModerationAlertNotification(n, accountStatus)) pinned.push(n);
    else rest.push(n);
  }
  pinned.sort(byCreatedDesc);
  rest.sort(byCreatedDesc);
  return [...pinned, ...rest];
}

/** Dashboard Alerts row surfaces — one place for border/bg/text styles (no duplicated ternaries in JSX). */
export function dashboardAlertsListingClasses(parts: {
  purchaseLead: boolean;
  modDestructive: boolean;
  read: boolean;
}): {
  row: string;
  title: string;
  message: string;
  markerModifier: string;
} {
  const { purchaseLead, modDestructive, read } = parts;

  let row: string;
  if (purchaseLead) {
    row = read
      ? "border-emerald-600/40 bg-transparent"
      : "border-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/15";
  } else if (modDestructive) {
    row = read
      ? "border-destructive/55 bg-destructive/5 hover:bg-destructive/10"
      : "border-destructive bg-destructive/15 hover:bg-destructive/25";
  } else {
    row = read ? "border-border bg-transparent" : "border-primary bg-primary/5 hover:bg-muted";
  }

  let title: string;
  if (read) {
    title = modDestructive ? "text-destructive/80" : "text-muted-foreground";
  } else if (purchaseLead) {
    title = "text-emerald-800 dark:text-emerald-200";
  } else if (modDestructive) {
    title = "text-destructive";
  } else {
    title = "text-foreground";
  }

  const message = modDestructive
    ? read
      ? "font-medium text-destructive/75"
      : "font-bold text-destructive"
    : read
      ? "font-medium text-muted-foreground"
      : "font-bold text-foreground";

  const markerModifier = modDestructive ? "w-2.5 h-2.5 -left-[7px]" : "w-2 h-2";

  return {
    row: `relative pl-4 border-l-4 py-2 transition-colors cursor-pointer ${row}`,
    title: `font-mono text-[10px] uppercase tracking-widest font-bold ${title}`,
    message: `font-mono text-xs tracking-wide mt-1 ${message}`,
    markerModifier,
  };
}
