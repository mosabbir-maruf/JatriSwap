import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { App, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
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

/** Shared Admin SDK app (Firestore + Auth). */
export function getOrInitFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const serviceAccount = loadServiceAccount();
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

/** Deletes Firebase Authentication users server-side (e.g. after Firestore cleanup). */
export function getFirebaseAdminAuth(): Auth {
  return getAuth(getOrInitFirebaseAdminApp());
}

export function getContactFirestore(): Firestore {
  if (firestore) return firestore;

  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId || databaseId.length === 0) {
    throw misconfigured();
  }

  const app = getOrInitFirebaseAdminApp();

  /** REST transport avoids loading gRPC/proto trees that often break Vercel NFT bundles. */
  firestore = usesDefaultFirestoreDatabase(databaseId)
    ? initializeFirestore(app, FIRESTORE_REST_SETTINGS)
    : initializeFirestore(app, FIRESTORE_REST_SETTINGS, databaseId);

  return firestore;
}
