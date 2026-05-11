import { ContactHttpError } from "../contact/httpError";
import { getContactFirestore, getFirebaseAdminAuth } from "../firebaseAdmin";

function parseBearerToken(headerValue: string | null): string | null {
  if (headerValue == null || headerValue.trim().length === 0) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(headerValue.trim());
  return m?.[1]?.trim() && m[1].trim().length > 0 ? m[1].trim() : null;
}

function isValidTargetUid(uid: string): boolean {
  if (uid.length === 0 || uid.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(uid);
}

/**
 * Verifies caller is an active admin (`admins/{uid}.role === 'admin'`) and deletes the target Auth user.
 * Firestore for that uid should already be removed by the client; this only clears Authentication.
 */
export async function handleAdminDeleteAuthPost(body: unknown, headers: Headers): Promise<{ ok: true }> {
  const token = parseBearerToken(headers.get("authorization"));
  if (!token) {
    throw new ContactHttpError(401, "Missing or invalid Authorization header");
  }

  const db = getContactFirestore();
  const adminAuth = getFirebaseAdminAuth();

  let callerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    callerUid = decoded.uid;
  } catch {
    throw new ContactHttpError(401, "Invalid or expired ID token");
  }

  const rawTarget =
    body !== null &&
    typeof body === "object" &&
    "targetUid" in body &&
    typeof (body as { targetUid?: unknown }).targetUid === "string"
      ? (body as { targetUid: string }).targetUid.trim()
      : "";
  if (!isValidTargetUid(rawTarget)) {
    throw new ContactHttpError(400, "Invalid targetUid");
  }

  if (callerUid === rawTarget) {
    throw new ContactHttpError(403, "Cannot delete your own authentication record");
  }

  const adminSnap = await db.collection("admins").doc(callerUid).get();
  const fromAdmins = adminSnap.exists && adminSnap.data()?.role === "admin";
  let fromUsers = false;
  if (!fromAdmins) {
    const userSnap = await db.collection("users").doc(callerUid).get();
    fromUsers = userSnap.exists && userSnap.data()?.role === "admin";
  }
  if (!fromAdmins && !fromUsers) {
    throw new ContactHttpError(403, "Forbidden");
  }

  try {
    await adminAuth.deleteUser(rawTarget);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : "";
    if (code === "auth/user-not-found") {
      return { ok: true };
    }
    console.error("[admin-delete-auth-user] deleteUser failed", err);
    throw new ContactHttpError(502, "Could not delete authentication record");
  }

  return { ok: true };
}
