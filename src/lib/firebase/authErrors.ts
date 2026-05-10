export const getAuthErrorMessage = (error: any): string => {
  if (!error || !error.code) {
    return error?.message || "An unexpected error occurred. Please try again.";
  }

  switch (error.code) {
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
      return (
        "This exact website address is not allowed to sign in. In Firebase Console → Authentication → Settings → Authorized domains, add the hostname from your browser bar (each Vercel preview URL, e.g. project-git-branch-*.vercel.app, needs its own entry — Firebase does not use *.wildcards)."
      );
    case "auth/popup-blocked":
      return "The browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in popup was already open. Close it and try again.";
    case "auth/invalid-api-key":
      return (
        "Firebase rejected the API key. On Vercel, confirm all VITE_FIREBASE_* variables match the Firebase project. In Google Cloud Console → Credentials, ensure the browser API key’s HTTP referrer restrictions include your production URL (e.g. https://transitswap.vercel.app/*)."
      );
    case "auth/project-not-found":
      return "Firebase project not found. Check VITE_FIREBASE_PROJECT_ID and related env vars on Vercel.";
    default: {
      const message = typeof error.message === "string" ? error.message : "";
      // Don’t hide Firebase’s message — production issues (domains, keys) were invisible before.
      if (message.includes("Firebase:")) {
        return message.replace(/^Firebase:\s*/i, "").trim() || "Authentication failed. Please try again.";
      }
      return message || "An unexpected error occurred.";
    }
  }
};
