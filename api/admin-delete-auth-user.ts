import { isContactHttpError } from "./lib/contact/httpError";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Admin-only: deletes Firebase Authentication user `targetUid` after the caller proves they are an
 * active admin. Mirrors `api/contact.ts` — thin entry + dynamic-imported handler under
 * `api/lib/contact/` so Vercel's serverless tracer reliably ships the dependency graph.
 */
export default async function adminDeleteAuthUser(request: Request): Promise<Response> {
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
    /* validation in handler will surface a 400 */
  }

  try {
    const { handleAdminDeleteAuthPost } = await import("./lib/contact/adminDeleteAuthHandler");
    const result = await handleAdminDeleteAuthPost(body, request.headers);
    return Response.json(result, { status: 200, headers: cors });
  } catch (err) {
    if (isContactHttpError(err)) {
      return Response.json({ error: err.message }, { status: err.statusCode, headers: cors });
    }
    console.error("[admin-delete-auth-user]", err);
    return Response.json(
      { error: "Could not complete authentication cleanup." },
      { status: 500, headers: cors },
    );
  }
}
