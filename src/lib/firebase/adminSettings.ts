import { collection, doc, getDoc, setDoc, addDoc, getDocs, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType } from '../../types';

export const getAdminNotes = async (): Promise<string> => {
  const path = 'adminSettings/global';
  try {
    const docRef = doc(db, 'adminSettings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().notes || '';
    }
    return '';
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
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export interface AdminLog {
  id: string;
  action: string;
  details: string;
  time: string;
  createdAt: any;
}

export const getAdminLogs = async (): Promise<AdminLog[]> => {
  const path = 'adminLogs';
  try {
    const q = query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate() || new Date();
      return {
        id: doc.id,
        action: data.action,
        details: data.details,
        time: date.toLocaleString(),
        createdAt: data.createdAt
      };
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
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
