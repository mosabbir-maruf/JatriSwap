import type { IncomingHttpHeaders } from "node:http";

import { getContactFirestore } from "../firebaseAdmin";
import {
  contactClientKeyFromIp,
  clientIpFromHeaders,
  contactSubmissionContentHash,
  contactSubmissionKey,
} from "./identity";
import { finalizeSuccessfulContact, reserveContactSlot, rollbackContactReservation } from "./firestoreGuards";
import { sanitizeContactPayload, type RawContactPayload } from "./sanitize";
import { formatContactTelegramText, sendTelegramPlainText } from "./telegram";
import { ContactHttpError } from "./httpError";
import { logUnexpectedContactError } from "./logUnexpectedContact";
import { isContactHoneypotTripped } from "../../../shared/contactValidation";

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

export async function handleContactPost(
  body: unknown,
  headers: IncomingHttpHeaders,
): Promise<{ ok: true }> {
  const data = normalizeJsonBody(body) as RawContactPayload;

  if (isContactHoneypotTripped(data)) {
    return { ok: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";

  if (!token || !chatId) {
    throw new ContactHttpError(
      503,
      "Contact delivery is not configured yet. Please use WhatsApp or phone.",
    );
  }

  const payload = sanitizeContactPayload(data);

  let db;
  try {
    db = getContactFirestore();
  } catch (err) {
    if (err instanceof ContactHttpError) throw err;
    logUnexpectedContactError("firestore_init", err);
    throw new ContactHttpError(
      503,
      "Contact delivery is not configured yet. Please use WhatsApp or phone.",
    );
  }

  const clientKey = contactClientKeyFromIp(clientIpFromHeaders(headers));
  const submissionKey = contactSubmissionKey(
    contactSubmissionContentHash(payload),
    clientKey,
  );
  const nowMs = Date.now();

  let reserved;
  try {
    reserved = await reserveContactSlot(db, { submissionKey, clientKey, nowMs });
  } catch (err) {
    if (err instanceof ContactHttpError) throw err;
    logUnexpectedContactError("firestore_reserve", err);
    throw new ContactHttpError(
      503,
      "Contact delivery is temporarily unavailable. Please try again later or use WhatsApp.",
    );
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
    await finalizeSuccessfulContact(dedupeRef);
    return { ok: true };
  } catch (err) {
    await rollbackContactReservation(db, dedupeRef, rateRef);
    logUnexpectedContactError("telegram_send", err);
    throw new ContactHttpError(
      500,
      "Could not deliver your message right now. Please try again in a few minutes.",
    );
  }
}
