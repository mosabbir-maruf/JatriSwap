import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RECENT_STORAGE_PREFIX = "transitswap.stationRecent.";
const RECENT_MAX = 5;
const MAX_SUGGESTIONS = 10;
/** Minimum query length before the full options list is filtered against. */
const SUGGEST_AFTER_CHARS = 3;

export type StationAutocompleteSize = "sm" | "md" | "lg";

interface StationAutocompleteProps {
  value: string;
  onValueChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
  /** Match existing Select trigger heights across the app. */
  size?: StationAutocompleteSize;
  /** Override the input border weight (matches the Home hero card's `border-4`). */
  borderClassName?: string;
  /** Outer wrapper class — passed straight through. */
  className?: string;
  /** Override input text class (font-size / padding / etc.). */
  inputClassName?: string;
  required?: boolean;
  id?: string;
  ariaLabel?: string;
  /**
   * `localStorage` namespace for recent picks (e.g. "from", "to"). Keeps origin/destination
   * recents separate. Different StationAutocomplete instances with the same scope share recents.
   */
  recentScope?: string;
}

const SIZE_HEIGHT: Record<StationAutocompleteSize, string> = {
  sm: "h-10",
  md: "h-14",
  lg: "h-16",
};

// ---------- Recent searches (localStorage) ----------

function recentKey(scope: string): string {
  return `${RECENT_STORAGE_PREFIX}${scope}`;
}

function loadRecentStations(scope: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(recentKey(scope));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const v of parsed) {
      if (typeof v !== "string") continue;
      const t = v.trim();
      if (t.length === 0) continue;
      const lc = t.toLowerCase();
      if (seen.has(lc)) continue;
      seen.add(lc);
      list.push(t);
      if (list.length >= RECENT_MAX) break;
    }
    return list;
  } catch {
    return [];
  }
}

function saveRecentStation(scope: string, station: string): string[] {
  const trimmed = station.trim();
  const current = loadRecentStations(scope);
  if (typeof window === "undefined" || trimmed.length === 0) return current;
  const lc = trimmed.toLowerCase();
  const next = [trimmed, ...current.filter((s) => s.toLowerCase() !== lc)].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(recentKey(scope), JSON.stringify(next));
    return next;
  } catch {
    return current;
  }
}

// ---------- Suggestion ranking ----------

function rankSuggestions(
  query: string,
  options: readonly string[],
  recents: readonly string[],
): { items: string[]; isRecentsOnly: boolean } {
  const q = query.trim().toLowerCase();

  if (q.length === 0) {
    return { items: recents.slice(0, MAX_SUGGESTIONS), isRecentsOnly: true };
  }

  if (q.length < SUGGEST_AFTER_CHARS) {
    const matched = recents.filter((s) => s.toLowerCase().includes(q));
    return { items: matched.slice(0, MAX_SUGGESTIONS), isRecentsOnly: true };
  }

  const recentLcSet = new Set(recents.map((r) => r.toLowerCase()));
  const recentMatches: string[] = [];
  const startsMatches: string[] = [];
  const containsMatches: string[] = [];

  for (const opt of options) {
    if (recentMatches.length + startsMatches.length + containsMatches.length >= MAX_SUGGESTIONS * 2)
      break;
    const lc = opt.toLowerCase();
    const isStart = lc.startsWith(q);
    const isContain = !isStart && lc.includes(q);
    if (!isStart && !isContain) continue;
    if (recentLcSet.has(lc)) recentMatches.push(opt);
    else if (isStart) startsMatches.push(opt);
    else containsMatches.push(opt);
  }

  const items = [...recentMatches, ...startsMatches, ...containsMatches].slice(0, MAX_SUGGESTIONS);
  return { items, isRecentsOnly: false };
}

// ---------- Component ----------

export function StationAutocomplete({
  value,
  onValueChange,
  options,
  placeholder,
  size = "md",
  borderClassName = "border-2",
  className,
  inputClassName,
  required,
  id,
  ariaLabel,
  recentScope = "default",
}: StationAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const [recents, setRecents] = React.useState<string[]>(() => loadRecentStations(recentScope));
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  /** Last station persisted to recents (lowercased) — skip redundant writes on commit/blur duplicate. */
  const lastSavedLcRef = React.useRef<string>("");
  const isFirstMount = React.useRef(true);
  const listboxId = `${id ?? "station"}-listbox`;

  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    lastSavedLcRef.current = "";
    setRecents(loadRecentStations(recentScope));
  }, [recentScope]);

  const persistRecent = React.useCallback(
    (station: string) => {
      const lc = station.trim().toLowerCase();
      if (lc.length === 0 || lc === lastSavedLcRef.current) return;
      lastSavedLcRef.current = lc;
      setRecents(saveRecentStation(recentScope, station));
    },
    [recentScope],
  );

  const { items: suggestions, isRecentsOnly } = React.useMemo(
    () => rankSuggestions(value, options, recents),
    [value, options, recents],
  );

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  React.useEffect(() => {
    if (!open || suggestions.length === 0) return;
    if (highlight >= suggestions.length) setHighlight(0);
  }, [open, suggestions.length, highlight]);

  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const commit = React.useCallback(
    (next: string) => {
      onValueChange(next);
      setOpen(false);
      persistRecent(next);
    },
    [onValueChange, persistRecent],
  );

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Allow item click (mousedown) to commit first; bail if focus moved inside the suggestion list.
    if (containerRef.current?.contains(event.relatedTarget as Node)) return;
    const normalized = value.trim();
    if (normalized.length === 0) return;
    const canonical = options.find((o) => o.toLowerCase() === normalized.toLowerCase());
    if (canonical) persistRecent(canonical);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (suggestions.length === 0) return;
      setHighlight((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (suggestions.length === 0) return;
      setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (open && suggestions[highlight]) {
        e.preventDefault();
        commit(suggestions[highlight]);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && suggestions[highlight] ? `${id ?? "station"}-opt-${highlight}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        required={required}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={(e) => {
          onValueChange(e.target.value);
          setHighlight(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          SIZE_HEIGHT[size],
          "rounded-none border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus-visible:ring-0 focus-visible:border-foreground hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all font-mono uppercase tracking-widest font-bold",
          borderClassName,
          inputClassName,
        )}
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] max-h-72 overflow-y-auto"
        >
          {isRecentsOnly && (
            <li
              aria-hidden
              className="px-3 pt-2 pb-1 font-mono text-[9px] uppercase tracking-widest font-bold text-muted-foreground border-b-2 border-foreground/40"
            >
              Recent
            </li>
          )}
          {suggestions.map((opt, i) => {
            const isActive = i === highlight;
            return (
              <li
                key={opt}
                id={`${id ?? "station"}-opt-${i}`}
                role="option"
                aria-selected={isActive}
                data-index={i}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  // mousedown fires before the input blur — prevents focus loss before commit.
                  e.preventDefault();
                  commit(opt);
                }}
                className={cn(
                  "px-3 py-2 font-mono text-xs uppercase tracking-widest font-bold cursor-pointer",
                  isActive ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
