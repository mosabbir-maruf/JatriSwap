import type { Firestore } from "firebase-admin/firestore";

import { getContactFirestore, getFirebaseAdminAuth } from "../firebaseAdmin";
import { ContactHttpError } from "./httpError";

const BEARER_RE = /^Bearer\s+(\S+)$/i;
const UID_RE = /^[a-zA-Z0-9_-]+$/;

function parseBearerToken(headerValue: string | null): string | null {
  if (headerValue == null) return null;
  const trimmed = headerValue.trim();
  if (trimmed.length === 0) return null;
  const m = BEARER_RE.exec(trimmed);
  const tok = m?.[1]?.trim();
  return tok && tok.length > 0 ? tok : null;
}

function isValidTargetUid(uid: string): boolean {
  return uid.length > 0 && uid.length <= 128 && UID_RE.test(uid);
}

/** Caller must be an active admin (`admins` or `users` doc with `role === 'admin'`). */
async function assertCallerIsFirestoreAdmin(db: Firestore, callerUid: string): Promise<void> {
  const adminSnap = await db.collection("admins").doc(callerUid).get();
  if (adminSnap.exists && adminSnap.data()?.role === "admin") return;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (userSnap.exists && userSnap.data()?.role === "admin") return;

  throw new ContactHttpError(403, "Forbidden");
}

function readTargetUid(body: unknown): string {
  if (body === null || typeof body !== "object") return "";
  const raw = (body as { targetUid?: unknown }).targetUid;
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Verifies the caller's ID token, confirms they are an active admin in Firestore, then deletes the target
 * Firebase Authentication user. Returns `{ ok: true }` on success (including when the user is already gone).
 * Throws `ContactHttpError` for any expected failure — the entry handler maps that to the HTTP response.
 */
export async function handleAdminDeleteAuthPost(body: unknown, headers: Headers): Promise<{ ok: true }> {
  const token = parseBearerToken(headers.get("authorization"));
  if (!token) throw new ContactHttpError(401, "Missing or invalid Authorization header");

  const db = getContactFirestore();
  const adminAuth = getFirebaseAdminAuth();

  let callerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    callerUid = decoded.uid;
  } catch {
    throw new ContactHttpError(401, "Invalid or expired ID token");
  }

  const targetUid = readTargetUid(body);
  if (!isValidTargetUid(targetUid)) throw new ContactHttpError(400, "Invalid targetUid");
  if (callerUid === targetUid) throw new ContactHttpError(403, "Cannot delete your own authentication record");

  await assertCallerIsFirestoreAdmin(db, callerUid);

  try {
    await adminAuth.deleteUser(targetUid);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (code === "auth/user-not-found") return { ok: true };
    console.error("[admin-delete-auth-user] deleteUser failed", err);
    throw new ContactHttpError(502, "Could not delete authentication record");
  }

  return { ok: true };
}
