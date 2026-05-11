import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { App, ServiceAccount } from "firebase-admin/app";
import {
  initializeFirestore,
  type Firestore,
  type FirestoreSettings,
} from "firebase-admin/firestore";

import { ContactHttpError } from "./contact/httpError";

let firestore: Firestore | undefined;

const FIRESTORE_REST_SETTINGS: FirestoreSettings = {
  preferRest: true,
};

function misconfigured(): ContactHttpError {
  return new ContactHttpError(
    503,
    "Contact delivery is not configured yet. Please use WhatsApp or phone.",
  );
}

function parseServiceAccountJson(raw: string): ServiceAccount {
  const trimmed = raw.replace(/^\ufeff/, "").trim();
  try {
    return JSON.parse(trimmed) as ServiceAccount;
  } catch {
    throw misconfigured();
  }
}

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return parseServiceAccountJson(inline);

  const pathRaw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (pathRaw) {
    try {
      return parseServiceAccountJson(readFileSync(pathRaw, "utf8"));
    } catch {
      throw misconfigured();
    }
  }

  throw misconfigured();
}

/** Default Firestore — omit explicit `(default)` id; named DB uses third argument. */
function usesDefaultFirestoreDatabase(databaseId: string): boolean {
  const id = databaseId.trim().toLowerCase();
  return id === "(default)" || id === "default";
}

/** Shared Admin SDK app (private — `getContactFirestore` is the only callsite). */
function getOrInitFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  try {
    return initializeApp({ credential: cert(loadServiceAccount()) });
  } catch (e: unknown) {
    console.error("[firebaseAdmin] initializeApp failed", e);
    throw new ContactHttpError(
      503,
      "Firebase Admin could not start. Check FIREBASE_SERVICE_ACCOUNT_JSON (valid JSON) and project_id.",
    );
  }
}

export function getContactFirestore(): Firestore {
  if (firestore) return firestore;

  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId) throw misconfigured();

  const app = getOrInitFirebaseAdminApp();

  try {
    /** REST transport avoids loading gRPC/proto trees that often break Vercel NFT bundles. */
    firestore = usesDefaultFirestoreDatabase(databaseId)
      ? initializeFirestore(app, FIRESTORE_REST_SETTINGS)
      : initializeFirestore(app, FIRESTORE_REST_SETTINGS, databaseId);
  } catch (e: unknown) {
    console.error("[firebaseAdmin] initializeFirestore failed", e);
    throw new ContactHttpError(
      503,
      "Firestore Admin could not start. Check FIRESTORE_DATABASE_ID matches your project.",
    );
  }

  return firestore;
}
