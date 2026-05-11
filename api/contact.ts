import { isContactHttpError } from "./lib/contact/httpError";
import { logUnexpectedContactError } from "./lib/contact/logUnexpectedContact";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * Web-standard handler (Vercel “other framework” / Vite SPA).
 * Legacy `(req, res)` exports can fail invocation with ESM + npm `"type": "module"`.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const cors = corsHeaders();

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: { ...cors, Allow: "POST, OPTIONS" } },
      );
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Malformed JSON — treat as empty; validation yields a clear 400 from sanitize.
    }

    try {
      const { handleContactPost } = await import("./lib/contact/httpPost");
      const result = await handleContactPost(body, request.headers);
      return Response.json(result, { status: 200, headers: cors });
    } catch (err) {
      if (isContactHttpError(err)) {
        return Response.json({ error: err.message }, { status: err.statusCode, headers: cors });
      }
      logUnexpectedContactError("handler", err);
      return Response.json(
        { error: "Could not send your message right now. Please try again later." },
        { status: 500, headers: cors },
      );
    }
  },
};
