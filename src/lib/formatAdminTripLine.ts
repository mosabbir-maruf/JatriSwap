import { format, parseISO, isValid } from "date-fns";
import { formatDepartureTimeDisplay } from "@/src/lib/formatDepartureTime";

/** Compact trip date · time for admin tables (avoids raw ISO blobs in cells). */
export function formatTripLineForAdmin(dateRaw: string, departureRaw: string): string {
  const dateTrim = (dateRaw ?? "").trim();
  const timeTrim = (departureRaw ?? "").trim();

  let dateLabel = "";
  if (dateTrim) {
    const ymd = dateTrim.includes("T") ? dateTrim.slice(0, 10) : dateTrim;
    const parsed = parseISO(ymd.length >= 10 ? ymd : dateTrim);
    dateLabel = isValid(parsed) ? format(parsed, "MMM d, yyyy") : dateTrim;
  }

  let timeLabel = "";
  if (timeTrim) {
    const fd = formatDepartureTimeDisplay(timeTrim);
    timeLabel = fd !== "—" ? fd : timeTrim;
  }

  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`;
  return dateLabel || timeLabel || "—";
}
