import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  initializeFirestore,
  type Firestore,
  type FirestoreSettings,
} from "firebase-admin/firestore";

/**
 * Admin-only POST endpoint: deletes the target Firebase Authentication user after the caller proves they are
 * an active admin (`admins/{uid}.role === 'admin'` or `users/{uid}.role === 'admin'`).
 *
 * Self-contained on purpose — Vercel's serverless tracer was dropping nested `api/lib/**` modules for this
 * function, causing `ERR_MODULE_NOT_FOUND` at runtime. Inlining avoids the cross-file import surface entirely.
 */

class HttpError extends Error {
  readonly statusCode: number;
  readonly _httpError = true as const;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

function isHttpError(err: unknown): err is HttpError {
  if (typeof err !== "object" || err === null) return false;
  const o = err as { _httpError?: unknown; statusCode?: unknown };
  return o._httpError === true && typeof o.statusCode === "number";
}

const FIRESTORE_REST_SETTINGS: FirestoreSettings = { preferRest: true };

function parseServiceAccountJson(raw: string): ServiceAccount {
  const trimmed = raw.replace(/^\ufeff/, "").trim();
  try {
    return JSON.parse(trimmed) as ServiceAccount;
  } catch {
    throw new HttpError(
      503,
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the service account file contents as one line in Vercel env.",
    );
  }
}

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (typeof inline === "string" && inline.trim().length > 0) {
    return parseServiceAccountJson(inline);
  }

  const pathRaw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (pathRaw && pathRaw.length > 0) {
    try {
      const buf = readFileSync(pathRaw, "utf8");
      return parseServiceAccountJson(buf);
    } catch {
      throw new HttpError(503, "Could not read service account file referenced by env path.");
    }
  }

  throw new HttpError(503, "FIREBASE_SERVICE_ACCOUNT_JSON (or path env) is not set on Vercel.");
}

function usesDefaultFirestoreDatabase(databaseId: string): boolean {
  const id = databaseId.trim().toLowerCase();
  return id === "(default)" || id === "default";
}

let cachedApp: App | undefined;
let cachedFirestore: Firestore | undefined;

function getApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  const serviceAccount = loadServiceAccount();
  try {
    cachedApp = initializeApp({ credential: cert(serviceAccount) });
    return cachedApp;
  } catch (e: unknown) {
    console.error("[admin-delete-auth-user] initializeApp failed", e);
    throw new HttpError(503, "Firebase Admin failed to start.");
  }
}

function getDb(): Firestore {
  if (cachedFirestore) return cachedFirestore;
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId || databaseId.length === 0) {
    throw new HttpError(503, "FIRESTORE_DATABASE_ID is not set on Vercel.");
  }
  const app = getApp();
  try {
    cachedFirestore = usesDefaultFirestoreDatabase(databaseId)
      ? initializeFirestore(app, FIRESTORE_REST_SETTINGS)
      : initializeFirestore(app, FIRESTORE_REST_SETTINGS, databaseId);
    return cachedFirestore;
  } catch (e: unknown) {
    console.error("[admin-delete-auth-user] initializeFirestore failed", e);
    throw new HttpError(503, "Firestore Admin failed to start.");
  }
}

function parseBearerToken(headerValue: string | null): string | null {
  if (headerValue == null || headerValue.trim().length === 0) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(headerValue.trim());
  const tok = m?.[1]?.trim();
  return tok && tok.length > 0 ? tok : null;
}

function isValidTargetUid(uid: string): boolean {
  if (uid.length === 0 || uid.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(uid);
}

async function assertCallerIsAdmin(db: Firestore, callerUid: string): Promise<void> {
  const adminSnap = await db.collection("admins").doc(callerUid).get();
  if (adminSnap.exists && adminSnap.data()?.role === "admin") return;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (userSnap.exists && userSnap.data()?.role === "admin") return;

  throw new HttpError(403, "Forbidden");
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export default async function adminDeleteAuthUser(request: Request): Promise<Response> {
  const cors = corsHeaders();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { ...cors, Allow: "POST, OPTIONS" } },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* validation will catch missing/invalid targetUid */
  }

  try {
    const token = parseBearerToken(request.headers.get("authorization"));
    if (!token) throw new HttpError(401, "Missing or invalid Authorization header");

    const db = getDb();
    const adminAuth = getAuth(getApp());

    let callerUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token, true);
      callerUid = decoded.uid;
    } catch {
      throw new HttpError(401, "Invalid or expired ID token");
    }

    const rawTarget =
      body !== null &&
      typeof body === "object" &&
      "targetUid" in body &&
      typeof (body as { targetUid?: unknown }).targetUid === "string"
        ? (body as { targetUid: string }).targetUid.trim()
        : "";
    if (!isValidTargetUid(rawTarget)) throw new HttpError(400, "Invalid targetUid");
    if (callerUid === rawTarget) throw new HttpError(403, "Cannot delete your own authentication record");

    await assertCallerIsAdmin(db, callerUid);

    try {
      await adminAuth.deleteUser(rawTarget);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      if (code === "auth/user-not-found") {
        return Response.json({ ok: true }, { status: 200, headers: cors });
      }
      console.error("[admin-delete-auth-user] deleteUser failed", err);
      throw new HttpError(502, "Could not delete authentication record");
    }

    return Response.json({ ok: true }, { status: 200, headers: cors });
  } catch (err) {
    if (isHttpError(err)) {
      return Response.json({ error: err.message }, { status: err.statusCode, headers: cors });
    }
    console.error("[admin-delete-auth-user]", err);
    return Response.json(
      { error: "Could not complete authentication cleanup." },
      { status: 500, headers: cors },
    );
  }
}
