import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { resolveUserFirestoreAvatarDisplayUrl } from "@/src/lib/avatar";
import { initialsFromDisplayName } from "@/src/lib/initialsFromDisplayName";

export type AdminUserFirestoreAvatarProps = {
  avatar?: string | null;
  googleAvatarUrl?: string | null;
  authPhotoURL?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
};

function AdminUserFirestoreAvatarInner({
  avatar,
  googleAvatarUrl,
  authPhotoURL,
  name,
  className,
  fallbackClassName,
}: AdminUserFirestoreAvatarProps) {
  return (
    <Avatar className={cn(className)} aria-hidden>
      <AvatarImage
        src={resolveUserFirestoreAvatarDisplayUrl({ avatar, googleAvatarUrl, authPhotoURL })}
        alt=""
        className="rounded-none"
      />
      <AvatarFallback
        className={cn(
          "rounded-none bg-muted font-mono font-bold uppercase text-muted-foreground",
          fallbackClassName,
        )}
      >
        {initialsFromDisplayName(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function adminUserFirestoreAvatarPropsEqual(
  a: AdminUserFirestoreAvatarProps,
  b: AdminUserFirestoreAvatarProps,
): boolean {
  return (
    a.avatar === b.avatar &&
    a.googleAvatarUrl === b.googleAvatarUrl &&
    a.authPhotoURL === b.authPhotoURL &&
    a.name === b.name &&
    a.className === b.className &&
    a.fallbackClassName === b.fallbackClassName
  );
}

/** Firestore-backed user avatar for admin list/detail (no extra reads; skips re-render when row fields unchanged). */
export const AdminUserFirestoreAvatar = memo(AdminUserFirestoreAvatarInner, adminUserFirestoreAvatarPropsEqual);
