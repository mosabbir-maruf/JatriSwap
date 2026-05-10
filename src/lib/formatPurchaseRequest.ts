import { format, isValid, parseISO } from "date-fns";
import type { BuyerPurchaseRequest, Ticket } from "@/src/types";
import { formatDepartureTimeDisplay } from "@/src/lib/formatDepartureTime";

/** Single line for seller dashboard headers (“3 leads · 5 WhatsApp taps”). */
export function formatPurchaseLeadTapSummaryLine(leadCount: number, tapTotal: number): string {
  return `${leadCount} lead${leadCount === 1 ? "" : "s"} · ${tapTotal} WhatsApp tap${tapTotal === 1 ? "" : "s"}`;
}

/**
 * Trip date + departure (12h) for purchase-request listing snapshots.
 * Optional mode prefix: `Bus · …` / `Train · …`.
 */
export function formatPurchaseRequestTripScheduleLine(
  tripDateRaw: string | undefined,
  departureRaw: string | undefined,
  mode?: "train" | "bus",
): string | null {
  const dateTrim = (tripDateRaw ?? "").trim();
  const timeTrim = (departureRaw ?? "").trim();
  if (!dateTrim && !timeTrim) return null;

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

  let core = "";
  if (dateLabel && timeLabel) core = `${dateLabel} · ${timeLabel}`;
  else core = dateLabel || timeLabel;
  if (!core) return null;

  const modeLabel = mode === "bus" ? "Bus" : mode === "train" ? "Train" : "";
  return modeLabel ? `${modeLabel} · ${core}` : core;
}

/** True when the purchase-request doc lacks listing phone and/or a renderable schedule (legacy rows). */
export function purchaseRequestNeedsListingFallback(req: BuyerPurchaseRequest): boolean {
  if (!(req.sellerListingPhone ?? "").trim()) return true;
  return (
    formatPurchaseRequestTripScheduleLine(
      req.listingTripDate,
      req.listingDepartureTime,
      req.listingTransportMode,
    ) == null
  );
}

/** Single merge path for snapshot fields + optional live ticket (card UI only). */
export function mergePurchaseRequestListingSnapshot(
  req: BuyerPurchaseRequest,
  ticket: Ticket | null,
): { listingPhoneTrim: string; tripScheduleLine: string | null } {
  const listingPhoneTrim =
    (req.sellerListingPhone ?? "").trim() || (ticket?.sellerPhone ?? "").trim();
  const tripDateMerged = (req.listingTripDate ?? "").trim() || (ticket?.date ?? "").trim();
  const departureMerged =
    (req.listingDepartureTime ?? "").trim() || (ticket?.departureTime ?? "").trim();
  const modeMerged = req.listingTransportMode ?? ticket?.mode;
  return {
    listingPhoneTrim,
    tripScheduleLine: formatPurchaseRequestTripScheduleLine(
      tripDateMerged || undefined,
      departureMerged || undefined,
      modeMerged,
    ),
  };
}
