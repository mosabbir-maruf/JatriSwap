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
  writeBatch,
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

export async function markNotificationReadIfUnread(notif: Pick<Notification, 'id' | 'read'>): Promise<void> {
  if (notif.read) return;
  await markNotificationRead(notif.id);
}

const MARK_ALL_READ_CHUNK = 450;

/** Marks every unread notification for this user (chunks of writes; repeats until none left). */
export async function markAllNotificationsReadForUser(userId: string): Promise<number> {
  const collectionPath = 'notifications';
  try {
    let updated = 0;
    while (true) {
      const q = query(
        collection(db, collectionPath),
        where('userId', '==', userId),
        where('read', '==', false),
        limit(MARK_ALL_READ_CHUNK),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) break;
      const batch = writeBatch(db);
      for (const snap of snapshot.docs) {
        batch.update(doc(db, collectionPath, snap.id), { read: true });
      }
      await batch.commit();
      updated += snapshot.docs.length;
      if (snapshot.docs.length < MARK_ALL_READ_CHUNK) break;
    }
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, collectionPath);
  }
}

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
