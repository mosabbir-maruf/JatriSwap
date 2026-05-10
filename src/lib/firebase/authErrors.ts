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
    default:
      // Try to parse out the message if it's a generic Firebase error
      const message = error.message;
      if (message && message.includes("Firebase:")) {
        // Strip out the "Firebase: Error (...)" part if possible, or just return a generic
        return "Authentication failed. Please try again.";
      }
      return message || "An unexpected error occurred.";
  }
};
