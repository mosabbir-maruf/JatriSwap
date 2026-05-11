import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type BrutalistLoadingPlaceholderProps = {
  message: string;
  srLabel: string;
  /** `route`: shell under fixed header. `viewport`: full viewport center (detail pages). */
  layout: "route" | "viewport";
  className?: string;
};

/** Full-page spinner + caption (single implementation for ticket detail, verify-email, etc.). */
export function BrutalistLoadingPlaceholder({
  message,
  srLabel,
  layout,
  className,
}: BrutalistLoadingPlaceholderProps) {
  const shell =
    layout === "route"
      ? "flex flex-1 min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 pt-32 text-muted-foreground"
      : "flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-muted-foreground";

  return (
    <div className={cn(shell, className)}>
      <Spinner size="md" />
      <p className="text-center font-mono text-[10px] font-bold uppercase tracking-widest">{message}</p>
      <span className="sr-only">{srLabel}</span>
    </div>
  );
}

/** Auth / Firestore profile resolving — same shell as Sell and other gated routes. */
export function AuthLoadingPlaceholder() {
  return (
    <BrutalistLoadingPlaceholder
      layout="route"
      message="Loading session…"
      srLabel="Loading account session"
    />
  );
}

export type BrutalistIdleLoaderProps = {
  spinnerSize?: "sm" | "md" | "lg";
  message?: ReactNode;
  className?: string;
};

/** Centered spinner + label: dialogs, suspense fallbacks, padded regions (one pattern). */
export function BrutalistIdleLoader({
  spinnerSize = "md",
  message = "Loading…",
  className,
}: BrutalistIdleLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
        className
      )}
    >
      <Spinner size={spinnerSize} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Inline row for buttons (admin load-more, etc.) — one pattern instead of ad-hoc spans. */
export function BrutalistInlineButtonLoading({
  spinnerSize = "sm",
}: {
  spinnerSize?: "sm" | "md" | "lg";
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size={spinnerSize} className="shrink-0" aria-hidden />
      Loading…
    </span>
  );
}
