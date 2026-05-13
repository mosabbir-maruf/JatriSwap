const IS_DEV = import.meta.env.DEV;

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  const raw = (error as { code?: unknown }).code;
  return typeof raw === "string" ? raw : "";
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object" || !("message" in error)) return "";
  const raw = (error as { message?: unknown }).message;
  return typeof raw === "string" ? raw : "";
}

export const getAuthErrorMessage = (error: unknown): string => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  if (!code) {
    return message || "An unexpected error occurred. Please try again.";
  }

  switch (code) {
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with the same email but different login method.";
    case "auth/operation-not-allowed":
      return "This sign-in method is currently disabled.";
    case "auth/unauthorized-domain":
      return IS_DEV
        ? "This exact website address is not allowed to sign in. In Firebase Console → Authentication → Settings → Authorized domains, add the hostname from your browser bar (each Vercel preview URL needs its own entry)."
        : "Sign-in is unavailable from this domain right now.";
    case "auth/popup-blocked":
      return "The browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in popup was already open. Close it and try again.";
    case "auth/invalid-api-key":
      return IS_DEV
        ? "Firebase rejected the API key. Verify VITE_FIREBASE_* variables and browser key referrer restrictions."
        : "Authentication service is temporarily unavailable.";
    case "auth/project-not-found":
      return IS_DEV
        ? "Firebase project not found. Check VITE_FIREBASE_PROJECT_ID and related env vars."
        : "Authentication service is temporarily unavailable.";
    default: {
      // Don’t hide Firebase’s message — production issues (domains, keys) were invisible before.
      if (IS_DEV && message.includes("Firebase:")) {
        return message.replace(/^Firebase:\s*/i, "").trim() || "Authentication failed. Please try again.";
      }
      return IS_DEV ? message || "An unexpected error occurred." : "Authentication failed. Please try again.";
    }
  }
};
