/** Structured errors mapped to HTTP responses in `api/contact.ts`. */

export class ContactHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ContactHttpError";
    this.statusCode = statusCode;
  }
}
