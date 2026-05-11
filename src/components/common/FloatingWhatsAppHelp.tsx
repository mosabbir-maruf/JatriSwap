import { memo, useMemo } from "react";
import { getPublicWhatsAppLink } from "@/src/lib/env/publicContact";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M20.52 3.48A11.91 11.91 0 0 0 12.03 0C5.41 0 .03 5.38.03 12c0 2.12.56 4.2 1.63 6.02L0 24l6.15-1.61A11.95 11.95 0 0 0 12.03 24C18.64 24 24 18.62 24 12c0-3.2-1.25-6.2-3.48-8.52ZM12.03 22.1c-1.83 0-3.63-.49-5.22-1.41l-.37-.22-3.65.96.98-3.56-.24-.37A10.09 10.09 0 0 1 1.93 12c0-5.56 4.53-10.07 10.1-10.07 2.7 0 5.24 1.05 7.15 2.96A10.04 10.04 0 0 1 22.1 12c0 5.57-4.52 10.1-10.07 10.1Zm5.53-7.56c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.48-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.27.3-1.06 1.03-1.06 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.12-.27-.2-.58-.35Z"
      />
    </svg>
  );
}

export const FloatingWhatsAppHelp = memo(function FloatingWhatsAppHelp() {
  const wa = useMemo(
    () => getPublicWhatsAppLink("Need help?"),
    []
  );

  if (!wa) return null;

  return (
    <div className="fixed z-50 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-3 sm:bottom-5 sm:right-5 max-w-[calc(100vw-1.5rem)]">
      <a
        href={wa.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 rounded-none border-2 border-foreground bg-background p-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-2 sm:p-2"
        aria-label="Need help? Chat on WhatsApp"
        title="Need help?"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-none border-2 border-foreground bg-emerald-500 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] sm:h-9 sm:w-9">
          <WhatsAppGlyph className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </span>
        <span className="whitespace-nowrap font-mono text-[8px] uppercase tracking-widest font-black text-foreground sm:text-[9px]">
          Need help?
        </span>
      </a>
    </div>
  );
});

