/** Structured errors mapped to HTTP responses in `api/contact.ts`. */

export class ContactHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ContactHttpError";
    this.statusCode = statusCode;
  }
}

/** Works across bundled chunks where `instanceof ContactHttpError` can fail. */
export function isContactHttpError(err: unknown): err is ContactHttpError {
  if (typeof err !== "object" || err === null || !(err instanceof Error)) return false;
  const statusCode = (err as { statusCode?: unknown }).statusCode;
  return err.name === "ContactHttpError" && typeof statusCode === "number";
}
