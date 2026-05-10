import { auth } from './firebase';
import { OperationType } from '../../types';

/** Thrown on Firestore failures — safe message for UI; no emails or provider data in `message`. */
export class FirestoreServiceError extends Error {
  constructor(
    public readonly operationType: OperationType,
    public readonly path: string | null,
    public readonly causeUnknown: unknown,
  ) {
    super(`Firestore ${operationType}${path ? ` (${path})` : ''}`);
    this.name = 'FirestoreServiceError';
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const uid = auth.currentUser?.uid ?? undefined;
  const msg = error instanceof Error ? error.message : String(error);
  console.error('Firestore Error:', {
    operationType,
    path,
    userId: uid,
    code: typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined,
    message: msg,
  });
  throw new FirestoreServiceError(operationType, path, error);
}
