import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * App icon mark — perforated transit ticket stub (symmetrical tear notches, dashed tear line).
 * Stroke-only so `currentColor` matches header/footer chips; reads clearly at favicon + navbar sizes.
 */
export function TransitSwapMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M 7 11 H 33 V 16 L 30 20 L 33 24 V 29 H 7 V 24 L 10 20 L 7 16 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <line
        x1="20"
        y1="12"
        x2="20"
        y2="28"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="3 3"
        strokeLinecap="square"
      />
      {/* Stylised barcode — left stub only */}
      <path
        d="M12 17v6M14 15v10M16 18v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

const wordmarkTitle = "TransitSwap";

function TransitSwapWordmark({
  variant,
  sizeClass,
  showDot = true,
}: {
  variant: "header" | "footer" | "auth";
  sizeClass: string;
  showDot?: boolean;
}) {
  const transitClass =
    variant === "footer"
      ? "text-background"
      : "text-foreground";
  const swapClass = "text-primary";

  return (
    <span className={cn("font-heading font-black tracking-tighter uppercase leading-none", sizeClass)}>
      <span className={transitClass}>Transit</span>
      <span className={swapClass}>Swap</span>
      {showDot ? <span className={transitClass}>.</span> : null}
    </span>
  );
}

export type TransitSwapLogoVariant = "header" | "footer" | "auth";

export function TransitSwapLogo({
  variant,
  className,
  showDot = true,
}: {
  variant: TransitSwapLogoVariant;
  className?: string;
  /** Navbar/footer use a trailing period; auth cards match cleaner lockup without dot if desired */
  showDot?: boolean;
}) {
  const markSizes =
    variant === "footer" ? "h-8 w-8 p-1.5" : variant === "auth" ? "h-10 w-10 p-2" : "h-9 w-9 p-1.5";

  const markShell =
    variant === "footer"
      ? "border-2 border-background bg-background text-foreground shadow-[4px_4px_0_0_rgba(255,255,255,0.22)]"
      : "border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_0_rgba(0,0,0,1)]";

  const textSize =
    variant === "footer" ? "text-3xl" : variant === "auth" ? "text-2xl" : "text-2xl";

  const gap = variant === "footer" ? "gap-2.5" : variant === "auth" ? "gap-2.5" : "gap-3";

  return (
    <span className={cn("inline-flex items-center", gap, className)} title={wordmarkTitle}>
      <span className={cn("flex shrink-0 items-center justify-center", markSizes, markShell)}>
        <TransitSwapMark className="h-full w-full" />
      </span>
      <TransitSwapWordmark variant={variant} sizeClass={textSize} showDot={showDot} />
    </span>
  );
}
