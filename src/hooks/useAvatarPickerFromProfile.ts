import { useMemo } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@/src/types";
import { resolveDisplayAvatarUrl } from "@/src/lib/avatar/resolveDisplayAvatarUrl";

/** Shared memoized avatar display + Google tile URL for pickers (Dashboard, Edit Profile). */
export function useAvatarPickerFromProfile(currentUser: User | null, firebaseUser: FirebaseUser | null) {
  const displaySrc = useMemo(
    () =>
      resolveDisplayAvatarUrl({
        storedAvatar: currentUser?.avatar,
        googleAvatarUrl: currentUser?.googleAvatarUrl,
        authPhotoURL: firebaseUser?.photoURL ?? null,
      }),
    [currentUser?.avatar, currentUser?.googleAvatarUrl, firebaseUser?.photoURL],
  );

  const googlePickerUrl = useMemo(() => {
    const stored = typeof currentUser?.googleAvatarUrl === "string" ? currentUser.googleAvatarUrl.trim() : "";
    if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
    const auth = typeof firebaseUser?.photoURL === "string" ? firebaseUser.photoURL.trim() : "";
    if (auth.startsWith("http://") || auth.startsWith("https://")) return auth;
    return undefined;
  }, [currentUser?.googleAvatarUrl, firebaseUser?.photoURL]);

  return { displaySrc, googlePickerUrl };
}
