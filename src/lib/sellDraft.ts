import { format, isValid, parseISO } from 'date-fns';

/** Same key as Sell page — single source for listing-form drafts in localStorage. */
export const SELL_DRAFT_STORAGE_KEY = 'railswap_sell_draft';

/** Shape persisted by Sell `saveDraft` / hydrated on load. */
export type SellDraftSnapshot = {
  from?: string;
  to?: string;
  transportMode?: string;
  transportName?: string;
  trainName?: string;
  date?: string;
  depTime?: string;
  seatClass?: string;
  passengerCount?: string;
  seats?: string;
  additionalNotes?: string;
  originalPrice?: string;
  sellingPrice?: string;
  sellerName?: string;
  sellerPhone?: string;
};

export function readSellDraft(): SellDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(SELL_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SellDraftSnapshot;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** True when the user has entered something worth showing (not an empty saved JSON). */
export function sellDraftHasMeaningfulContent(d: SellDraftSnapshot): boolean {
  const fields = [
    d.from,
    d.to,
    d.transportName,
    d.trainName,
    d.date,
    d.depTime,
    d.seatClass,
    d.seats,
    d.originalPrice,
    d.sellingPrice,
    d.additionalNotes,
  ];
  return fields.some((v) => typeof v === 'string' && v.trim().length > 0);
}

/** Human-readable summary for dashboard / previews (no mock content). */
export function summarizeSellDraft(d: SellDraftSnapshot): { title: string; subtitle: string } {
  const from = d.from?.trim() ?? '';
  const to = d.to?.trim() ?? '';
  let title = 'Sell listing draft';
  if (from && to) title = `${from} → ${to}`;
  else if (from || to) title = `${from || '…'} → ${to || '…'}`;

  const bits: string[] = [];
  const tn = (d.transportName || d.trainName || '').trim();
  if (tn) bits.push(tn);
  if (d.transportMode === 'train') bits.push('Train');
  else if (d.transportMode === 'bus') bits.push('Bus');

  const rawDate = d.date?.trim();
  if (rawDate) {
    try {
      const iso = parseISO(rawDate);
      if (isValid(iso)) bits.push(format(iso, 'MMM d, yyyy'));
      else {
        const fallback = new Date(rawDate);
        bits.push(!Number.isNaN(fallback.getTime()) ? format(fallback, 'MMM d, yyyy') : rawDate);
      }
    } catch {
      bits.push(rawDate);
    }
  }
  if (d.depTime?.trim()) bits.push(`Dep ${d.depTime.trim()}`);

  const subtitle =
    bits.length > 0 ? bits.join(' • ') : 'Continue on the Sell page to add route and ticket details.';

  return { title, subtitle };
}
