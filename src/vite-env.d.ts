/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_FIRESTORE_DATABASE_ID: string;
  /** Platform WhatsApp — Contact page + listing “Request to Buy” (digits extracted for wa.me). */
  readonly VITE_PUBLIC_WHATSAPP_NUMBER?: string;
  /** Optional — support phone shown on Contact (display / tel: link). */
  readonly VITE_PUBLIC_SUPPORT_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
