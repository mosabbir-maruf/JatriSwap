import { validateContactFields, type RawContactFields } from "@/shared/contactValidation";

export {
  CONTACT_EMAIL_MAX,
  CONTACT_EMAIL_MIN,
  CONTACT_MESSAGE_MAX,
  CONTACT_MESSAGE_MIN,
  CONTACT_NAME_MAX,
  CONTACT_NAME_MIN,
  CONTACT_SUBJECT_MAX,
  CONTACT_SUBJECT_MIN,
} from "@/shared/contactValidation";

export type ContactFormFields = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactFormInput = ContactFormFields & {
  /** Honeypot — leave blank; bots often populate hidden inputs. */
  hp?: string;
};

export type ContactDispatchPayload = ContactFormFields & {
  hp: string;
};

/** Client-side check before POST — delegates to `shared/contactValidation.ts`. */
export function validateContactForm(
  fields: ContactFormInput,
): { ok: true; value: ContactDispatchPayload } | { ok: false; message: string } {
  const result = validateContactFields(fields as RawContactFields);
  if (result.ok === false) return result;

  const hp = typeof fields.hp === "string" ? fields.hp : "";
  return { ok: true, value: { ...result.value, hp } };
}
