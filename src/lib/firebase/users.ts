import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType, User } from '../../types';

const FIRESTORE_BATCH_OPERATIONS = 450;

async function deleteRefsInBatches(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_OPERATIONS) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + FIRESTORE_BATCH_OPERATIONS)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

export const getUser = async (userId: string): Promise<User | null> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const createUser = async (userId: string, data: Omit<User, 'id' | 'joinedAt'>): Promise<void> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      ...data,
      joinedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { ...data });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

/**
 * Hard-delete Firestore data tied to this account: listings (and staff notes), buyer/seller purchase
 * requests, scam reports, notifications, optional `admins/{userId}` row, then `users/{userId}`.
 * Firebase Authentication must still be removed separately (e.g. user-facing account settings uses `deleteUser`).
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  const path = `deleteUserData(${userId})`;
  try {
    const ticketSnap = await getDocs(query(collection(db, 'tickets'), where('sellerId', '==', userId)));
    const ticketIds = ticketSnap.docs.map((d) => d.id);

    const reportSellerSnap = await getDocs(
      query(collection(db, 'ticketReports'), where('sellerId', '==', userId)),
    );
    const reportReporterSnap = await getDocs(
      query(collection(db, 'ticketReports'), where('reporterId', '==', userId)),
    );
    const reportRefsByPath = new Map<string, DocumentReference>();
    for (const d of [...reportSellerSnap.docs, ...reportReporterSnap.docs]) {
      reportRefsByPath.set(d.ref.path, d.ref);
    }

    const prSellerSnap = await getDocs(
      query(collection(db, 'purchaseRequests'), where('sellerId', '==', userId)),
    );
    const prBuyerSnap = await getDocs(
      query(collection(db, 'purchaseRequests'), where('buyerUserId', '==', userId)),
    );
    const prRefsByPath = new Map<string, DocumentReference>();
    for (const d of [...prSellerSnap.docs, ...prBuyerSnap.docs]) {
      prRefsByPath.set(d.ref.path, d.ref);
    }

    const notificationsSnap = await getDocs(
      query(collection(db, 'notifications'), where('userId', '==', userId)),
    );

    const ticketRefs: DocumentReference[] = [];
    for (const tid of ticketIds) {
      ticketRefs.push(doc(db, 'ticketAdminNotes', tid));
      ticketRefs.push(doc(db, 'tickets', tid));
    }

    await deleteRefsInBatches([...reportRefsByPath.values()]);
    await deleteRefsInBatches([...prRefsByPath.values()]);
    await deleteRefsInBatches(notificationsSnap.docs.map((d) => d.ref));
    await deleteRefsInBatches(ticketRefs);

    const adminRef = doc(db, 'admins', userId);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      await deleteDoc(adminRef);
    }

    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
