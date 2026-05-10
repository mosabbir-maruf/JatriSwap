import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType, Notification } from '../../types';

/** Keep dashboard Alerts subscription bounded (newest first). */
const NOTIFICATIONS_SUBSCRIPTION_LIMIT = 80;

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const path = 'notifications';
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATIONS_SUBSCRIPTION_LIMIT),
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      } as Notification;
    });
    callback(notifications);
  }, (error) => {
    console.error('[subscribeToNotifications]', path, error);
    callback([]);
  });
};

export const markNotificationRead = async (notificationId: string) => {
  const path = `notifications/${notificationId}`;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const createNotification = async (userId: string, type: 'alert' | 'info' | 'success', title: string, message: string) => {
  const path = 'notifications';
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
