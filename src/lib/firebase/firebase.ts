import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { loadFirebaseWebConfig } from './web-config';

const { firebaseOptions, firestoreDatabaseId } = loadFirebaseWebConfig();

const app = !getApps().length ? initializeApp(firebaseOptions) : getApp();
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

let appCheckInitialized = false;

/**
 * Optional Firebase App Check bootstrap.
 * Set `VITE_FIREBASE_APP_CHECK_SITE_KEY` to enable without changing runtime behavior when unset.
 */
export function initializeFirebaseAppCheck(): void {
  if (appCheckInitialized) return;
  if (typeof window === 'undefined') return;

  const siteKeyRaw = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  const siteKey = typeof siteKeyRaw === 'string' ? siteKeyRaw.trim() : '';
  if (!siteKey) return;

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckInitialized = true;
}
