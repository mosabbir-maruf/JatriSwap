import { readFileSync } from "node:fs";

import { Firestore } from "@google-cloud/firestore";

import { ContactHttpError } from "./contact/httpError";

let firestore: Firestore | undefined;

interface ServiceAccountFields {
  client_email: string;
  private_key: string;
  project_id: string;
}

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

function isDefaultDatabase(databaseId: string): boolean {
  const id = databaseId.trim().toLowerCase();
  return id === "(default)" || id === "default";
}

export function getContactFirestore(): Firestore {
  if (firestore) return firestore;

  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (!databaseId) throw misconfigured();

  const sa = loadServiceAccount();

  try {
    firestore = new Firestore({
      projectId: sa.project_id,
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
      ...(isDefaultDatabase(databaseId) ? {} : { databaseId }),
      preferRest: true,
    });
  } catch (e: unknown) {
    console.error("[firebaseAdmin] Firestore init failed", e);
    throw new ContactHttpError(
      503,
      "Firestore Admin could not start. Check FIRESTORE_DATABASE_ID matches your project.",
    );
  }

  return firestore;
}
