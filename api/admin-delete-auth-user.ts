import type { IncomingMessage, ServerResponse } from "node:http";

import { isContactHttpError } from "./lib/contact/httpError";

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
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function applyCors(res: VercelResponse): void {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

/**
 * Admin-only POST endpoint: deletes a target Firebase Authentication user after the caller proves they
 * are an active admin. Uses Node-style `(req, res)` so Vercel reliably finalizes the response — earlier
 * Web-Standard `Request → Response` signature caused timeouts when the runtime fell back to Node mode.
 */
export default async function adminDeleteAuthUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
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
    const { handleAdminDeleteAuthPost } = await import("./lib/contact/adminDeleteAuthHandler");
    const result = await handleAdminDeleteAuthPost(req.body, req.headers);
    res.status(200).json(result);
  } catch (err) {
    if (isContactHttpError(err)) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("[admin-delete-auth-user]", err);
    res.status(500).json({ error: "Could not complete authentication cleanup." });
  }
}
