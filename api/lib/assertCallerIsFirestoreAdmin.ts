import type { Firestore } from "firebase-admin/firestore";

import { ContactHttpError } from "./contact/httpError";

/** Caller must be an active admin (`admins` or `users` doc with `role === 'admin'`). */
export async function assertCallerIsFirestoreAdmin(db: Firestore, callerUid: string): Promise<void> {
  const adminSnap = await db.collection("admins").doc(callerUid).get();
  if (adminSnap.exists && adminSnap.data()?.role === "admin") return;

  const userSnap = await db.collection("users").doc(callerUid).get();
  if (userSnap.exists && userSnap.data()?.role === "admin") return;

  throw new ContactHttpError(403, "Forbidden");
}
