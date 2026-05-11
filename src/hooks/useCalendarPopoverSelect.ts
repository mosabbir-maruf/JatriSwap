import { startTransition, useCallback, useRef, useState } from "react";

/**
 * Controlled date popover: closes when Calendar commits a day (shared by Home / Browse / Sell).
 * Ref-stores `onCommit` so `onCalendarSelect` stays stable and avoids redundant effect deps.
 * Closes first, then applies the date in a transition so heavy parents (e.g. Browse filters)
 * don’t block the popover from disappearing.
 */
export function useCalendarPopoverSelect(onCommit: (date: Date | undefined) => void) {
  const [open, setOpen] = useState(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const onCalendarSelect = useCallback((date: Date | undefined) => {
    setOpen(false);
    startTransition(() => {
      onCommitRef.current(date);
    });
  }, []);

  return { calendarPopoverOpen: open, setCalendarPopoverOpen: setOpen, onCalendarSelect };
}
