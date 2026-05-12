import { doc, type DocumentReference, type Firestore } from "firebase/firestore";
import type { Role } from "@/src/types";

/** Firestore profile document for the signed-in account (sellers use `users`, staff rows use `admins`). */
export function profileCollectionForRole(role: Role): "users" | "admins" {
  if (role === "user") return "users";
  return "admins";
}

export function profileDocRef(db: Firestore, uid: string, role: Role): DocumentReference {
  return doc(db, profileCollectionForRole(role), uid);
}
