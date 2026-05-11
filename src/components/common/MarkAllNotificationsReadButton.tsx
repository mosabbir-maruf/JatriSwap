import { useState, type ComponentProps } from "react";
import { CheckCheck } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadForUser } from "@/src/lib/firebase/notifications";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  unreadCount: number;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  /** Shorter label for tight layouts (e.g. dashboard sidebar). */
  compact?: boolean;
};

export function MarkAllNotificationsReadButton({
  userId,
  unreadCount,
  className,
  variant = "outline",
  compact = false,
}: Props) {
  const [busy, setBusy] = useState(false);

  if (unreadCount <= 0) return null;

  const label = compact ? "Read all" : "Mark all as read";

  return (
    <Button
      type="button"
      variant={variant}
      disabled={busy}
      className={cn(
        "rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] gap-2 shrink-0",
        className,
      )}
      onClick={async () => {
        setBusy(true);
        try {
          const n = await markAllNotificationsReadForUser(userId);
          if (n === 0) {
            toast.message("Everything is already read.");
          } else if (n === 1) {
            toast.success("1 alert marked as read.");
          } else {
            toast.success(`${n} alerts marked as read.`);
          }
        } catch {
          toast.error("Could not mark alerts as read.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Spinner size="sm" aria-hidden />
      ) : (
        <CheckCheck className="w-4 h-4" aria-hidden />
      )}
      {label}
    </Button>
  );
}
