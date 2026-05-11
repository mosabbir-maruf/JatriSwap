import { toast } from "sonner";

/** Listing delete — toast countdown matches this deadline. */
export const TICKET_DELETE_UNDO_MS = 10_000;
/** Admin user hard-delete — toast countdown matches this deadline. */
export const USER_DELETE_UNDO_MS = 30_000;

const pendingIntervals = new Map<string, ReturnType<typeof setInterval>>();

function toastIdFor(operationKey: string): string {
  return `delete-undo-${operationKey}`;
}

function secondsRemaining(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

function cancelScheduledDelete(operationKey: string): boolean {
  const handle = pendingIntervals.get(operationKey);
  if (handle === undefined) return false;
  clearInterval(handle);
  pendingIntervals.delete(operationKey);
  toast.dismiss(toastIdFor(operationKey));
  return true;
}

export function cancelPendingTicketDelete(ticketId: string): boolean {
  return cancelScheduledDelete(`ticket:${ticketId}`);
}

export function cancelPendingUserDelete(userId: string): boolean {
  return cancelScheduledDelete(`user:${userId}`);
}

export interface ScheduledDeleteWithUndoOpts {
  commitDelete: () => Promise<void>;
  message?: string;
  onUndo?: () => void;
  onCommitted?: () => void;
  onCommitFailed?: (err: unknown) => void;
}

function scheduleDeleteWithUndo(
  operationKey: string,
  undoDelayMs: number,
  defaultMessage: string,
  opts: ScheduledDeleteWithUndoOpts,
): void {
  cancelScheduledDelete(operationKey);

  const id = toastIdFor(operationKey);
  const base = opts.message ?? defaultMessage;
  const deadlineMs = Date.now() + undoDelayMs;

  const action = {
    label: "Undo",
    onClick: () => {
      if (cancelScheduledDelete(operationKey)) {
        opts.onUndo?.();
        toast.success("Deletion cancelled.");
      }
    },
  };

  const render = (sec: number) => {
    toast(`${base} · ${sec}s remaining`, {
      id,
      duration: Infinity,
      action,
    });
  };

  render(secondsRemaining(deadlineMs));

  const iv = setInterval(() => {
    const sec = secondsRemaining(deadlineMs);
    if (sec <= 0) {
      clearInterval(iv);
      pendingIntervals.delete(operationKey);
      toast.dismiss(id);
      void opts
        .commitDelete()
        .then(() => opts.onCommitted?.())
        .catch((err: unknown) => opts.onCommitFailed?.(err));
      return;
    }
    render(sec);
  }, 1000);

  pendingIntervals.set(operationKey, iv);
}

export function scheduleTicketDeleteWithUndo(
  opts: ScheduledDeleteWithUndoOpts & { ticketId: string },
): void {
  scheduleDeleteWithUndo(`ticket:${opts.ticketId}`, TICKET_DELETE_UNDO_MS, "Listing will be deleted.", {
    commitDelete: opts.commitDelete,
    message: opts.message,
    onUndo: opts.onUndo,
    onCommitted: opts.onCommitted,
    onCommitFailed: opts.onCommitFailed,
  });
}

export function scheduleUserDeleteWithUndo(
  opts: ScheduledDeleteWithUndoOpts & { userId: string },
): void {
  scheduleDeleteWithUndo(`user:${opts.userId}`, USER_DELETE_UNDO_MS, "User will be permanently deleted.", {
    commitDelete: opts.commitDelete,
    message: opts.message,
    onUndo: opts.onUndo,
    onCommitted: opts.onCommitted,
    onCommitFailed: opts.onCommitFailed,
  });
}
