import type { IncomingHttpHeaders } from "node:http";

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getContactFirestore } from "./lib/firebaseAdmin";
import {
  contactClientKeyFromIp,
  clientIpFromHeaders,
  contactSubmissionContentHash,
  contactSubmissionKey,
} from "./lib/contact/identity";
import { finalizeSuccessfulContact, reserveContactSlot, rollbackContactReservation } from "./lib/contact/firestoreGuards";
import { sanitizeContactPayload, type RawContactPayload } from "./lib/contact/sanitize";
import { formatContactTelegramText, sendTelegramPlainText } from "./lib/contact/telegram";
import { ContactHttpError } from "./lib/contact/httpError";
import { isContactHoneypotTripped } from "../shared/contactValidation";

function applyCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function handleContactPost(body: unknown, headers: IncomingHttpHeaders): Promise<{ ok: true }> {
  const data = (typeof body === "object" && body !== null ? body : {}) as RawContactPayload;

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
  const db = getContactFirestore();
  const clientKey = contactClientKeyFromIp(clientIpFromHeaders(headers));
  const submissionKey = contactSubmissionKey(
    contactSubmissionContentHash(payload),
    clientKey,
  );
  const nowMs = Date.now();

  const reserved = await reserveContactSlot(db, { submissionKey, clientKey, nowMs });

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
    console.error("contact.telegram_failed", {
      code: err instanceof Error ? err.name : "unknown",
    });
    throw new ContactHttpError(
      500,
      "Could not deliver your message right now. Please try again in a few minutes.",
    );
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    res.status(200).json(await handleContactPost(req.body, req.headers));
  } catch (err) {
    if (err instanceof ContactHttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Could not send your message right now. Please try again later." });
  }
}
