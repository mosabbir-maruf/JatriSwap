import { createPublicKey, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

/**
 * Admin-only POST `/api/admin-delete-auth-user`.
 *
 * Fully self-contained — only `node:*` imports. Vercel's serverless tracer repeatedly dropped any
 * `./lib/**` import for this function, so all helpers live in this file. Net effect: zero npm deps
 * (firebase-admin and @google-cloud/firestore are no longer needed for this route either).
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

// ---------- Service account loading ----------

interface ServiceAccountFields {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedServiceAccount: ServiceAccountFields | undefined;

function parseServiceAccountJson(raw: string): ServiceAccountFields {
  const trimmed = raw.replace(/^\ufeff/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new HttpError(
      503,
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the service account file contents as one line in Vercel env.",
    );
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof (parsed as { client_email?: unknown }).client_email !== "string" ||
    typeof (parsed as { private_key?: unknown }).private_key !== "string" ||
    typeof (parsed as { project_id?: unknown }).project_id !== "string"
  ) {
    throw new HttpError(503, "Service account JSON is missing client_email / private_key / project_id.");
  }
  const sa = parsed as ServiceAccountFields;
  return {
    client_email: sa.client_email,
    private_key: sa.private_key.replace(/\\n/g, "\n"),
    project_id: sa.project_id,
  };
}

function loadServiceAccount(): ServiceAccountFields {
  if (cachedServiceAccount) return cachedServiceAccount;

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    cachedServiceAccount = parseServiceAccountJson(inline);
    return cachedServiceAccount;
  }
  const pathRaw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (pathRaw) {
    try {
      cachedServiceAccount = parseServiceAccountJson(readFileSync(pathRaw, "utf8"));
      return cachedServiceAccount;
    } catch {
      throw new HttpError(503, "Could not read service account file referenced by env path.");
    }
  }
  throw new HttpError(503, "FIREBASE_SERVICE_ACCOUNT_JSON (or path env) is not set on Vercel.");
}

// ---------- Firestore REST (admin role check only) ----------

interface FirestoreStringValue {
  stringValue?: string;
}
interface FirestoreDocResponse {
  fields?: Record<string, FirestoreStringValue>;
}

function firestoreDocsBase(projectId: string): string {
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId) throw new HttpError(503, "FIRESTORE_DATABASE_ID is not set on Vercel.");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/${encodeURIComponent(databaseId)}/documents`;
}

/** Returns the `role` field value for `<collection>/<uid>`, or null when the doc is missing. */
async function readDocRole(
  accessToken: string,
  projectId: string,
  collection: string,
  uid: string,
): Promise<string | null> {
  const url = `${firestoreDocsBase(projectId)}/${collection}/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new HttpError(503, `Firestore read failed (${res.status})`);
  }
  const json = (await res.json()) as FirestoreDocResponse;
  return json.fields?.role?.stringValue ?? null;
}

// ---------- Firebase ID token verification (native RS256 + JWKS) ----------

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken%40system.gserviceaccount.com";

interface JwksCache {
  keys: Map<string, string>;
  expiresAt: number;
}
let jwksCache: JwksCache | undefined;

function base64UrlDecode(str: string): Buffer {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFirebaseJwks(): Promise<Map<string, string>> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;

  const res = await fetch(FIREBASE_JWKS_URL);
  if (!res.ok) throw new HttpError(503, "Could not fetch Firebase signing keys.");

  // Respect Cache-Control max-age if present, otherwise 1h
  let ttlMs = 60 * 60 * 1000;
  const cc = res.headers.get("cache-control");
  if (cc) {
    const m = /max-age=(\d+)/i.exec(cc);
    if (m) ttlMs = Number(m[1]) * 1000;
  }

  const raw = (await res.json()) as Record<string, string>;
  const keys = new Map<string, string>(Object.entries(raw));
  jwksCache = { keys, expiresAt: now + ttlMs };
  return keys;
}

interface FirebaseIdTokenClaims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  iat?: unknown;
  exp?: unknown;
  auth_time?: unknown;
}

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Malformed ID token");

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: { alg?: unknown; kid?: unknown };
  let claims: FirebaseIdTokenClaims;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
    claims = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    throw new HttpError(401, "Could not decode ID token");
  }

  if (header.alg !== "RS256") throw new HttpError(401, "Unexpected token algorithm");
  if (typeof header.kid !== "string" || header.kid.length === 0) {
    throw new HttpError(401, "Token missing key id");
  }

  const jwks = await getFirebaseJwks();
  const cert = jwks.get(header.kid);
  if (!cert) throw new HttpError(401, "Token signed by unknown key");

  const publicKey = createPublicKey(cert);
  const signedData = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  const signature = base64UrlDecode(signatureB64);

  if (!cryptoVerify("RSA-SHA256", signedData, publicKey, signature)) {
    throw new HttpError(401, "Invalid token signature");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof claims.exp === "number" ? claims.exp : 0;
  const iat = typeof claims.iat === "number" ? claims.iat : 0;
  const sub = typeof claims.sub === "string" ? claims.sub : "";

  if (exp <= nowSec) throw new HttpError(401, "Token expired");
  if (iat > nowSec + 60) throw new HttpError(401, "Token issued in the future");
  if (claims.aud !== projectId) throw new HttpError(401, "Token has wrong audience");
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new HttpError(401, "Token has wrong issuer");
  }
  if (sub.length === 0 || sub.length > 128) throw new HttpError(401, "Token subject is invalid");

  return sub;
}

// ---------- Service-account → Google OAuth access token ----------

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADMIN_SCOPES = [
  "https://www.googleapis.com/auth/firebase",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/identitytoolkit",
].join(" ");

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}
let cachedAccessToken: AccessTokenCache | undefined;

async function getGoogleAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 60s before expiry to avoid mid-flight expiration.
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.token;
  }

  const sa = loadServiceAccount();
  const nowSec = Math.floor(now / 1000);
  const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64UrlEncode(
    Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: GOOGLE_TOKEN_URL,
        scope: ADMIN_SCOPES,
        iat: nowSec,
        exp: nowSec + 3600,
      }),
    ),
  );
  const signature = base64UrlEncode(
    cryptoSign("RSA-SHA256", Buffer.from(`${header}.${payload}`, "utf8"), sa.private_key),
  );
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[admin-delete-auth-user] OAuth token exchange failed", { status: res.status, text });
    throw new HttpError(503, "Could not acquire Google access token.");
  }

  const data = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof data.access_token !== "string" || typeof data.expires_in !== "number") {
    throw new HttpError(503, "Malformed Google access token response.");
  }
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedAccessToken.token;
}

// ---------- Firebase Auth user delete (REST) ----------

async function deleteFirebaseAuthUser(targetUid: string): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const sa = loadServiceAccount();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/accounts:delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: targetUid }),
    },
  );

  if (res.ok) return;

  const text = await res.text().catch(() => "");
  // Identity Toolkit returns USER_NOT_FOUND when the user is already gone — treat as success.
  if (/USER_NOT_FOUND/.test(text)) return;

  console.error("[admin-delete-auth-user] REST deleteUser failed", { status: res.status, text });
  throw new HttpError(502, "Could not delete authentication record");
}

// ---------- Request parsing (dual-mode headers) ----------

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
  const m = BEARER_RE.exec(rawAuthHeader.trim());
  return m?.[1] ?? null;
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

async function assertCallerIsAdmin(callerUid: string): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const sa = loadServiceAccount();
  if ((await readDocRole(accessToken, sa.project_id, "admins", callerUid)) === "admin") return;
  if ((await readDocRole(accessToken, sa.project_id, "users", callerUid)) === "admin") return;
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

    const sa = loadServiceAccount();
    const callerUid = await verifyFirebaseIdToken(token, sa.project_id);

    const targetUid = readTargetUid(req.body);
    if (!isValidTargetUid(targetUid)) throw new HttpError(400, "Invalid targetUid");
    if (callerUid === targetUid) throw new HttpError(403, "Cannot delete your own authentication record");

    await assertCallerIsAdmin(callerUid);
    await deleteFirebaseAuthUser(targetUid);

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
