import { getContactFirestore } from "../firebaseAdmin.js";
import type { DocumentReference, Firestore } from "./firestoreRest.js";
import {
  contactClientKeyFromIp,
  clientIpFromHeaders,
  contactSubmissionContentHash,
  contactSubmissionKey,
  type ContactRequestHeaders,
} from "./identity.js";
import { finalizeSuccessfulContact, reserveContactSlot, rollbackContactReservation } from "./firestoreGuards.js";
import { sanitizeContactPayload, type RawContactPayload } from "./sanitize.js";
import { formatContactTelegramText, sendTelegramPlainText } from "./telegram.js";
import { ContactHttpError, isContactHttpError } from "./httpError.js";
import { logUnexpectedContactError } from "./logUnexpectedContact.js";
import { isContactHoneypotTripped } from "../../../shared/contactValidation.js";

const NOT_CONFIGURED = "Contact delivery is not configured yet. Please use WhatsApp or phone.";
const FIRESTORE_UNAVAILABLE =
  "Contact delivery is temporarily unavailable. Please try again later or use WhatsApp.";
const DELIVERY_FAILED = "Could not deliver your message right now. Please try again in a few minutes.";

/** Vercel may supply `body` as an object or as a raw JSON string depending on runtime/content-type. */
function normalizeJsonBody(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) return {};
  if (typeof body === "string") {
    const t = body.trim();
    if (t.length === 0) return {};
    try {
      const parsed: unknown = JSON.parse(t);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function throw503UnlessContactHttp(err: unknown, context: string, message: string): never {
  if (isContactHttpError(err)) throw err;
  logUnexpectedContactError(context, err);
  throw new ContactHttpError(503, message);
}

async function rollbackAndThrow500(
  db: Firestore,
  dedupeRef: DocumentReference,
  rateRef: DocumentReference,
  err: unknown,
  context: string,
): Promise<never> {
  await rollbackContactReservation(db, dedupeRef, rateRef);
  logUnexpectedContactError(context, err);
  throw new ContactHttpError(500, DELIVERY_FAILED);
}

export async function handleContactPost(
  body: unknown,
  headers: ContactRequestHeaders,
): Promise<{ ok: true }> {
  const data = normalizeJsonBody(body) as RawContactPayload;

  if (isContactHoneypotTripped(data)) {
    return { ok: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";

  if (!token || !chatId) {
    throw new ContactHttpError(503, NOT_CONFIGURED);
  }

  const payload = sanitizeContactPayload(data);

  let db: Firestore;
  try {
    db = getContactFirestore();
  } catch (err) {
    throw503UnlessContactHttp(err, "firestore_init", NOT_CONFIGURED);
  }

  const clientKey = contactClientKeyFromIp(clientIpFromHeaders(headers));
  const submissionKey = contactSubmissionKey(
    contactSubmissionContentHash(payload),
    clientKey,
  );
  const nowMs = Date.now();

  let reserved: Awaited<ReturnType<typeof reserveContactSlot>>;
  try {
    reserved = await reserveContactSlot(db, { submissionKey, clientKey, nowMs });
  } catch (err) {
    throw503UnlessContactHttp(err, "firestore_reserve", FIRESTORE_UNAVAILABLE);
  }

  if (reserved.kind === "duplicate_silent") {
    return { ok: true };
  }

  const { dedupeRef, rateRef } = reserved;

  try {
    await sendTelegramPlainText({
      token,
      chatId,
      text: formatContactTelegramText(payload),
    });
  } catch (err) {
    await rollbackAndThrow500(db, dedupeRef, rateRef, err, "telegram_send");
  }

  try {
    await finalizeSuccessfulContact(dedupeRef);
  } catch (err) {
    await rollbackAndThrow500(db, dedupeRef, rateRef, err, "finalize_dedupe");
  }

  return { ok: true };
}
