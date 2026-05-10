import type { UserAccountStatus } from "@/src/types";
import { updateUser } from "@/src/lib/firebase/users";

/** Single entry point for admin moderation writes on `users/{uid}.status`. */
export async function updateUserModerationStatus(userId: string, status: UserAccountStatus): Promise<void> {
  await updateUser(userId, { status });
}
