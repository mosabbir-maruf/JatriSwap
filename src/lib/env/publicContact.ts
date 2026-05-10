type PublicContactEnvKey = "VITE_PUBLIC_WHATSAPP_NUMBER" | "VITE_PUBLIC_SUPPORT_PHONE";

function readOptionalViteString(key: PublicContactEnvKey): string | undefined {
  const raw = import.meta.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getPublicSupportPhone(): string | undefined {
  return readOptionalViteString("VITE_PUBLIC_SUPPORT_PHONE");
}

export type PublicWhatsAppLink = { label: string; href: string };

/** One read of `VITE_PUBLIC_WHATSAPP_NUMBER`: display label + `wa.me` href, or null if unset / no digits. */
export function getPublicWhatsAppLink(prefilledText?: string): PublicWhatsAppLink | null {
  const label = readOptionalViteString("VITE_PUBLIC_WHATSAPP_NUMBER");
  if (!label) return null;
  const digits = label.replace(/\D/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  const text = prefilledText?.trim();
  const href = text ? `${base}?text=${encodeURIComponent(text)}` : base;
  return { label, href };
}

/** Build `tel:` URL from a human-readable number (internal spaces stripped). */
export function supportPhoneTelHref(displayPhone: string): string {
  return `tel:${displayPhone.replace(/\s/g, "")}`;
}
