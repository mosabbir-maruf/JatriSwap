import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { loadFirebaseWebConfig } from './web-config';

const { firebaseOptions, firestoreDatabaseId } = loadFirebaseWebConfig();

const app = !getApps().length ? initializeApp(firebaseOptions) : getApp();
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Validating connection
import { doc, getDocFromServer } from 'firebase/firestore';

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: ", error);
    }
  }
}
testConnection();
