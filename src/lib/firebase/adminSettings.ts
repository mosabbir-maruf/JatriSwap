import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  limit,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType } from '../../types';
import { formatMediumDateTimeAmPm } from '@/src/lib/formatLocaleDateTime';
import { getOrLoadCached, invalidateCachedKey } from '@/src/lib/runtime/requestCache';

const ADMIN_NOTES_CACHE_KEY = 'adminSettings:global:notes';
const ADMIN_NOTES_CACHE_TTL_MS = 30_000;
const ADMIN_LOGS_CACHE_KEY = 'adminLogs:recent:50';
const ADMIN_LOGS_CACHE_TTL_MS = 15_000;

export const getAdminNotes = async (): Promise<string> => {
  const path = 'adminSettings/global';
  try {
    return getOrLoadCached(ADMIN_NOTES_CACHE_KEY, ADMIN_NOTES_CACHE_TTL_MS, async () => {
      const docRef = doc(db, 'adminSettings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().notes || '';
      }
      return '';
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return '';
  }
};

export const saveAdminNotes = async (notes: string): Promise<void> => {
  const path = 'adminSettings/global';
  try {
    const docRef = doc(db, 'adminSettings', 'global');
    await setDoc(docRef, { notes }, { merge: true });
    invalidateCachedKey(ADMIN_NOTES_CACHE_KEY);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export interface AdminLog {
  id: string;
  action: string;
  details: string;
  time: string;
  createdAt: Timestamp | Date;
}

export const getAdminLogs = async (): Promise<AdminLog[]> => {
  const path = 'adminLogs';
  try {
    return getOrLoadCached(ADMIN_LOGS_CACHE_KEY, ADMIN_LOGS_CACHE_TTL_MS, async () => {
      const q = query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | undefined;
        const date = ts?.toDate?.() ?? new Date();
        return {
          id: d.id,
          action: String(data.action ?? ''),
          details: String(data.details ?? ''),
          time: formatMediumDateTimeAmPm(date),
          createdAt: ts ?? date,
        };
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const addAdminLog = async (action: string, details: string): Promise<void> => {
  const path = 'adminLogs';
  try {
    await addDoc(collection(db, 'adminLogs'), {
      action,
      details,
      createdAt: serverTimestamp()
    });
    invalidateCachedKey(ADMIN_LOGS_CACHE_KEY);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
