import type { UserAccountStatus } from "@/src/types";

const KNOWN: ReadonlySet<UserAccountStatus> = new Set(["active", "warned", "suspended", "banned"]);

export function normalizeUserAccountStatus(raw: unknown): UserAccountStatus {
  if (typeof raw !== "string") return "active";
  const s = raw.trim().toLowerCase();
  return KNOWN.has(s as UserAccountStatus) ? (s as UserAccountStatus) : "active";
}

export function accountMaySellTickets(status: UserAccountStatus): boolean {
  return status !== "suspended" && status !== "banned";
}

export function accountIsBanned(status: UserAccountStatus): boolean {
  return status === "banned";
}

/** Copy for blocked listing flows (Sell page, edit guardrails — not a toast API). */
export function sellListingBlockedMessage(status: UserAccountStatus): string {
  if (status === "banned") {
    return "Your account is banned from posting listings. Check Alerts or contact support if this is a mistake.";
  }
  if (status === "suspended") {
    return "Your account is suspended from posting new listings. Check Alerts for details or contact support.";
  }
  return "You cannot post listings with your current account status.";
}

export function loginBannedToastMessage(): string {
  return "This account has been banned and cannot sign in.";
}

export function sessionBannedToastMessage(): string {
  return "Your account has been banned. You have been signed out.";
}

export type ModerationAlertKind = "suspended" | "unsuspended" | "banned" | "unbanned";

export function moderationAlertPayload(kind: ModerationAlertKind): { title: string; message: string } {
  switch (kind) {
    case "suspended":
      return {
        title: "Account suspended",
        message:
          "Posting new ticket listings is temporarily disabled on your account. You can still browse and sign in. Contact support if you need help.",
      };
    case "unsuspended":
      return {
        title: "Suspension lifted",
        message:
          "Your account is active again. You may post new ticket listings when you're ready.",
      };
    case "banned":
      return {
        title: "Account banned",
        message:
          "Your account has been banned from JatriSwap. You cannot sign in. Contact support if you believe this is an error.",
      };
    case "unbanned":
      return {
        title: "Ban removed",
        message:
          "Your account ban has been lifted. You may sign in and use the platform according to our policies.",
      };
    default:
      return { title: "Account notice", message: "Your account status was updated by an administrator." };
  }
}

/** Notification `title` values written by admin suspend/ban — same strings as `moderationAlertPayload` + Dashboard UX. */
export const FIRESTORE_MODERATION_ALERT_TITLE_SUSPENDED = moderationAlertPayload("suspended").title;
export const FIRESTORE_MODERATION_ALERT_TITLE_BANNED = moderationAlertPayload("banned").title;
