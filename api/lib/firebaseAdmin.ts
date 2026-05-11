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

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline && inline.length > 0) {
    try {
      return JSON.parse(inline) as ServiceAccount;
    } catch {
      throw misconfigured();
    }
  }

  const pathRaw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (pathRaw && pathRaw.length > 0) {
    try {
      const buf = readFileSync(pathRaw, "utf8");
      return JSON.parse(buf) as ServiceAccount;
    } catch {
      throw misconfigured();
    }
  }

  throw misconfigured();
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

  firestore = getFirestore(app, databaseId);
  return firestore;
}
