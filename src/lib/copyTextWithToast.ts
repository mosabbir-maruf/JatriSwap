import { toast } from "sonner";

/** Share stable toast copy for ticket ID vs listing URL flows */
export const COPY_TO_CLIPBOARD_FEEDBACK = {
  ticketId: { success: "Ticket ID copied", error: "Could not copy ticket ID" },
  shareLink: { success: "Link copied to clipboard!", error: "Could not copy link" },
  userId: { success: "User ID copied", error: "Could not copy user ID" },
  reportId: { success: "Report ID copied", error: "Could not copy report ID" },
} as const;

/**
 * Single Clipboard API path + toast handling for the app (no duplicated try/catch chains).
 */
export async function copyTextWithToast(
  text: string,
  feedback: { success: string; error: string },
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(feedback.success);
    return true;
  } catch {
    toast.error(feedback.error);
    return false;
  }
}
