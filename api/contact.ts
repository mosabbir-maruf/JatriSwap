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
 * Named HTTP exports match Vercel’s documented shape for non-Next `/api/*.ts` routes.
 * `export default { fetch }` can fail invocation with some Vite + ESM builds.
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request): Promise<Response> {
  const cors = corsHeaders();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Malformed JSON — treat as empty; validation yields 400 from sanitize.
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
}
