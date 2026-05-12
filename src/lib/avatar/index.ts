export { PUBLIC_AVATAR_PATHS } from "./catalog";
export { pickRandomPublicAvatarPath } from "./pickRandomPublicAvatarPath";
export {
  resolveDisplayAvatarUrl,
  resolveUserFirestoreAvatarDisplayUrl,
  type ResolveDisplayAvatarInput,
} from "./resolveDisplayAvatarUrl";
export { profileCollectionForRole, profileDocRef } from "./profileFirestore";
export { buildAvatarProfilePatch, type BuildAvatarProfilePatchContext } from "./buildAvatarProfilePatch";
export { persistProfileDisplayAvatar } from "./persistProfileDisplayAvatar";
export { googleUserProfileFieldsForCreate, googleAvatarMergePatchForExistingUser } from "./googleSignupProfile";
