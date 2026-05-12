import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";

export interface AvatarChoiceTriggerProps {
  previewSrc?: string;
  initials: string;
  onOpen: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "hero";
  /** Kept for call-site compatibility; layout is always centered. */
  orientation?: "horizontal" | "vertical";
  className?: string;
  pending?: boolean;
  footnote?: string;
}

const avatarSizeClass: Record<NonNullable<AvatarChoiceTriggerProps["size"]>, string> = {
  sm: "size-12",
  md: "size-14",
  lg: "size-16",
  hero: "size-24",
};

/** Centered tappable preview; camera chip in the middle (not a corner). Spinner overlays center while saving. */
export const AvatarChoiceTrigger = React.memo(function AvatarChoiceTrigger({
  previewSrc,
  initials,
  onOpen,
  disabled,
  size = "md",
  className,
  footnote,
  pending,
}: AvatarChoiceTriggerProps) {
  const aSize = avatarSizeClass[size];
  const blocked = disabled || pending;
  const open = React.useCallback(() => {
    if (!blocked) onOpen();
  }, [blocked, onOpen]);

  return (
    <div className={cn("flex w-full flex-col items-center gap-2 text-center", className)}>
      <button
        type="button"
        disabled={blocked}
        onClick={open}
        className={cn(
          "group relative shrink-0 overflow-hidden rounded-full bg-muted outline-none ring-1 ring-border transition-[opacity,ring-color]",
          "hover:ring-foreground/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          blocked && "pointer-events-none opacity-50",
        )}
        aria-label="Change photo — opens gallery"
      >
        <Avatar className={cn(aSize, "rounded-full border-0 shadow-none")}>
          <AvatarImage src={previewSrc} className="object-cover" />
          <AvatarFallback className="rounded-full text-sm font-medium">{initials}</AvatarFallback>
        </Avatar>

        {pending ? (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-background/75"
            aria-live="polite"
            aria-busy="true"
          >
            <Spinner size="sm" />
          </span>
        ) : (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-t from-black/45 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          >
            <span className="flex size-9 items-center justify-center rounded-full border border-background/80 bg-background/95 text-foreground shadow-md ring-1 ring-border">
              <Camera className="size-4" strokeWidth={2} />
            </span>
          </span>
        )}
      </button>

      {footnote ? (
        <p className="max-w-full overflow-x-auto whitespace-nowrap text-center text-[10px] leading-tight text-muted-foreground sm:text-[11px] sm:leading-snug [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {footnote}
        </p>
      ) : null}
    </div>
  );
});
