import { readFileSync } from "node:fs";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  initializeFirestore,
  type Firestore,
  type FirestoreSettings,
} from "firebase-admin/firestore";

/**
 * Admin-only POST `/api/admin-delete-auth-user`.
 *
 * Self-contained on purpose: Vercel's serverless tracer repeatedly drops any `./lib/**` imports for
 * this specific function (verified via `ERR_MODULE_NOT_FOUND` on `httpError`, `firebaseAdmin`, and
 * `adminAuthDelete/*`), even when those files are present in source and used by the contact route.
 * Only `node:*` and `firebase-admin/*` (npm) imports are kept — both bundle reliably.
 *
 * Uses Node-style `(req, res)` so Vercel finalizes the response immediately (Web `Response` returns
 * were ignored by the Node runtime, causing 30s `FUNCTION_INVOCATION_TIMEOUT`).
 */

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

// ---------- HTTP error plumbing ----------

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

// ---------- Firebase Admin bootstrap (cached per warm lambda) ----------

const FIRESTORE_REST_SETTINGS: FirestoreSettings = { preferRest: true };
let cachedApp: App | undefined;
let cachedDb: Firestore | undefined;

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
      return parseServiceAccountJson(readFileSync(pathRaw, "utf8"));
    } catch {
      throw new HttpError(503, "Could not read service account file referenced by env path.");
    }
  }
  throw new HttpError(503, "FIREBASE_SERVICE_ACCOUNT_JSON (or path env) is not set on Vercel.");
}

function isDefaultDatabase(databaseId: string): boolean {
  const id = databaseId.trim().toLowerCase();
  return id === "(default)" || id === "default";
}

function getApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  try {
    cachedApp = initializeApp({ credential: cert(loadServiceAccount()) });
    return cachedApp;
  } catch (e) {
    console.error("[admin-delete-auth-user] initializeApp failed", e);
    throw new HttpError(503, "Firebase Admin failed to start.");
  }
}

function getDb(): Firestore {
  if (cachedDb) return cachedDb;
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId || databaseId.length === 0) {
    throw new HttpError(503, "FIRESTORE_DATABASE_ID is not set on Vercel.");
  }
  const app = getApp();
  try {
    cachedDb = isDefaultDatabase(databaseId)
      ? initializeFirestore(app, FIRESTORE_REST_SETTINGS)
      : initializeFirestore(app, FIRESTORE_REST_SETTINGS, databaseId);
    return cachedDb;
  } catch (e) {
    console.error("[admin-delete-auth-user] initializeFirestore failed", e);
    throw new HttpError(503, "Firestore Admin failed to start.");
  }
}

// ---------- Request parsing (dual-mode) ----------

const BEARER_RE = /^Bearer\s+(\S+)$/i;
const UID_RE = /^[a-zA-Z0-9_-]+$/;

function readHeader(headers: IncomingHttpHeaders | Headers | undefined, name: string): string | null {
  if (!headers) return null;
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

async function assertCallerIsAdmin(db: Firestore, callerUid: string): Promise<void> {
  const adminSnap = await db.collection("admins").doc(callerUid).get();
  if (adminSnap.exists && adminSnap.data()?.role === "admin") return;
  const userSnap = await db.collection("users").doc(callerUid).get();
  if (userSnap.exists && userSnap.data()?.role === "admin") return;
  throw new HttpError(403, "Forbidden");
}

// ---------- Entry handler ----------

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function applyCors(res: VercelResponse): void {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

export default async function adminDeleteAuthUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const token = parseBearerToken(readHeader(req.headers, "authorization"));
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

    const targetUid = readTargetUid(req.body);
    if (!isValidTargetUid(targetUid)) throw new HttpError(400, "Invalid targetUid");
    if (callerUid === targetUid) throw new HttpError(403, "Cannot delete your own authentication record");

    await assertCallerIsAdmin(db, callerUid);

    try {
      await adminAuth.deleteUser(targetUid);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      if (code === "auth/user-not-found") {
        res.status(200).json({ ok: true });
        return;
      }
      console.error("[admin-delete-auth-user] deleteUser failed", err);
      throw new HttpError(502, "Could not delete authentication record");
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    if (isHttpError(err)) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("[admin-delete-auth-user]", err);
    res.status(500).json({ error: "Could not complete authentication cleanup." });
  }
}
