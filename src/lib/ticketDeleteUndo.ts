import { toast } from "sonner";

/** Delay before Firestore delete commits; toast countdown stays aligned to this deadline. */
export const TICKET_DELETE_UNDO_MS = 10_000;

const pendingIntervals = new Map<string, ReturnType<typeof setInterval>>();

function undoToastId(ticketId: string): string {
  return `ticket-delete-undo-${ticketId}`;
}

export function cancelPendingTicketDelete(ticketId: string): boolean {
  const handle = pendingIntervals.get(ticketId);
  if (handle === undefined) return false;
  clearInterval(handle);
  pendingIntervals.delete(ticketId);
  toast.dismiss(undoToastId(ticketId));
  return true;
}

function secondsRemaining(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

/**
 * Deletes from Firestore after {@link TICKET_DELETE_UNDO_MS} unless the user clicks Undo on the toast.
 * Toast shows a live seconds-left countdown (same id updates Sonner in place).
 */
export function scheduleTicketDeleteWithUndo(opts: {
  ticketId: string;
  commitDelete: () => Promise<void>;
  /** Primary toast body while the countdown runs (seconds append automatically). */
  message?: string;
  onUndo?: () => void;
  onCommitted?: () => void;
  onCommitFailed?: (err: unknown) => void;
}): void {
  cancelPendingTicketDelete(opts.ticketId);

  const toastId = undoToastId(opts.ticketId);
  const base = opts.message ?? "Listing will be deleted.";
  const deadlineMs = Date.now() + TICKET_DELETE_UNDO_MS;

  const action = {
    label: "Undo",
    onClick: () => {
      if (cancelPendingTicketDelete(opts.ticketId)) {
        opts.onUndo?.();
        toast.success("Deletion cancelled.");
      }
    },
  };

  const render = (sec: number) => {
    toast(`${base} · ${sec}s remaining`, {
      id: toastId,
      duration: Infinity,
      action,
    });
  };

  render(secondsRemaining(deadlineMs));

  const iv = setInterval(() => {
    const sec = secondsRemaining(deadlineMs);
    if (sec <= 0) {
      clearInterval(iv);
      pendingIntervals.delete(opts.ticketId);
      toast.dismiss(toastId);
      void opts
        .commitDelete()
        .then(() => opts.onCommitted?.())
        .catch((err: unknown) => opts.onCommitFailed?.(err));
      return;
    }
    render(sec);
  }, 1000);

  pendingIntervals.set(opts.ticketId, iv);
}
