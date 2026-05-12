/** Shared Firestore user fields when creating a row from Google sign-in / sign-up. */
export function googleUserProfileFieldsForCreate(profile: {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}) {
  const photo = typeof profile.photoURL === "string" ? profile.photoURL.trim() : "";
  return {
    name: (typeof profile.displayName === "string" ? profile.displayName.trim() : "") || "User",
    email: profile.email ?? "",
    avatar: photo,
    ...(photo ? { googleAvatarUrl: photo } : {}),
    role: "user" as const,
    status: "active" as const,
  };
}

/**
 * On Google login, enrich legacy `users/{uid}` docs so `googleAvatarUrl` is available for the avatar picker
 * and empty `avatar` is backfilled from Google.
 */
export function googleAvatarMergePatchForExistingUser(
  existing: Record<string, unknown>,
  photoURL: string | null,
): Record<string, string> | null {
  const photo = typeof photoURL === "string" ? photoURL.trim() : "";
  if (!photo) return null;
  const updates: Record<string, string> = {};
  const g = typeof existing.googleAvatarUrl === "string" ? existing.googleAvatarUrl.trim() : "";
  const a = typeof existing.avatar === "string" ? existing.avatar.trim() : "";
  if (!g) updates.googleAvatarUrl = photo;
  if (!a) updates.avatar = photo;
  return Object.keys(updates).length > 0 ? updates : null;
}
