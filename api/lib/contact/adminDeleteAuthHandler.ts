import type { IncomingHttpHeaders } from "node:http";

import type { Firestore } from "firebase-admin/firestore";

import { getContactFirestore, getFirebaseAdminAuth } from "../firebaseAdmin";
import { ContactHttpError } from "./httpError";

/** Accepts whichever shape Vercel hands the function (Node IncomingMessage or Fetch Request). */
export type HeadersLike = IncomingHttpHeaders | Headers;

const BEARER_RE = /^Bearer\s+(\S+)$/i;
const UID_RE = /^[a-zA-Z0-9_-]+$/;

function readHeader(headers: HeadersLike, name: string): string | null {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name);
  }
  const v = (headers as IncomingHttpHeaders)[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] ?? null;
  return typeof v === "string" ? v : null;
}

function parseBearerToken(rawAuthHeader: string | null): string | null {
  if (rawAuthHeader == null) return null;
  const trimmed = rawAuthHeader.trim();
  if (trimmed.length === 0) return null;
  const m = BEARER_RE.exec(trimmed);
  const tok = m?.[1]?.trim();
  return tok && tok.length > 0 ? tok : null;
}

function isValidTargetUid(uid: string): boolean {
  return uid.length > 0 && uid.length <= 128 && UID_RE.test(uid);
}

function readTargetUid(body: unknown): string {
  if (body === null) return "";
  if (typeof body === "string") {
    try {
      return readTargetUid(JSON.parse(body));
    } catch {
      return "";
    }
  }
  if (typeof body !== "object") return "";
  const raw = (body as { targetUid?: unknown }).targetUid;
  return typeof raw === "string" ? raw.trim() : "";
}

/** Caller must be an active admin (`admins` or `users` doc with `role === 'admin'`). */
async function assertCallerIsFirestoreAdmin(db: Firestore, callerUid: string): Promise<void> {
  const adminSnap = await db.collection("admins").doc(callerUid).get();
  if (adminSnap.exists && adminSnap.data()?.role === "admin") return;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (userSnap.exists && userSnap.data()?.role === "admin") return;

  throw new ContactHttpError(403, "Forbidden");
}

/**
 * Verifies the caller's ID token, confirms they are an active admin in Firestore, then deletes the target
 * Firebase Authentication user. Throws `ContactHttpError` for any expected failure.
 */
export async function handleAdminDeleteAuthPost(body: unknown, headers: HeadersLike): Promise<{ ok: true }> {
  const token = parseBearerToken(readHeader(headers, "authorization"));
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
