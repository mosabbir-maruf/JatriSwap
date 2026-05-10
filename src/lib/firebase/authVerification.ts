import type { User as FirebaseUser } from 'firebase/auth';

/** Email/password accounts must verify their inbox; OAuth users are typically already verified by the provider. */
export function needsEmailVerification(user: FirebaseUser | null): boolean {
  if (!user || user.emailVerified) return false;
  return user.providerData.some((p) => p.providerId === 'password');
}
