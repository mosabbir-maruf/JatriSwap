/** Structured errors mapped to HTTP responses in `api/contact.ts`. */

export class ContactHttpError extends Error {
  readonly statusCode: number;
  /** Stable marker — do not rely on `instanceof Error` or `name` alone (bundlers / chunks can break them). */
  readonly _contactHttpError = true as const;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ContactHttpError";
    this.statusCode = statusCode;
  }
}

/** Works across bundled chunks where `instanceof ContactHttpError` / `instanceof Error` can fail. */
export function isContactHttpError(err: unknown): err is ContactHttpError {
  if (typeof err !== "object" || err === null) return false;
  const o = err as { _contactHttpError?: unknown; statusCode?: unknown };
  return o._contactHttpError === true && typeof o.statusCode === "number";
}
