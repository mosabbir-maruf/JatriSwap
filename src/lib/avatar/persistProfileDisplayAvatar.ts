import { updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase/firebase";
import type { Role } from "@/src/types";
import { buildAvatarProfilePatch } from "./buildAvatarProfilePatch";
import { profileDocRef } from "./profileFirestore";

export async function persistProfileDisplayAvatar(args: {
  uid: string;
  role: Role;
  chosenDisplayUrl: string;
  googleAvatarUrlStored?: string | null;
  currentAvatarStored?: string | null;
  authPhotoURL?: string | null;
}): Promise<void> {
  const patch = buildAvatarProfilePatch(args.chosenDisplayUrl.trim(), {
    googleAvatarUrlStored: args.googleAvatarUrlStored,
    currentAvatarStored: args.currentAvatarStored,
    authPhotoURL: args.authPhotoURL,
  });
  await updateDoc(profileDocRef(db, args.uid, args.role), patch);
}
