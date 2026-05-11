/** Root `className` for neo-brutalist single-date Calendar instances */
export const BRUTALIST_SINGLE_DAY_CALENDAR_ROOT_CLASSNAME =
  "font-mono bg-background text-foreground";

/**
 * Shared Calendar `classNames` for Browse / Home / Sell date pickers (single source of truth).
 */
export const BRUTALIST_SINGLE_DAY_CALENDAR_CLASSNAMES = {
  day_selected:
    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-none",
  day_today: "bg-muted text-muted-foreground rounded-none",
  day: "rounded-none w-9 h-9 p-0 font-mono text-sm uppercase font-bold aria-selected:opacity-100",
  nav_button_previous:
    "rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none hover:bg-muted font-bold h-7 w-7 bg-transparent p-0 opacity-100",
  nav_button_next:
    "rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none hover:bg-muted font-bold h-7 w-7 bg-transparent p-0 opacity-100",
} as const;
