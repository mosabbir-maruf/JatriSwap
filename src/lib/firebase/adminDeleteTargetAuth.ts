import { auth } from "@/src/lib/firebase/firebase";

function resolveAdminDeleteAuthUrl(): string {
  const raw = import.meta.env.VITE_CONTACT_API_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length > 0) return `${trimmed}/api/admin-delete-auth-user`;
  return "/api/admin-delete-auth-user";
}

/**
 * Calls Vercel `/api/admin-delete-auth-user` with the signed-in admin's ID token.
 * Requires server env: same Firebase Admin credentials as `/api/contact`.
 */
export async function deleteTargetUserAuthRecord(targetUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");

  const token = await user.getIdToken();
  const res = await fetch(resolveAdminDeleteAuthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUid }),
  });

  if (!res.ok) {
    let message = `Authentication cleanup failed (HTTP ${res.status})`;
    try {
      const data = (await res.json()) as { error?: unknown };
      if (typeof data.error === "string" && data.error.length > 0) message = `${message}: ${data.error}`;
    } catch {
      /* ignore */
    }
    if (res.status === 404) {
      message += " — API route missing? Deploy the Vercel serverless app or run `vercel dev` locally.";
    }
    throw new Error(message);
  }
}
