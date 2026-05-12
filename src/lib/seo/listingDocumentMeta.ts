import type { Ticket } from "@/src/types";
import { applyDocumentMeta } from "./applyDocumentMeta";
import { BRAND } from "./routeSeo";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max - 1).trimEnd();
  return `${slice}…`;
}

function buildListingTitle(ticket: Ticket): string {
  const modeLabel = ticket.mode === "bus" ? "Bus" : "Train";
  const core = `${ticket.transportName}: ${ticket.from} to ${ticket.to}`;
  const suffix = ` - ${BRAND}`;
  const max = 58;
  if (core.length + suffix.length <= max) return `${core}${suffix}`;
  return truncate(`${modeLabel} ticket ${ticket.from}–${ticket.to}`, max - suffix.length) + suffix;
}

function buildListingDescription(ticket: Ticket): string {
  const modeLabel = ticket.mode === "bus" ? "Bus" : "Train";
  const price = `৳${ticket.sellingPrice}`;
  const line = `${modeLabel} · ${ticket.from} to ${ticket.to} · ${ticket.date} · ${ticket.seatClass} · ${price} on ${BRAND}.`;
  return truncate(line, 158);
}

export function applyListingDocumentMeta(ticket: Ticket, canonicalUrl: string) {
  applyDocumentMeta({
    title: buildListingTitle(ticket),
    description: buildListingDescription(ticket),
    canonicalUrl,
  });
}
