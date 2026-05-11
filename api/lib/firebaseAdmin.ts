import { sign as cryptoSign } from "node:crypto";
import { readFileSync } from "node:fs";

import { ContactHttpError } from "./contact/httpError";
import { Firestore } from "./contact/firestoreRest";

let firestore: Firestore | undefined;

interface ServiceAccountFields {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let cachedServiceAccount: ServiceAccountFields | undefined;
let cachedAccessToken: AccessTokenCache | undefined;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADMIN_SCOPES = [
  "https://www.googleapis.com/auth/datastore",
  "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

function misconfigured(): ContactHttpError {
  return new ContactHttpError(
    503,
    "Contact delivery is not configured yet. Please use WhatsApp or phone.",
  );
}

function parseServiceAccountJson(raw: string): ServiceAccountFields {
  const trimmed = raw.replace(/^\ufeff/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw misconfigured();
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof (parsed as { client_email?: unknown }).client_email !== "string" ||
    typeof (parsed as { private_key?: unknown }).private_key !== "string" ||
    typeof (parsed as { project_id?: unknown }).project_id !== "string"
  ) {
    throw misconfigured();
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
      throw misconfigured();
    }
  }

  throw misconfigured();
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Service-account JWT → Google OAuth access token. Cached until 60s before expiry. */
async function getGoogleAccessToken(): Promise<string> {
  const now = Date.now();
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
    console.error("[firebaseAdmin] OAuth token exchange failed", { status: res.status, text });
    throw new ContactHttpError(503, "Could not acquire Google access token.");
  }

  const data = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof data.access_token !== "string" || typeof data.expires_in !== "number") {
    throw new ContactHttpError(503, "Malformed Google access token response.");
  }
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedAccessToken.token;
}

export function getContactFirestore(): Firestore {
  if (firestore) return firestore;
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId) throw misconfigured();
  const sa = loadServiceAccount();
  firestore = new Firestore({
    projectId: sa.project_id,
    databaseId,
    getAccessToken: getGoogleAccessToken,
  });
  return firestore;
}
