import { vercelDeployApiUrl } from "@/src/lib/vercelDeployApiUrl";

export type ContactFormPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot — forwarded verbatim; must stay empty for humans. */
  hp?: string;
};

export class ContactSubmitError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ContactSubmitError";
    this.status = status;
  }
}

function contactEndpointUrl(): string {
  return vercelDeployApiUrl("/api/contact");
}

type ContactApiBody = { ok?: unknown; error?: unknown };

function readErrorMessage(body: ContactApiBody, fallback: string): string {
  const e = body.error;
  return typeof e === "string" && e.length > 0 ? e : fallback;
}

/** POST `/api/contact` — Telegram credentials stay server-side on Vercel. */
export async function submitContactMessage(payload: ContactFormPayload): Promise<void> {
  const url = contactEndpointUrl();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ContactSubmitError(0, "Network error. Check your connection or try again.");
  }

  const json = (await res.json().catch(() => ({}))) as ContactApiBody;

  if (res.ok && json.ok === true) return;

  const fallback =
    res.status === 503
      ? "Contact delivery is not configured yet. Please use WhatsApp or phone."
      : res.status === 429
        ? "Too many attempts. Please wait before sending another message."
        : "Something went wrong. Please try again.";

  throw new ContactSubmitError(res.status, readErrorMessage(json, fallback));
}

export function contactSubmitErrorMessage(error: unknown): string {
  if (!(error instanceof ContactSubmitError)) {
    return "Could not send your message. Please try again or use WhatsApp.";
  }
  if (error.message.length > 0) return error.message;
  if (error.status === 503) {
    return "Contact delivery is not configured yet. Please use WhatsApp or phone.";
  }
  return "Could not send your message. Please try again or use WhatsApp.";
}
