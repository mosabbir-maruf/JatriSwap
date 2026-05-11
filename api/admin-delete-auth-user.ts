import { isContactHttpError } from "./lib/contact/httpError";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Admin-only: deletes Firebase Authentication user `targetUid` after caller proves membership in `admins/{uid}` with role `admin`.
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
    // ignore malformed body — handler validates shape
  }

  try {
    const { handleAdminDeleteAuthPost } = await import("./lib/adminAuthDelete/handleAdminDeleteAuthPost");
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
