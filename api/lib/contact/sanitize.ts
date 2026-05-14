import type { RawContactFields, SanitizedContactPayload } from "../../../shared/contactValidation.js";
import { validateContactFields } from "../../../shared/contactValidation.js";
import { ContactHttpError } from "./httpError.js";

export type RawContactPayload = RawContactFields;

export type { SanitizedContactPayload };

export function sanitizeContactPayload(raw: RawContactPayload): SanitizedContactPayload {
  const result = validateContactFields(raw);
  if (result.ok === false) {
    throw new ContactHttpError(400, result.message);
  }
  return result.value;
}
