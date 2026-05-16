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
  /** Optional Firebase App Check reCAPTCHA v3 site key. */
  readonly VITE_FIREBASE_APP_CHECK_SITE_KEY?: string;
  /** Platform WhatsApp — Contact page + listing “Request to Buy” (digits extracted for wa.me). */
  readonly VITE_PUBLIC_WHATSAPP_NUMBER?: string;
  /** Optional — support phone shown on Contact (display / tel: link). */
  readonly VITE_PUBLIC_SUPPORT_PHONE?: string;
  /**
   * Optional public site origin for mailto links (e.g. https://jatriswap.example.com).
   * When set, admin email templates use this instead of window.location.origin so links are not localhost in dev.
   */
  readonly VITE_PUBLIC_SITE_URL?: string;
  /** Optional — public Facebook page / group shown in the footer. */
  readonly VITE_PUBLIC_FACEBOOK_URL?: string;
  /**
   * Optional — origin of the deployed API when the Contact page is not served from the same host
   * (e.g. local Vite dev calling a preview deployment). Example: `https://your-app.vercel.app`
   * (no trailing slash). When unset, the client posts to same-origin `/api/contact` and `/api/admin-delete-auth-user`.
   */
  readonly VITE_CONTACT_API_URL?: string;
  /** Google Analytics 4 measurement ID (`G-…`). When unset or empty, gtag is not loaded. */
  readonly VITE_PUBLIC_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
