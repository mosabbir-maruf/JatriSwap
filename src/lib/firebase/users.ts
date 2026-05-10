import { doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType, User } from '../../types';

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

export const deleteUserData = async (userId: string): Promise<void> => {
  const path = `users/${userId}/data`;
  try {
    // Note: To properly hard delete all user data, we must query relevant collections and delete documents.
    
    // 1. Delete tickets posted by the user
    const ticketsQuery = query(collection(db, 'tickets'), where('sellerId', '==', userId));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const ticketDeletePromises = ticketsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'tickets', docSnap.id)));
    await Promise.all(ticketDeletePromises);
    
    // 2. Delete notifications for the user
    const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const notificationsSnapshot = await getDocs(notificationsQuery);
    const notificationDeletePromises = notificationsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'notifications', docSnap.id)));
    await Promise.all(notificationDeletePromises);

    // 3. Delete the user document itself
    await deleteDoc(doc(db, 'users', userId));
    
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
