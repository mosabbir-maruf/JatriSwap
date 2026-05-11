import * as React from "react";

import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: {
    bar: "w-[3px]",
    heights: ["h-2", "h-[14px]", "h-2"] as const,
    gap: "gap-[3px]",
  },
  md: {
    bar: "w-1",
    heights: ["h-2.5", "h-4", "h-2.5"] as const,
    gap: "gap-[3px]",
  },
  lg: {
    bar: "w-1.5",
    heights: ["h-4", "h-8", "h-4"] as const,
    gap: "gap-1",
  },
} as const;

export type SpinnerProps = React.ComponentProps<"span"> & {
  size?: keyof typeof SIZE_MAP;
  /** Softer bars for muted layouts (e.g. dashboard placeholders). */
  variant?: "default" | "muted";
};

/**
 * Neo-brutalist loading indicator (three pulse bars + hard shadow) — matches navbar session UX.
 */
export function Spinner({
  className,
  size = "md",
  variant = "default",
  "aria-hidden": ariaHidden = true,
  ...props
}: SpinnerProps) {
  const cfg = SIZE_MAP[size];
  const tone =
    variant === "muted"
      ? "border-muted-foreground bg-muted-foreground"
      : "border-foreground bg-foreground";

  return (
    <span
      className={cn("inline-flex items-end justify-center", cfg.gap, className)}
      aria-hidden={ariaHidden}
      {...props}
    >
      {cfg.heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            cfg.bar,
            h,
            "shrink-0 border shadow-[1px_1px_0_0_rgba(0,0,0,1)] animate-pulse",
            tone
          )}
          style={i === 0 ? undefined : { animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}
