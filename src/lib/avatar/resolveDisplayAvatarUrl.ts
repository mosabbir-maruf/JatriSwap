export interface ResolveDisplayAvatarInput {
  /** Firestore `avatar` — local `/avatar/...` or remote (e.g. Google). */
  storedAvatar?: string | null;
  /** Persisted Google (or other) photo URL for picker + fallback when `avatar` is a local path. */
  googleAvatarUrl?: string | null;
  /** Firebase Auth `photoURL` — used when legacy docs omit `googleAvatarUrl`. */
  authPhotoURL?: string | null;
}

function trimUrl(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Single source of truth for which image URL to show in the UI.
 * Order: stored Firestore avatar → stored Google mirror → Auth photo.
 */
export function resolveDisplayAvatarUrl(input: ResolveDisplayAvatarInput): string | undefined {
  const a = trimUrl(input.storedAvatar);
  if (a) return a;
  const g = trimUrl(input.googleAvatarUrl);
  if (g) return g;
  const p = trimUrl(input.authPhotoURL);
  if (p) return p;
  return undefined;
}

/**
 * Avatar URL from a Firestore `users` (or `AdminUserRow`) document alone.
 * Centralizes the `storedAvatar` / `googleAvatarUrl` / optional Auth mirror mapping for admin UIs
 * that do not attach Firebase Auth `photoURL` (list reads, admin profile view).
 */
export function resolveUserFirestoreAvatarDisplayUrl(user: {
  avatar?: string | null;
  googleAvatarUrl?: string | null;
  authPhotoURL?: string | null;
}): string | undefined {
  return resolveDisplayAvatarUrl({
    storedAvatar: user.avatar,
    googleAvatarUrl: user.googleAvatarUrl,
    authPhotoURL: user.authPhotoURL ?? null,
  });
}
