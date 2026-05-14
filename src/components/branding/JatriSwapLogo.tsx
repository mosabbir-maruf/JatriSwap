import { cn } from "@/lib/utils";
import {
  JATRI_SWAP_TICK_MARK_BARCODE,
  JATRI_SWAP_TICK_MARK_OUTLINE,
  JATRI_SWAP_TICK_MARK_TEAR,
  JATRI_SWAP_TICK_MARK_TEAR_DASH,
  JATRI_SWAP_TICK_MARK_VIEWBOX,
} from "@/src/lib/branding/jatriSwapTicketMarkGeometry";

/**
 * App icon mark — perforated transit ticket stub (symmetrical tear notches, dashed tear line).
 * Stroke-only so `currentColor` matches the icon rail; pair with `text-primary-foreground` on blue.
 */
export function JatriSwapMark({ className }: { className?: string }) {
  const t = JATRI_SWAP_TICK_MARK_TEAR;
  return (
    <svg
      viewBox={JATRI_SWAP_TICK_MARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d={JATRI_SWAP_TICK_MARK_OUTLINE}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <line
        x1={t.x1}
        y1={t.y1}
        x2={t.x2}
        y2={t.y2}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={JATRI_SWAP_TICK_MARK_TEAR_DASH}
        strokeLinecap="square"
      />
      <path
        d={JATRI_SWAP_TICK_MARK_BARCODE}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

const wordmarkTitle = "JatriSwap";

const LOGO_BRUTAL_SHADOW_BLACK = "shadow-[4px_4px_0_0_rgba(0,0,0,1)]" as const;
const LOGO_BRUTAL_SHADOW_FOOTER = "shadow-[4px_4px_0_0_rgba(255,255,255,0.22)]" as const;

/** Shared row layout for the word panel (padding differs by variant). */
const LOGO_WORD_PANEL_ROW = "flex flex-nowrap flex-row items-stretch gap-0" as const;

/** Shared typography for header, footer, and auth wordmark lines. */
const LOGO_WORD_TEXT = {
  jatri: "text-xl leading-none sm:text-2xl",
} as const;

/**
 * Navbar + footer: same rail and type scale; footer only changes drop shadow.
 * Mark rotation class must stay in sync with `JATRI_SWAP_TICK_MARK_ROTATE_DEG` in `jatriSwapTicketMarkGeometry.ts` (Tailwind cannot read that constant at compile time).
 */
const LOGO_HEADER_FOOTER_SIZING = {
  rail: "w-12 shrink-0 sm:w-14",
  mark: "h-8 w-8 sm:h-10 sm:w-10 -rotate-[38deg]",
  wordPanel: `${LOGO_WORD_PANEL_ROW} px-2 py-1.5 sm:px-2.5 sm:py-1.5`,
  ...LOGO_WORD_TEXT,
  swap: "px-0.5 text-lg leading-none sm:px-1 sm:text-xl",
} as const;

const variantLayout = {
  header: {
    ...LOGO_HEADER_FOOTER_SIZING,
    shadow: LOGO_BRUTAL_SHADOW_BLACK,
  },
  footer: {
    ...LOGO_HEADER_FOOTER_SIZING,
    shadow: LOGO_BRUTAL_SHADOW_FOOTER,
  },
  auth: {
    ...LOGO_HEADER_FOOTER_SIZING,
    rail: "w-[3.35rem] shrink-0 sm:w-14",
    mark: "h-9 w-9 sm:h-10 sm:w-10 -rotate-[38deg]",
    wordPanel: `${LOGO_WORD_PANEL_ROW} px-2.5 py-2 sm:px-3 sm:py-2`,
    swap: "px-1 text-lg leading-none sm:px-1.5 sm:text-xl",
    shadow: LOGO_BRUTAL_SHADOW_BLACK,
  },
} as const;

export type JatriSwapLogoVariant = "header" | "footer" | "auth";

export function JatriSwapLogo({
  variant,
  className,
  showDot = true,
}: {
  variant: JatriSwapLogoVariant;
  className?: string;
  /** When true, renders a period immediately after the wordmark: “JatriSwap.” */
  showDot?: boolean;
}) {
  const L = variantLayout[variant];

  return (
    <span
      className={cn(
        "group/logo inline-flex select-none items-stretch rounded-none border-2 border-foreground",
        L.shadow,
        className,
      )}
      title={wordmarkTitle}
    >
      <span
        className={cn(
          "flex items-center justify-center self-stretch border-r-2 border-foreground bg-primary text-primary-foreground",
          L.rail,
        )}
        aria-hidden
      >
        <JatriSwapMark className={L.mark} />
      </span>
      <span
        className={cn(
          "flex shrink-0 self-stretch items-stretch bg-background font-heading font-black uppercase leading-none tracking-tighter text-foreground",
          L.wordPanel,
        )}
      >
        <span className="flex flex-nowrap items-stretch gap-0.5 flex-row group-hover/logo:flex-row-reverse">
          <span className={cn("flex shrink-0 items-center whitespace-nowrap", L.jatri)}>Jatri</span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center self-stretch bg-foreground text-background",
              L.swap,
            )}
          >
            Swap
          </span>
        </span>
        {showDot ? (
          <span className={cn("flex shrink-0 items-center whitespace-nowrap text-foreground", L.jatri)} aria-hidden>
            .
          </span>
        ) : null}
      </span>
    </span>
  );
}
