import type { FirebaseOptions } from 'firebase/app';

export interface FirebaseWebConfig {
  firebaseOptions: FirebaseOptions;
  firestoreDatabaseId: string;
}

function readTrimmedEnv<K extends keyof ImportMetaEnv>(key: K): string | undefined {
  const raw = import.meta.env[key];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function loadFirebaseWebConfig(): FirebaseWebConfig {
  const missing: string[] = [];

  const apiKey = readTrimmedEnv('VITE_FIREBASE_API_KEY');
  const authDomain = readTrimmedEnv('VITE_FIREBASE_AUTH_DOMAIN');
  const projectId = readTrimmedEnv('VITE_FIREBASE_PROJECT_ID');
  const storageBucket = readTrimmedEnv('VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = readTrimmedEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = readTrimmedEnv('VITE_FIREBASE_APP_ID');
  const firestoreDatabaseId = readTrimmedEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID');

  if (!apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!storageBucket) missing.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!messagingSenderId) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!appId) missing.push('VITE_FIREBASE_APP_ID');
  if (!firestoreDatabaseId) missing.push('VITE_FIREBASE_FIRESTORE_DATABASE_ID');

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missing.join(', ')}. Copy .env.example to .env.local and set them (see comments in .env.example).`,
    );
  }

  const measurementId = readTrimmedEnv('VITE_FIREBASE_MEASUREMENT_ID');

  const firebaseOptions: FirebaseOptions = {
    apiKey: apiKey!,
    authDomain: authDomain!,
    projectId: projectId!,
    storageBucket: storageBucket!,
    messagingSenderId: messagingSenderId!,
    appId: appId!,
  };

  if (measurementId) {
    firebaseOptions.measurementId = measurementId;
  }

  return {
    firebaseOptions,
    firestoreDatabaseId: firestoreDatabaseId!,
  };
}
