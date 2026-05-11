/**
 * Single source of truth for contact field limits, sanitization, and validation.
 * Imported by the Contact UI (`src/lib/contact/contactForm.ts`) and the Vercel API (`api/`).
 */

export const CONTACT_NAME_MIN = 1;
export const CONTACT_NAME_MAX = 100;

export const CONTACT_EMAIL_MIN = 5;
export const CONTACT_EMAIL_MAX = 254;

export const CONTACT_SUBJECT_MIN = 1;
export const CONTACT_SUBJECT_MAX = 200;

export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 4000;

/** Telegram `sendMessage` text safety margin vs API limits. */
export const CONTACT_TELEGRAM_TEXT_MAX = 3500;

export type RawContactFields = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  hp?: unknown;
};

export type SanitizedContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactValidateFail = { ok: false; message: string };
export type ContactValidateOk = { ok: true; value: SanitizedContactPayload };

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripControlAndNormalizeWhitespace(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13) {
      out += " ";
      continue;
    }
    if (code < 32) continue;
    out += input[i]!;
  }
  return out.replace(/\s+/g, " ").trim();
}

function trimField(
  value: unknown,
  label: string,
  max: number,
): { ok: true; value: string } | ContactValidateFail {
  if (typeof value !== "string") {
    return { ok: false, message: `${label} is invalid.` };
  }
  const trimmed = stripControlAndNormalizeWhitespace(value);
  if (trimmed.length > max) {
    return { ok: false, message: `${label} is too long.` };
  }
  return { ok: true, value: trimmed };
}

export function isContactHoneypotTripped(raw: RawContactFields): boolean {
  if (raw.hp === undefined || raw.hp === null) return false;
  if (typeof raw.hp !== "string") return true;
  return raw.hp.trim().length > 0;
}

/** Authoritative validation for API + matching client UX checks. */
export function validateContactFields(raw: RawContactFields): ContactValidateOk | ContactValidateFail {
  const nameT = trimField(raw.name, "Name", CONTACT_NAME_MAX);
  if (nameT.ok === false) return nameT;
  const emailT = trimField(raw.email, "Email", CONTACT_EMAIL_MAX);
  if (emailT.ok === false) return emailT;
  const subjectT = trimField(raw.subject, "Subject", CONTACT_SUBJECT_MAX);
  if (subjectT.ok === false) return subjectT;
  const messageT = trimField(raw.message, "Message", CONTACT_MESSAGE_MAX);
  if (messageT.ok === false) return messageT;

  const name = nameT.value;
  const email = emailT.value.toLowerCase();
  const subject = subjectT.value;
  const message = messageT.value;

  if (name.length < CONTACT_NAME_MIN) {
    return { ok: false, message: "Please enter your name." };
  }
  if (email.length < CONTACT_EMAIL_MIN || email.length > CONTACT_EMAIL_MAX) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (!EMAIL_LIKE.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (subject.length < CONTACT_SUBJECT_MIN) {
    return { ok: false, message: "Please add a short subject." };
  }
  if (message.length < CONTACT_MESSAGE_MIN) {
    return {
      ok: false,
      message: `Please enter at least ${CONTACT_MESSAGE_MIN} characters in your message.`,
    };
  }

  return { ok: true, value: { name, email, subject, message } };
}
