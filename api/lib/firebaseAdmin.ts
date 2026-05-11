import { readFileSync } from "node:fs";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { ContactHttpError } from "./contact/httpError";

let firestore: Firestore | undefined;

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

/** Default Firestore instance — use `getFirestore(app)` without an id (more reliable than passing `(default)`). */
function usesDefaultFirestoreDatabase(databaseId: string): boolean {
  const id = databaseId.trim().toLowerCase();
  return id === "(default)" || id === "default";
}

export function getContactFirestore(): Firestore {
  if (firestore) return firestore;

  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId || databaseId.length === 0) {
    throw misconfigured();
  }

  const serviceAccount = loadServiceAccount();

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
    });

  firestore = usesDefaultFirestoreDatabase(databaseId)
    ? getFirestore(app)
    : getFirestore(app, databaseId);

  return firestore;
}
