import type { IncomingMessage, ServerResponse } from "node:http";

import { isContactHttpError } from "./lib/contact/httpError.js";
import { logUnexpectedContactError } from "./lib/contact/logUnexpectedContact.js";

/**
 * Vercel's `@vercel/node` runtime decorates the standard Node request/response with `body` (auto-parsed
 * when content-type is JSON) and `status()` / `json()` helpers on the response. Typed minimally here so
 * we don't take a dependency on `@vercel/node` purely for these signatures.
 */
type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const IS_DEV = process.env.NODE_ENV !== "production";

function applyCors(res: VercelResponse): void {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

/**
 * Contact form → Telegram. Node-style `(req, res)` so Vercel finalizes the response — Web-Standard
 * `Request → Response` returns were ignored in Node-mode invocations, causing 30s timeouts.
 *
 * Body and header parsing happens inside `handleContactPost` / `identity.ts` (both dual-mode).
 */
export default async function contactApi(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { handleContactPost } = await import("./lib/contact/httpPost.js");
    const result = await handleContactPost(req.body, req.headers);
    res.status(200).json(result);
  } catch (err) {
    if (isContactHttpError(err)) {
      res.status(err.statusCode).json({
        error: IS_DEV ? err.message : "Could not send your message right now. Please try again later.",
      });
      return;
    }
    logUnexpectedContactError("handler", err);
    res
      .status(500)
      .json({ error: "Could not send your message right now. Please try again later." });
  }
}
