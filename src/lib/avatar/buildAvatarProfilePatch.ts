export interface BuildAvatarProfilePatchContext {
  /** Existing `users` / `admins` `googleAvatarUrl`, if any. */
  googleAvatarUrlStored?: string | null;
  /** Current Firestore `avatar` before this change. */
  currentAvatarStored?: string | null;
  authPhotoURL?: string | null;
}

/**
 * Writes `avatar` to the chosen display URL. When switching to a **local** avatar, backfills
 * `googleAvatarUrl` once from Auth or the prior remote `avatar` so the Google face stays selectable.
 */
export function buildAvatarProfilePatch(
  chosenDisplayUrl: string,
  ctx: BuildAvatarProfilePatchContext,
): { avatar: string; googleAvatarUrl?: string } {
  const chosen = chosenDisplayUrl.trim();
  const patch: { avatar: string; googleAvatarUrl?: string } = { avatar: chosen };
  const isLocal = chosen.startsWith("/");
  if (!isLocal) return patch;

  const already = trim(ctx.googleAvatarUrlStored);
  if (already) return patch;

  const fromAuth = trim(ctx.authPhotoURL);
  const fromPriorAvatar = trim(ctx.currentAvatarStored);
  const priorIsHttp = fromPriorAvatar.startsWith("http://") || fromPriorAvatar.startsWith("https://");
  const backup = fromAuth || (priorIsHttp ? fromPriorAvatar : "");
  if (backup) {
    patch.googleAvatarUrl = backup;
  }
  return patch;
}

function trim(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}
