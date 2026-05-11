import { toast } from "sonner";

/** Delay before hard-delete commits; toast countdown matches this deadline. */
export const USER_DELETE_UNDO_MS = 30_000;

const pendingIntervals = new Map<string, ReturnType<typeof setInterval>>();

function undoToastId(userId: string): string {
  return `user-delete-undo-${userId}`;
}

export function cancelPendingUserDelete(userId: string): boolean {
  const handle = pendingIntervals.get(userId);
  if (handle === undefined) return false;
  clearInterval(handle);
  pendingIntervals.delete(userId);
  toast.dismiss(undoToastId(userId));
  return true;
}

function secondsRemaining(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

/**
 * Deletes from Firestore after {@link USER_DELETE_UNDO_MS} unless the admin taps Undo on the toast.
 */
export function scheduleUserDeleteWithUndo(opts: {
  userId: string;
  commitDelete: () => Promise<void>;
  message?: string;
  onUndo?: () => void;
  onCommitted?: () => void;
  onCommitFailed?: (err: unknown) => void;
}): void {
  cancelPendingUserDelete(opts.userId);

  const toastId = undoToastId(opts.userId);
  const base = opts.message ?? "User will be permanently deleted.";
  const deadlineMs = Date.now() + USER_DELETE_UNDO_MS;

  const action = {
    label: "Undo",
    onClick: () => {
      if (cancelPendingUserDelete(opts.userId)) {
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
      pendingIntervals.delete(opts.userId);
      toast.dismiss(toastId);
      void opts
        .commitDelete()
        .then(() => opts.onCommitted?.())
        .catch((err: unknown) => opts.onCommitFailed?.(err));
      return;
    }
    render(sec);
  }, 1000);

  pendingIntervals.set(opts.userId, iv);
}
