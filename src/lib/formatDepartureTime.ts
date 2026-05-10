import { format, parseISO, isValid } from "date-fns";

/** Stored ticket times use 24h `HH:mm` from Sell / TimePicker; UI shows 12h with AM/PM. */
const CLOCK_24 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Shared by `BrutalistTimePicker` (single definition of 12h ↔ 24h hour conversion). */
export function departureHour24To12(h24: number): { h12: number; period: "AM" | "PM" } {
  const isPm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h12, period: isPm ? "PM" : "AM" };
}

export function departureHour12To24(h12: number, period: "AM" | "PM"): number {
  if (period === "PM") return h12 === 12 ? 12 : h12 + 12;
  return h12 === 12 ? 0 : h12;
}

/** Browse search: match raw stored time or formatted AM/PM label (single place for both checks). */
export function departureTimeMatchesSearch(departureTime: string | undefined, queryLower: string): boolean {
  const q = queryLower.trim();
  if (!q) return false;
  const raw = (departureTime ?? "").trim();
  if (raw && raw.toLowerCase().includes(q)) return true;
  const disp = formatDepartureTimeDisplay(raw);
  return disp !== "—" && disp.toLowerCase().includes(q);
}

export function formatDepartureTimeDisplay(departureTime: string | undefined | null): string {
  const s = (departureTime ?? "").trim();
  if (!s) return "—";

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const tp = parseISO(s);
    return isValid(tp) ? format(tp, "h:mm a") : s;
  }

  const m = CLOCK_24.exec(s);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return s;
    const d = new Date(2000, 0, 1, h, min, 0);
    return format(d, "h:mm a");
  }

  const isoGuess = Date.parse(`2000-01-01T${s}`);
  if (!Number.isNaN(isoGuess)) {
    return format(new Date(isoGuess), "h:mm a");
  }

  return s;
}
