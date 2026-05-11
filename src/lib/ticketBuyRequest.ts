import { format } from "date-fns";
import { formatDepartureTimeDisplay } from "@/src/lib/formatDepartureTime";
import type { Ticket } from "@/src/types";
import { getPublicWhatsAppLink } from "@/src/lib/env/publicContact";

/** WhatsApp chat formatting: wrap label in asterisks for bold (shows bold on WhatsApp). */
function boldField(label: string, value: string | number): string {
  return `*${label}:* ${value}`;
}

function buildPurchasePrefillText(ticket: Ticket, listingUrl: string): string {
  const notes = (ticket.additionalNotes ?? "").trim();
  const fee = 20;
  const total = Number(ticket.sellingPrice) + fee;
  const lines: string[] = [
    "Hi,",
    "I would like to buy this ticket. Here are the listing details:",
    "",
    "*LISTING*",
    boldField("Ticket id", ticket.id),
    boldField("Listing URL", listingUrl),
    "",
    "*TRIP*",
    boldField("Service", ticket.transportName),
    boldField("Route", `${ticket.from} -> ${ticket.to}`),
    boldField("Travel date", format(new Date(ticket.date), "EEEE, dd MMM yyyy")),
    boldField("Departure time", formatDepartureTimeDisplay(ticket.departureTime)),
    boldField("Class", ticket.seatClass),
    boldField("Passengers", ticket.passengerCount),
    "",
    "*PRICING*",
    boldField("Listed price", `৳${Number(ticket.sellingPrice).toFixed(2)}`),
    boldField("Platform fee", `৳${fee.toFixed(2)}`),
    boldField("Total", `৳${total.toFixed(2)}`),
  ];

  if (notes) {
    lines.push("", "*NOTES FROM SELLER*", notes);
  }

  lines.push("", "Thank you.");

  return lines.join("\n");
}

/** Opens platform WhatsApp with prefilled purchase message. Returns false if env number missing. */
export function openTicketPurchaseWhatsApp(ticket: Ticket): boolean {
  const listingUrl = `${window.location.origin}/ticket/${ticket.id}`;
  const wa = getPublicWhatsAppLink(buildPurchasePrefillText(ticket, listingUrl));
  if (!wa) return false;
  window.open(wa.href, "_blank", "noopener,noreferrer");
  return true;
}
